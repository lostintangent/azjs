// For now, this is a hidden command, since we're not
// adding kudu-fs as a dependency of Az.js, and therefore,
// this command will only work in dev builds.

module.exports = {
  command: "mount",
  builder(yargs) {
    return yargs
      .option("path", {
        alias: "p",
        describe: "Local to mount the web app's filesystem to"
      })
      .usage("Usage: azjs mount [options]")
      .example(
        "azjs mount",
        "Mount your web app's filesystem to a new directory in your CWD"
      );
  },
  handler: createAzureHandler((client, { path }) => {
    return client.mountRemoteFilesystem(path);
  })
};
