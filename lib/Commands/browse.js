module.exports = {
    name: "browse",
    description: "Launch your default browser and navigate to the web app",
    builder(yargs) {
        return yargs.example("azjs browse", "Launch a browser and navigate to the latest deployment for the app in the CWD");
    },
    handler(client) {
        client.launchApp().then(() => {
            client.openLogStream();
        })
    }
};