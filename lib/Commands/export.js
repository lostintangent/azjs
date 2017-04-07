const fse = require("fs-extra");

module.exports = {
    name: "export",
    description: "Export the Azure deployment script (ARM) for your app",
    builder(yargs) {
        return yargs
                .describe("file", "File name to write the deployment script to. Defaults to stdout").alias("f", "file")
                .example("azjs export", "Write the app's deployment script to stdout")
                .example("azjs export -f foo.json", "Write the app's deployment script to a file named 'foo.json'");
    },
    async handler(client, { file }) {
        const template = await client.exportResourceGroup();
        const jsonTemplate = JSON.stringify(template);

        if (file) {
            fse.writeJSONSync(file, jsonTemplate);
        } else {
            process.stdout.write(jsonTemplate);
        }
    }
};