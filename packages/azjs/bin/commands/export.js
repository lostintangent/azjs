module.exports = {
  command: "export",
  desc: "Export the Azure deployment script (ARM) for your app",
  builder(yargs) {
    return yargs
      .option("file", {
        alias: "f",
        describe:
          "File name to write the deployment script to. Defaults to stdout"
      })
      .usage("azjs export [-f <fileName>] [options]")
      .example("azjs export", "Write the app's deployment script to stdout")
      .example(
        "azjs export -f foo.json",
        "Write the app's deployment script to a file named 'foo.json'"
      );
  },
  handler: createAzureHandler((client, { file }) => {
    client.exportResourceGroup().then(template => {
      const jsonTemplate = JSON.stringify(template);

      if (file) {
        fse.writeJSONSync(file, jsonTemplate);
      } else {
        console.log(jsonTemplate);
      }
    });
  })
};
