module.exports = {
    name: "logs",
    description: "View the log stream for a deployed web app",
    builder(yargs) {
        return yargs.example("azjs logs", "Start reading the log stream for the web app associated with the CWD");
    },
    handler(client) {
        client.openLogStream();
    }
};