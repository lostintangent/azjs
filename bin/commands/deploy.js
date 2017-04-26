const { green, log } = require("../../lib/util");

module.exports = {
    command: "deploy",
    desc: "Create and deploy a Node.js app running on Azure",
    builder(yargs) {
        return yargs
            .describe("git", "Enable Git-based deployment from a local repo").alias("g", "git")
            .describe("git-url", "Enable Git-based deployment from a remote repo (e.g. GitHub").alias("u", "git-url")
            .describe("no-sync", "Specifies whether you'd like to automatically sync the web app with a Git repo after creation. False by default")
            .describe("linux", "Specifies whether you'd like to create a Linux-backed web app").alias("l", "linux")
            .example("azjs up", "Create your Azure web app (if needed), and then deploy the contents of the CWD")
            .example("azjs up --git", "Create your Azure web app (if needed), and enable a Git repo to deploy changes to")
            .example("azjs up --git-url scotch-io/node-todo", "Create your Azure web app (if needed), and connect it to a remote Git repo");
    },
    handler: createAzureHandler(async (client, { git, gitUrl, noSync, linux }) => {
        await client.createResourceGroup();

        if (gitUrl) {
            if (gitUrl.split("/").length === 2) {
                gitUrl = `https://github.com/${gitUrl}`;
            }

            if (!gitUrl.endsWith(".git")) {
                gitUrl += ".git";
            }
        }

        const appUrl = await client.createWebApp(git, gitUrl, linux);

        if (git) {
            await client.addGitRemote();

            if (!noSync) {
                await client.syncLocalRepo();
            }
        } else if (gitUrl) {

            if (!noSync) {
                await client.syncRemoteRepo();
            }
        }
        else {
            await client.deploy(linux);
            await client.installDependencies();
            await client.installAppInsights();
        }

       // await client.restartApp();
        
        await new Promise((resolve) => {
            require("copy-paste").copy(appUrl, resolve);
        });

        console.log(green`${"\u2713 "}` + green`App deployed to ${appUrl} (URL is copied to your clipboard!)`);

        client.openLogStream();
    })
};