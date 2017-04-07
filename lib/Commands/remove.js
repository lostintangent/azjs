const COMMAND_NAME = "remove";

module.exports = {
    name: "remove",
    description: "Delete all of the Azure resources backing a deployed web app",
    builder(yargs) {
        return yargs.example("azjs remove", "Delete the infrastructure for the web app specified by the CWD")
    },
    handler(client) {
        client.deleteResourceGroup();
    }
};