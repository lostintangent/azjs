module.exports = {
    name: "deploy",
    description: "Create and deploy a web app",
    builder(yargs) {
        return yargs
            .describe("git", "Enable Git-based deployment")
            .alias("g", "git")
            .example("azjs up", "Create your Azure web app (if needed), and then deploy the contents of the CWD")
            .example("azjs up --git", "Create your Azure web app (if needed), and enable a Git repo to deploy changes to")
            .example("azjs up --git https://github.com/scotch-io/node-todo", "Create your Azure web app (if needed), and connect it to a remote Git repo");
    },
    async handler(client, { git }) {
        await client.createResourceGroup();
        await client.createWebApp(git);

        const isRemoteRepo = typeof git === "string";
        if (git) {
            if (isRemoteRepo) {
                await client.syncRemoteRepo();
            } else {
                await client.addGitRemote();
            }
        } else {
            await client.deploy();
            await client.installDependencies();
        }

        if (!git || isRemoteRepo) {
            client.openLogStream();  
        }
    }
};