module.exports = {
  command: "add",
  desc: "Add a dynamic logpoint",
  builder(yargs) {
    return yargs
      .usage(
        "azjs logpoint add -f <fileName> -l <lineNumber> -e <expression> [options]"
      )
      .option("file", {
        alias: "f",
        describe:
          "The file name to add the logpoint to, relative to the root of the web app (e.g. routes/view.js)",
        required: true
      })
      .option("line", {
        alias: "l",
        describe: "The line number to add the logpoint to",
        required: true
      })
      .option("expression", {
        alias: "e",
        describe: "The expression to run when the logpoint is hit",
        required: true
      })
      .example(
        "azjs logpoint add -f foo.js -l 23 -e 'cool'",
        "Add a logpoint to line 23 of foo.js"
      );
  },
  handler: createAzureHandler((client, { file, line, expression }) => {
    client.addLogpoint(file, line, expression);
  })
};
