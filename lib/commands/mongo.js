module.exports = {
    name: "mongo",
    description: "Adds a managed MongoDB server (backed by DocumentDB) to your app",
    builder(yargs) {
        return yargs.example("azjs mongo", "Provisions and binds a new MongoDB server to the app identified by the CWD");
    },
    handler(client) {
        client.createDocumentDBInstance();
    }
};