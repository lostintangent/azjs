module.exports = {
    command: "export",
    desc: "Export the Azure deployment script (ARM) for your app",
    builder(yargs) {
        return yargs
                .option("file", {
                    alias: "f",
                    describe: "File name to write the deployment script to. Defaults to stdout"
                })
                .example("azjs export", "Write the app's deployment script to stdout")
                .example("azjs export -f foo.json", "Write the app's deployment script to a file named 'foo.json'");
    },
    handler: createAzureHandler(async (client, { file }) => {
        const template = await client.exportResourceGroup();
        const jsonTemplate = JSON.stringify(template);

        if (file) {
            fse.writeJSONSync(file, jsonTemplate);
        } else {
            process.stdout.write(jsonTemplate);
        }
    })
};