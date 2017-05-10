module.exports = {
    command: "browse",
    desc: "Launch your default browser and navigate to the deployed web app",
    builder(yargs) {
        return yargs.usage("azjs browse [options]")
                    .example("azjs browse", "Launch a browser and navigate to the latest deployment for the app located in the CWD");
    },
    handler: createAzureHandler((client) => {
        client.launchApp().then(() => {
            client.openLogStream();
        });
    })
};