module.exports = {
    command: "clear",
    desc: "Clear all current logpoints",
    builder(yargs) {
        return yargs.usage("azjs logpoint clear [options]")
                    .example("azjs logpoint clear", "Clears the currently set logpoints");
    },
    handler: createAzureHandler((client) => {
        client.clearLogpoints();
    })
};