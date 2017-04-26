module.exports = {
    command: "cat",
    desc: "Prints the contents of a remotely deployed file",
    builder(yargs) {
        return yargs.option("file", {
                    alias: "f",
                    describe: "File name to retrieve from the server"
                })
                .example("azjs cat -f app/routes.js", "Print the contents of the 'app/routes.js' file, as it exists in the current deployment");
    },
    handler: createAzureHandler(async (client, { file }) => {
        const fileContents = await client.getFileContents(file);
        const highlightedContent = require("cardinal").highlight(fileContents, { linenos: true });
        console.log(highlightedContent);
    })
};