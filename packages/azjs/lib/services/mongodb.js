module.exports = (clientFactory, appName, resourceGroup) => {
  const client = clientFactory(require("azure-arm-documentdb"));
  const databaseName = `${appName}-mongo`;

  return {
    create(location = "WestUS") {
      return client.databaseAccounts
        .createOrUpdate(resourceGroup, databaseName, {
          kind: "MongoDB",
          location,
          locations: [{ locationName: location, failoverPriority: 0 }]
        })
        .then(() => {
          return client.databaseAccounts.listConnectionStrings(
            resourceGroup,
            databaseName
          );
        })
        .then(
          ({ connectionStrings: [{ connectionString }] }) => connectionString
        );
    },

    remove() {
      return client.databaseAccounts
        .deleteMethod(resourceGroup, databaseName)
        .catch(() => {
          // TODO: Figure out why this is called multiple times, and fails on the second time
        });
    }
  };
};
