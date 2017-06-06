const { green, logCompletedOperation } = require("../../lib/util");

module.exports = {
    command: "deploy",
    desc: "Create and deploy a Node.js app running on Azure",
    builder(yargs) {
        return yargs.usage("azjs deploy [options]")
                    .describe("git", "Enable Git-based deployment from a local repo").alias("g", "git")
                    .describe("git-url", "Enable Git-based deployment from a remote repo (e.g. GitHub").alias("u", "git-url")
                    .describe("no-sync", "Specifies whether you'd like to automatically sync the web app with a Git repo after creation. False by default")
                    .describe("linux", "Specifies whether you'd like to create a Linux-backed web app").alias("l", "linux")
                    .example("azjs deploy", "Create your Azure web app (if needed), and then deploy the contents of the CWD")
                    .example("azjs deploy --git", "Create your Azure web app (if needed), and enable a Git repo to deploy changes to")
                    .example("azjs deploy --git-url scotch-io/node-todo", "Create your Azure web app (if needed), and connect it to a remote Git repo");
    },
    handler: createAzureHandler((client, { git, gitUrl, noSync, linux }) => {
        const gitHelper = require("../../lib/util/gitHelper");
        const GIT_REMOTE_NAME = "azure";

        let appUrl;
        return client.createResourceGroup().then(() => {
            return client.createWebApp(git, gitHelper.sanitizeRemoteUrl(gitUrl), linux);
        }).then((url) => {
            appUrl = url;
            
            if (git) {
                return client.getGitRemote().then((remoteUrl) => {
                    gitHelper.addRemote(GIT_REMOTE_NAME, remoteUrl);

                    if (!noSync) {
                        return gitHelper.pushRemote(GIT_REMOTE_NAME);
                    }
                });
            } else if (gitUrl) {
                if (!noSync) {
                    return client.syncRemoteRepo();
                }
            }
            else {
                const buildScript = client.getPackageScript("build");
                return client.deploy(linux)
                    .then(() => client.installDependencies(!buildScript))
                    .then(() => client.installAppInsights())
                    .then(() => buildScript ? client.buildApp(buildScript) : null);
            }
        }).then(() => {
            return new Promise((resolve) => {
                require("copy-paste").copy(appUrl, resolve);
            });
        }).then(() => {
            logCompletedOperation(green`App deployed to ${appUrl} (URL is copied to your clipboard!)`);
            client.openLogStream();
        });
    }, false)
};