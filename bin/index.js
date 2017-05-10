#! /usr/bin/env node

const fs = require("fs");
const nodeVersion = require("node-version");
const path = require("path");
const yargs = require("yargs");
const { exit } = require("../lib/util");

if (nodeVersion.major < 6 && nodeVersion.minor < 9) {
    exit("The azjs CLI requires Node v6.9.0 or greater in order to run");
}

const COMMAND_DIRECTORY = "commands";

global.createAzureHandler = (func, requiresProject = true) => {
    return (args) => {
        if (requiresProject) {
            if (!fs.existsSync(path.join(process.cwd(), ".azjs.json"))) {
                exit("This command must be run from within the directory of an Az.js project.");
            }
        }

        const AzureClient = require("../lib/AzureClient");
        const client = new AzureClient();
        const boundFunc = func.bind(client, client, args);

        return client.login().then(boundFunc).catch(exit);
    };
};

global.createCommandGroup = (name, description) => {
    return {
        command: name,
        desc: description,
        builder(yargs) {
            return yargs.usage(`azjs ${name} <command> [options]`)
                        .commandDir(path.join(COMMAND_DIRECTORY, name));
        },
        handler() {
            require("yargs").showHelp();
        }
    };
};

yargs.usage("Usage: azjs <command> [options]")
    .demandCommand(1).strict()
    .commandDir(COMMAND_DIRECTORY)    
    .help().alias("h", "help")
    .version().alias("v", "version")
    .fail(failHandler)
    .argv;

function failHandler(message, error, yargs) {
    const [,,...specifiedCommands] = process.argv;

    if (specifiedCommands.length === 0) {
        printLogo();
    } else {
        const { red } = require("chalk");
        console.error(`${red(message)}\n`);
    }

    yargs.showHelp();
}

function printLogo() {
console.error(String.raw` ______  ______     __  ______    
/\  __ \/\___  \   /\ \/\  ___\   
\ \  __ \/_/  /__ _\_\ \ \___  \  
 \ \_\ \_\/\_____/\_____\/\_____\ 
  \/_/\/_/\/_____\/_____/\/_____/                                 

An opinionated CLI for deploying and managing Node.js apps on Azure
`);
}

process.on("unhandledRejection", (reason) => exit(reason));