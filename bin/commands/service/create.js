module.exports = {
    command: "create",
    desc: "Create and bind an external service to your app",
    builder(yargs) {
        return yargs
                .option("type", {
                    alias: "t",
                    describe: "The service type to create",
                    choices: ["mongodb"],
                    required: true
                })
                .option("name", {
                    alias: "n",
                    describe: "Name of the service to create"
                })
                .example("azjs service create -t mongodb", "Provisions and binds a new MongoDB server to the app identified by the CWD");
    },
    handler: createAzureHandler((client, { type, name }) => {
        // TODO: Make this logic dynamic to support n services
        if (type === "mongodb") {
            client.createDocumentDBInstance();
        }
    })
};