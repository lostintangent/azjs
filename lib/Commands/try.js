const opn = require("opn");
const { log } = require("../util");

module.exports = {
    name: "try",
    description: "Provision a sample web app, in order to try out Azure",
    allowAnonymousAccess: true,
    builder(yargs) {
        return yargs.example("azjs try", "Launches your default browser in order to provision a new web app trial, or view an existing one");
    },
    handler() {
        log("Provisioning your trial web app instance. Follow the presented instructions in the launched browser...");
        opn("https://azure.microsoft.com/en-us/try/app-service/auth/?Type=web&Template=Express&Step=template&loginProvider=GitHub", { wait: false });
    }
};