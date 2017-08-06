module.exports = {
  command: "restart",
  desc: "Restarts the web app",
  builder(yargs) {
    return yargs
      .usage("azjs restart [options]")
      .example("azjs restart", "Restart the web app identified by the CWD");
  },
  handler: createAzureHandler(client => {
    client.restartApp();
  })
};
