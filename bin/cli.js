#! /usr/bin/env node

const nodeVersion = require("node-version");
const { exit } = require("../lib/util");

if (nodeVersion.major < 6 && nodeVersion.minor < 9) {
    exit("The azjs CLI requires Node v6.9.0 or greater in order to run");
}

global.createAzureHandler = (func, allowAnonymousAccess = false) => {
    return (args) => {
        const AzureClient = require("../lib/AzureClient");
        const client = new AzureClient();

        const boundFunc = func.bind(null, client, args);

        if (allowAnonymousAccess) {
            boundFunc();
        } else {
            client.login().then(boundFunc);
        }
    };
};

global.createCommandGroup = (name, description) => {
    return {
        command: name,
        desc: description,
        builder(yargs) {
            return yargs.commandDir(require("path").join("commands", name));
        },
        handler() {
            require("yargs").showHelp();
        }
    };
};

const { argv } = require("yargs")
    .commandDir("commands")
    .usage("Usage: azjs <command> [options]")
    .demandCommand(1).strict()
    .help("help").alias("h", "help")
    .version(require("../package.json").version).alias("v", "version")
    .fail(handleArgParsingFailure)

// TODO: Handle missing required options (e.g. service create command)
function handleArgParsingFailure(message, error, yargs) {
    const [,,...specifiedCommands] = process.argv;

    if (specifiedCommands.length === 0) {
        printLogo();
        yargs.showHelp();
    } else {
        const availableCommands = yargs.getCommands().map(([command]) => command);
        let message = `Unrecognized command name: "${specifiedCommands.join(" ")}".`;

        const suggestion = require("didyoumean")(specifiedCommands.pop(), availableCommands);
        if (suggestion) {
            message += ` Did you mean "${suggestion}"?`;
        }

        exit(message);
    }
}

function printLogo() {
console.log(String.raw` ______  ______     __  ______    
/\  __ \/\___  \   /\ \/\  ___\   
\ \  __ \/_/  /__ _\_\ \ \___  \  
 \ \_\ \_\/\_____/\_____\/\_____\ 
  \/_/\/_/\/_____\/_____/\/_____/                                 

An opinionated CLI for deploying and managing Node.js apps on Azure
`);
}