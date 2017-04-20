const SERVICE_TYPES = ["mongodb", "redis"];

module.exports = {
    command: "create",
    desc: "Create and bind an external service to your app",
    builder(yargs) {
        return yargs
                .option("type", {
                    alias: "t",
                    describe: "The service type to create",
                    choices: SERVICE_TYPES,
                    required: true
                })
                .example("azjs service create -t mongodb", "Provisions and binds a new MongoDB server to the app identified by the CWD");
    },
    handler: createAzureHandler((client, { type }) => {
        client.createService(type);
    })
};