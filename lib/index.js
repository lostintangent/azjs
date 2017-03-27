const AzureClient = require("./AzureClient");
const didYouMean = require("didyoumean");
const nodeVersion = require("node-version");
const { green, red } = require("chalk");

async function down (client) {
    client.deleteResourceGroup();
}

async function up (client, gitUrl) {
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
}

const commands = {
    browse: async (client) => {
        await client.launchApp();
        client.openLogStream();
    },
    deploy: up,
    down: down,
    logs: (client) => {
        client.openLogStream();
    },
    remove: down,
    up: up
};

function exit(message) {
    console.error(`${red("[Error]")} ${message}`);
    process.exit(-1);
};

module.exports = async (commandName = "up", ...args) => {
    if (nodeVersion.major < 6 && nodeVersion.minor < 9) {
        exit("The azjs CLI requires Node v6.9.0 or greater in order to run");
    }
    
    const command = commands[commandName];
    if (!command) {
        let message = `Specified command not recognized: ${green(commandName)}`;
        
        const guessedCommandName = didYouMean(commandName, Object.keys(commands));
        if (guessedCommandName) {
            message += `. Did you mean ${green(guessedCommandName)}?`;
        }        

        exit(message);
    }

    const client = new AzureClient();
    await client.login();    
    command(client, ...args);
};