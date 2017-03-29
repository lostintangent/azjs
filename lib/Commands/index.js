module.exports.browse = async (client) => {
    await client.launchApp();
    client.openLogStream();
};

module.exports.down = module.exports.remove = async (client) => {
    client.deleteResourceGroup();

    // TODO: Delete the .azjs.json file and remote "azure" remote
};

module.exports.logs = (client) => {
    client.openLogStream();
};

module.exports.up = module.exports.deploy = async (client, scmType, remoteRepoUrl) => {
    const enableGit = scmType === "--git";
    
    await client.createResourceGroup();
    await client.createWebApp(enableGit, remoteRepoUrl);

    if (enableGit) {
        if (remoteRepoUrl) {
            await client.syncRemoteRepo();
        } else {
            await client.addGitRemote();
        }
    } else {
        await client.deploy();
        await client.installDependencies();
    }

    if (!enableGit || enableGit && remoteRepoUrl) {
        client.openLogStream();  
    }
};