module.exports = {
    command: "exec",
    desc: "Executes an arbitrary shell command against the remote web app",
    builder(yargs) {
        return yargs.option("command", {
                    alias: "c",
                    describe: "Shell command to run",
                    required: true
                })
                .usage("Usage: azjs exec -c <command> [options]")
                .example("azjs exec -c 'npm i -g gulp'", "Execute an NPM command on the remote app");
    },
    handler: createAzureHandler((client, { command }) => {
        return client.runRemoteCommand(command).then(({ Error: errorMessage, ExitCode, Output }) => {
            if (ExitCode === 0) {
                Output && console.log(Output);
            } else {
                throw new Error(errorMessage);
            }
        });
    })
};