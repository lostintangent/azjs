module.exports = (clientFactory, appName, resourceGroup) => {
    const storageClient = clientFactory(require("azure-arm-storage"));
    const client = clientFactory(require("azure-arm-containerregistry"));

    // ACR instance names can't have hyphens in them
    const registryName = `${appName}registry`.replace(/-/g, "");
    const storageName = `${appName}`.replace(/-/g, "");

    return {
        create(location = "WestUS") {
            return storageClient.storageAccounts.create(resourceGroup, storageName, {
                sku: { name: "Standard_LRS" },
                kind: "Storage",
                location
            }).then(() => {
                return storageClient.storageAccounts.listKeys(resourceGroup, storageName);
            }).then(({ keys: [{ value }] }) => {
                return client.registries.create(resourceGroup, registryName, {
                    location,
                    sku: { name: "Basic" },
                    adminUserEnabled: true,
                    storageAccount: {
                        accessKey: value,
                        name: storageName
                    }
                });
            }).then(() => {
                return client.registries.listCredentials(resourceGroup, registryName);
            }).then(({ username, passwords: [{ value }]}) => {
                return `${username}:${value}`
            });
        },

        remove() {
            return client.registries.deleteMethod(resourceGroup, registryName);
        }
    };
};