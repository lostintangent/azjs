const API_VERSION = "2016-02-01-privatepreview";
const PROVIDER_NAME = "Microsoft.DBforMySQL";
const RESOURCE_NAME = "servers";

// https://gallery.azure.com/artifact/20161101/Microsoft.MySQLServer.1.0.15/DeploymentTemplates/NewMySqlServer.json
module.exports = (clientFactory, appName, resourceGroup) => {
  // TODO: Update this to use the MySQL client as soon as it's published
  const client = clientFactory(require("azure-arm-resource"));
  const serverName = `${appName}-mysql`;
  const serverHost = `${serverName}.mysql.database.azure.com`;

  return {
    create(location = "WestUS", serverVersion = "5.7") {
      const generator = require("password-generator");
      const administratorLogin = generator(12, false);
      const administratorLoginPassword = generator(12, false, /[\d\W\w\p]/);

      const params = {
        location,
        name: serverName,
        properties: {
          version: serverVersion,
          administratorLogin,
          administratorLoginPassword,
          storageMB: 51200
        },
        sku: {
          name: "MYSQLB100",
          tier: "Basic",
          capacity: 100,
          size: 51200,
          family: "SkuFamily"
        }
      };

      return client.resources
        .createOrUpdate(
          resourceGroup,
          PROVIDER_NAME,
          "",
          RESOURCE_NAME,
          serverName,
          API_VERSION,
          params
        )
        .then(result => {
          console.log("Success");
          console.log(result);
          return `mysql://${administratorLogin}:${administratorLoginPassword}@${serverHost}/${databaseName}`;
        });

      // TODO: Download CA cert to the machine
      // https://www.digicert.com/CACerts/BaltimoreCyberTrustRoot.crt
    },

    remove() {
      return client.resources.deleteMethod(
        resourceGroup,
        PROVIDER_NAME,
        "",
        RESOURCE_NAME,
        serverName,
        API_VERSION
      );
    }
  };
};
