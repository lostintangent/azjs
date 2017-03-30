module.exports = {
    name: "remove",
    description: "Delete the Azure resources backing a web app",
    builder(yargs) {
        return yargs.example("azjs remove", "Delete the infrastructure for the web app specified by the CWD")
    },
    handler(client) {
        client.deleteResourceGroup();
        // TODO: Delete the .azjs.json file and remote "azure" remote
    }
};