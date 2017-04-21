module.exports = {
    command: "add",
    desc: "Add a dynamic logpoint",
    builder(yargs) {
        return yargs
                .describe("file", "Enable Git-based deployment from a local repo").alias("f", "file")
                .describe("line", "Enable Git-based deployment from a local repo").alias("l", "line")
                .describe("expression", "Enable Git-based deployment from a local repo").alias("e", "expression")
                .example("azjs logpoint add -f foo.js -l 23 -e 'cool'", "Add a logpoint to line 23 of foo.js");
    },
    handler: createAzureHandler((client, { file, line, expression }) => {
        client.addLogpoint(file, line, expression);
    })
};