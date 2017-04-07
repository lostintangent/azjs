module.exports = {
    name: "logs",
    description: "View the log stream for your deployed app",
    builder(yargs) {
        return yargs.example("azjs logs", "Start streaming the logs for the web app located in the CWD");
    },
    handler(client) {
        client.openLogStream();
    }
};