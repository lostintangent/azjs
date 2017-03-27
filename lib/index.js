const AzureClient = require("./AzureClient");
const commands = require("./Commands")
const didYouMean = require("didyoumean");
const nodeVersion = require("node-version");
const { green, red } = require("chalk");

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