module.exports = {
  command: "monitor",
  desc: "View the telemetry data (e.g. HTTP requests) for your app",
  builder(yargs) {
    return yargs
      .usage("azjs monitor [options]")
      .example(
        "azjs monitor",
        "Launch your default browser, and navigate to your app's telemetry dashboard"
      );
  },
  handler: createAzureHandler(client => {
    require("opn")(
      `https://portal.azure.com/#blade/AppInsightsExtension/MetricsExplorerBlade/ConfigurationId/chartDefinitionId%3A%3Fname%3DCommon%2FPerformances%2FOperationTimelineMetrics/CurrentFilter/%7B%22eventTypes%22%3A%5B1%2C9%5D%2C%22isPermissive%22%3Afalse%2C%22typeFacets%22%3A%7B%7D%7D/ComponentId/%7B%22SubscriptionId%22%3A%22${client.subscriptionId}%22%2C%22ResourceGroup%22%3A%22${client.resourceGroup}%22%2C%22Name%22%3A%22${client.insightsName}%22%7D/TimeContext/%7B%22durationMs%22%3A86400000%2C%22endTime%22%3Anull%2C%22createdTime%22%3A%222017-04-04T23%3A35%3A30.502Z%22%2C%22isInitialTime%22%3Atrue%2C%22grain%22%3A1%2C%22useDashboardTimeRange%22%3Afalse%7D/selectedOption/Requests`,
      { wait: false }
    );
  })
};
