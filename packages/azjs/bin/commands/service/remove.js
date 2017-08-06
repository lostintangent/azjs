module.exports = {
  command: "remove",
  desc: "Removes an external service from your app",
  builder(yargs) {
    return yargs
      .usage("azjs service remove -t <serviceType> [options]")
      .option("type", {
        alias: "t",
        describe: "Type of the service to remove",
        choices: ["mongodb", "mysql", "redis", "registry"],
        required: true
      })
      .example(
        "azjs service remove -t mongo",
        "Removes the MongoDB service from the app identified by the CWD"
      );
  },
  handler: createAzureHandler((client, { type }) => {
    client.removeService(type);
  })
};
