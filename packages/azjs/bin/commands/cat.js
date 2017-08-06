module.exports = {
  command: "cat",
  desc: "Prints the contents of a remotely deployed file",
  builder(yargs) {
    return yargs
      .option("file", {
        alias: "f",
        describe: "File name to retrieve from the server",
        required: true
      })
      .usage("Usage: azjs cat -f <filePath> [options]")
      .example(
        "azjs cat -f app/routes.js",
        "Print the contents of the 'app/routes.js' file, as it exists in the current deployment"
      );
  },
  handler: createAzureHandler((client, { file }) => {
    client.getFileContents(file).then(fileContents => {
      const highlightedContents = require("cardinal").highlight(fileContents, {
        linenos: true
      });
      console.log(highlightedContents);
    });
  })
};
