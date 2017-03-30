#! /usr/bin/env node

const AzureClient = require("../lib/AzureClient");
const commands = require("../lib/Commands");
const didYouMean = require("didyoumean");
const nodeVersion = require("node-version");
const { green, red } = require("chalk");

if (nodeVersion.major < 6 && nodeVersion.minor < 9) {
    exit("The azjs CLI requires Node v6.9.0 or greater in order to run");
}

const version = require("../package.json").version;
let yargs = require("yargs")
    .usage("Usage: azjs <command> [options]")
    .demandCommand(1, "")
    .help("help").alias("h", "help")
    .version(version).alias("v", "version")
    .showHelpOnFail(false)
    .fail(() => {
        // Suppress default failure behavior
    })

commands.forEach((command) => {
    yargs = yargs.command(command.name, command.description, command.builder);
});

const args = yargs.argv;
const { _: [commandName] } = args;

if (commandName) {
    const command = commands.find((command) => command.name === commandName);
    if (!command) {
        let message = `Specified command not recognized: ${green(commandName)}`;
        
        const guessedCommandName = didYouMean(commandName, commands.map((command) => command.name));
        if (guessedCommandName) {
            message += `. Did you mean ${green(guessedCommandName)}?`;
        }        

        exit(message);
    }

    const client = new AzureClient();
    client.login().then(command.handler.bind(null, client, args));
} else {
    console.log(String.raw` ______  ______     __  ______    
/\  __ \/\___  \   /\ \/\  ___\   
\ \  __ \/_/  /__ _\_\ \ \___  \  
 \ \_\ \_\/\_____/\_____\/\_____\ 
  \/_/\/_/\/_____\/_____/\/_____/                                 

An opinionated CLI for deploying and managing Node.js apps on Azure
`);

    yargs.showHelp();
}

function exit(message) {
    console.error(`${red("[Error]")} ${message}`);
    process.exit(-1);
};