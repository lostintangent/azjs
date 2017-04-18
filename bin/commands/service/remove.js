module.exports = {
    command: "remove",
    desc: "Removes an external service from your app",
    builder(yargs) {
        return yargs
                .option("name", {
                    alias: "n",
                    describe: "Name of the service to remove",
                    required: true
                })
                .example("azjs service remove -n foo", "Removes the service named \"foo\" from the app identified by the CWD");
    },
    handler: createAzureHandler((client, { name }) => {
        client.deleteResource();
    })
};