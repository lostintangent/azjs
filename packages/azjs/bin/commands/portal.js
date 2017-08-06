module.exports = {
  command: "portal",
  desc: "Manage your app via the Azure portal",
  builder(yargs) {
    return yargs
      .usage("azjs portal [options]")
      .example(
        "azjs portal",
        "Launch the Azure portal to your web app's settings"
      );
  },
  handler: createAzureHandler(client => {
    require("opn")(
      `https://portal.azure.com/#resource/subscriptions/${client.subscriptionId}/resourceGroups/${client.resourceGroup}/providers/Microsoft.Web/sites/${client.appName}`,
      { wait: false }
    );
  })
};
