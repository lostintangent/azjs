module.exports = (appClient, clientFactory, resourceGroup, appName) => {
  function updateAppSetting(serviceType, value) {
    return appClient.webApps
      .listApplicationSettings(resourceGroup, appName)
      .then(settings => {
        const settingName = `${serviceType.toUpperCase()}_URL`;
        if (value) {
          settings.properties[settingName] = value;
        } else {
          delete settings.properties[settingName];
        }
        return appClient.webApps.updateApplicationSettings(
          resourceGroup,
          appName,
          settings
        );
      });
  }

  return {
    create(serviceType) {
      const serviceInstance = require(`./${serviceType}`)(
        clientFactory,
        appName,
        resourceGroup
      );
      return serviceInstance
        .create()
        .then(connectionString =>
          updateAppSetting(serviceType, connectionString)
        );
    },
    remove(serviceType) {
      const serviceInstance = require(`./${serviceType}`)(
        clientFactory,
        appName,
        resourceGroup
      );
      return updateAppSetting(serviceType).then(() => serviceInstance.remove());
    }
  };
};
