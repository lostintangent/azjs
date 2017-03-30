module.exports = {
    name: "deploy",
    description: "Create and deploy a Node.js app",
    builder(yargs) {
        return yargs
            .describe("git", "Enable Git-based deployment from a local repo").alias("g", "git")
            .describe("git-url", "Enable Git-based deployment from a remote repo (e.g. GitHub").alias("u", "git-url")
            .describe("no-sync", "Specifies whether you'd like to automatically sync the web app with a Git repo after creation. False by default")
            .example("azjs up", "Create your Azure web app (if needed), and then deploy the contents of the CWD")
            .example("azjs up --git", "Create your Azure web app (if needed), and enable a Git repo to deploy changes to")
            .example("azjs up --git-url https://github.com/scotch-io/node-todo", "Create your Azure web app (if needed), and connect it to a remote Git repo");
    },
    async handler(client, { git, gitUrl, noSync }) {
        await client.createResourceGroup();
        await client.createWebApp(git, gitUrl);

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
            await client.deploy();
            await client.installDependencies();
        }

        client.openLogStream();
    }
};