const opn = require("opn");

const COMMAND_NAME = "portal";

module.exports = {
    name: COMMAND_NAME,
    description: "Manage your app via the Azure portal",
    builder(yargs) {
        return yargs.example(`azjs ${COMMAND_NAME}`, "Launch the Azure portal to your web app's settings");
    },
    handler(client) {
        opn(`https://portal.azure.com/#resource/subscriptions/${client.subscriptionId}/resourceGroups/${client.resourceGroup}/providers/Microsoft.Web/sites/${client.appName}`, { wait: false});
    }
};