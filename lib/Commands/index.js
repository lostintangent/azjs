module.exports.browse = async (client) => {
    await client.launchApp();
    client.openLogStream();
};

module.exports.down = module.exports.remove = async (client) => {
    client.deleteResourceGroup();
};

module.exports.logs = (client) => {
    client.openLogStream();
};

module.exports.up = module.exports.deploy = async (client, gitUrl) => {
    await client.createResourceGroup();
    await client.createWebApp(gitUrl);

    if (gitUrl) {
        if (gitUrl !== "--git") {
            await client.syncRemoteRepo();
        } else {
            await client.addGitRemote();
        }
    } else {
        await client.deploy();
        await client.installDependencies();
    }

    if (gitUrl !== "--git") {
        client.openLogStream();  
    }
};