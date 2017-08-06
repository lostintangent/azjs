module.exports = (clientFactory, appName, resourceGroup) => {
  const client = clientFactory(require("azure-arm-rediscache"));
  const cacheName = `${appName}-redis`;

  return {
    create(location = "WestUS") {
      const parameters = {
        location,
        enableNonSslPort: false,
        sku: {
          capacity: 1,
          family: "C",
          name: "Standard"
        }
      };

      let state;
      return client.redis
        .create(resourceGroup, cacheName, parameters)
        .then(result => {
          state = result;
          return client.redis.listKeys(resourceGroup, cacheName);
        })
        .then(({ primaryKey }) => {
          // https://www.iana.org/assignments/uri-schemes/prov/redis
          return `redis://:${primaryKey}@${state.hostName}:${state.sslPort}`;
        });
    },

    remove() {
      return client.redis.deleteMethod(resourceGroup, cacheName);
    }
  };
};
