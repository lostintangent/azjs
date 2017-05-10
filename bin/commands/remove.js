module.exports = {
    command: "remove",
    desc: "Delete all of the Azure resources backing a deployed web app",
    builder(yargs) {
        return yargs.usage("azjs remove [options]")
                    .example("azjs remove", "Delete the infrastructure for the web app specified by the CWD");
    },
    handler: createAzureHandler((client, { noWait }) => {
        client.deleteResourceGroup();

        if (noWait) { 
            process.exit(0);
        }
    })
};