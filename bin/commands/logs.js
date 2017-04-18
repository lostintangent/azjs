module.exports = {
    command: "logs",
    desc: "View the log stream for your deployed app",
    builder(yargs) {
        return yargs.example("azjs logs", "Start streaming the logs for the web app located in the CWD");
    },
    handler: createAzureHandler((client) => {
        client.openLogStream();
    })
};