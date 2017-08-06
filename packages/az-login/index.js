const azure = require("ms-rest-azure");
const fse = require("fs-extra");
const os = require("os");
const path = require("path");
const { generateUuid } = azure;
const { env } = process;

const CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
const CONTRIBUTOR_ROLE_ID = "b24988ac-6180-42a0-ab88-20f7382dd24c";
const INTERACTIVE_LOGIN_URL = "https://aka.ms/devicelogin";

const AZ_CLI_PROFILE_FILE = path.join(CONFIG_DIRECTORY, "azureProfile.json");
const SERVICE_PRINCIPAL_FILE = path.join(
  CONFIG_DIRECTORY,
  "azloginServicePrincipal.json"
);

const { name: SERVICE_NAME } = require("./package.json");

function authenticate({
  clientId = env.azureServicePrincipalClientId || env.ARM_CLIENT_ID,
  clientSecret = env.azureServicePrincipalPassword || env.ARM_CLIENT_SECRET,
  tenantId = env.azureServicePrincipalTenantId || env.ARM_TENANT_ID,
  interactiveLoginHandler,
  secretStore,
  serviceClientId,
  serviceTenantId,
  suppressBrowser = false
}) {
  return new Promise((resolve, reject) => {
    let interactive = false;

    // If a specific identity was specified, then
    // attempt to use it and fail if it's invalid
    if (clientId && clientSecret && tenantId) {
      const errorMessage =
        "The specified Azure credentials don't appear to be valid. Please check them and try authenticating again";
      azure.loginWithServicePrincipalSecret(
        clientId,
        clientSecret,
        tenantId,
        handle(errorMessage)
      );
    } else {
      if (!fse.existsSync(SERVICE_PRINCIPAL_FILE)) {
        return loginInteractively();
      }

      const { id, tenantId } = fse.readJSONSync(SERVICE_PRINCIPAL_FILE);
      secretStore.getPassword(SERVICE_NAME, id).then(secret => {
        if (!secret) {
          // The secret has been deleted, while the SP file still exists...
          fse.removeSync(SERVICE_PRINCIPAL_FILE);
          return loginInteractively();
        }

        azure.loginWithServicePrincipalSecret(
          id,
          secret,
          tenantId,
          handle(() => {
            // The SP is either invalid or expired, but since the end-user doesn't
            // know about this file, let's simply delete it and move on to interactive auth.
            fse.removeSync(SERVICE_PRINCIPAL_FILE);
            secretStore
              .deletePassword(SERVICE_NAME, id)
              .then(loginInteractively);
          })
        );
      });
    }

    function handle(onError) {
      return (error, credentials, subscriptions) => {
        if (error) {
          if (typeof onError === "string") {
            reject(new Error(onError));
          } else if (typeof onError === "function") {
            onError(error);
          } else {
            reject(error);
          }
        } else {
          resolve({ credentials, subscriptions, interactive });
        }
      };
    }

    function loginInteractively() {
      interactive = true;

      const userCodeResponseLogger = message => {
        // Parse out the device code and copy it to the clipboard.
        const [code] = message.match(/[A-Z0-9]{9,}/);
        require("copy-paste").copy(code);

        const newMessage = `Open a browser to ${INTERACTIVE_LOGIN_URL} and provide the following code (which is copied to your clipboard!) to complete the login process: ${code}`;
        interactiveLoginHandler
          ? interactiveLoginHandler(code, newMessage)
          : console.log(newMessage);

        if (!suppressBrowser) {
          require("opn")(INTERACTIVE_LOGIN_URL, { wait: false });
        }
      };

      azure.interactiveLogin(
        {
          clientId: serviceClientId,
          domain: serviceTenantId,
          userCodeResponseLogger
        },
        handle()
      );
    }
  });
}

function createCredentials(baseCredentials, tenantId, graphToken = false) {
  const credentialOptions = {
    domain: tenantId,
    username: baseCredentials.username,
    tokenCache: baseCredentials.tokenCache,
    environment: baseCredentials.environment
  };

  if (graphToken) {
    credentialOptions.tokenAudience = "graph";
  }

  return new azure.DeviceTokenCredentials(credentialOptions);
}

function createServicePrincipal(
  credentials,
  tenantId,
  subscriptionId,
  secretStore
) {
  return new Promise((resolve, reject) => {
    const authorization = require("azure-arm-authorization");
    const graph = require("azure-graph");
    const moment = require("moment");

    const graphCredentials = createCredentials(credentials, tenantId, true);
    const graphClient = new graph(graphCredentials, tenantId);

    const servicePrincipalName = `http://${generateUuid()}`;
    const servicePrincipalPassword = generateUuid();

    const applicationOptions = {
      availableToOtherTenants: false,
      displayName: SERVICE_NAME,
      homepage: servicePrincipalName,
      identifierUris: [servicePrincipalName],
      passwordCredentials: [
        {
          startDate: moment().toISOString(),
          endDate: moment().add(1, "month").toISOString(),
          keyId: generateUuid(),
          value: servicePrincipalPassword
        }
      ]
    };

    graphClient.applications.create(applicationOptions, (error, app) => {
      if (error) {
        return reject(error);
      }

      const servicePrincipalOptions = {
        appId: app.appId,
        accountEnabled: true
      };

      graphClient.servicePrincipals.create(
        servicePrincipalOptions,
        (error, sp) => {
          if (error) {
            return reject(error);
          }

          const { roleAssignments } = new authorization(
            credentials,
            subscriptionId
          );
          const scope = `subscriptions/${subscriptionId}`;
          const roleDefinitionId = `${scope}/providers/Microsoft.Authorization/roleDefinitions/${CONTRIBUTOR_ROLE_ID}`;

          const roleAssignmentOptions = {
            properties: {
              principalId: sp.objectId,
              roleDefinitionId,
              scope
            }
          };

          !(function createRoleAssignment() {
            roleAssignments
              .create(scope, generateUuid(), roleAssignmentOptions)
              .then(() => {
                fse.writeJSONSync(SERVICE_PRINCIPAL_FILE, {
                  id: sp.appId,
                  tenantId
                });
                secretStore
                  .setPassword(SERVICE_NAME, sp.appId, servicePrincipalPassword)
                  .then(resolve);
              })
              .catch(error => {
                if (error.code && error.code === "PrincipalNotFound") {
                  // This can fail due to the SP not having
                  // be fully created yet, so try again.
                  setTimeout(createRoleAssignment, 1000);
                } else {
                  reject(error);
                }
              });
          })();
        }
      );
    });
  });
}

// Checks to see whether the specified module
// is currently available in the running environment.
function isModuleAvailable(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (e) {
    return false;
  }
}

function promptForSubscription(subscriptions) {
  return require("inquirer")
    .prompt([
      {
        name: "subscriptionId",
        message: "Select the Azure subscription you would like to use",
        type: "list",
        choices: subscriptions.map(subscription => {
          return { name: subscription.name, value: subscription.id };
        })
      }
    ])
    .then(answers => {
      return subscriptions.find(({ id }) => id === answers.subscriptionId);
    });
}

function resolveSecretStore() {
  // Check to see whether we're currently running
  // within a VS Code extension, and use it's
  // secret store if available (it's an experimental API).
  if (isModuleAvailable("vscode")) {
    const { credentials } = require("vscode");
    if (credentials) {
      return {
        getPassword: credentials.readSecret,
        deletePassword: credentials.deleteSecret,
        setPassword: credentials.writeSecret
      };
    }
  }

  // If the app is currently using keytar, then use that,
  // otherwise, fall back to the basic file-based crypto store.
  if (isModuleAvailable("keytar")) {
    return require("keytar");
  } else {
    return require("./fileSecretStore");
  }
}

const SUBSCRIPTION_DISABLED_STATE = "Disabled";
function resolveSubscription(
  subscriptions,
  subscriptionId = env.azureSubId || env.ARM_SUBSCRIPTION_ID,
  subscriptionResolver
) {
  return new Promise((resolve, reject) => {
    // Regardless if the user has specified an exact subscription ID or not, if there
    // aren't any subscriptions associated with their account, we should fail immediately.
    if (subscriptions.length === 0) {
      return reject(
        new Error(
          "There aren't any subscriptions associated with this Azure account"
        )
      );
    }

    // If a specific subscription ID was requested, then force it
    // to be used, even if it isn't valid for the current account
    if (subscriptionId) {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      if (!subscription) {
        return reject(
          new Error(
            `The specified subscription ID isn't associated with your Azure account: ${subscriptionId}`
          )
        );
      } else if (subscription.state === SUBSCRIPTION_DISABLED_STATE) {
        return reject(
          new Error(
            `The specified subscription is currently disabled: ${subscriptionId}`
          )
        );
      } else {
        return resolve(subscription);
      }
    } else if (subscriptions.length === 1) {
      const subscription = subscriptions[0];
      if (subscription.state === SUBSCRIPTION_DISABLED_STATE) {
        return reject(
          new Error(
            `This Azure account only has a single subscription, but it is currently disabled: ${subscription.id}`
          )
        );
      } else {
        return resolve(subscription);
      }
    } else if (fse.existsSync(AZ_CLI_PROFILE_FILE)) {
      // If the user has Az CLI installed, which is configured with a default
      // subscription that is associated with the current account, then use it
      const profile = fse.readJsonSync(AZ_CLI_PROFILE_FILE);
      const defaultSubscription = profile.subscriptions.find(
        sub => sub.isDefault
      );
      if (
        defaultSubscription &&
        subscriptions.find(sub => sub.id === defaultSubscription.id)
      ) {
        return resolve(defaultSubscription);
      }
    }

    // There's no way to infer the user's preferred subscription,
    // so we have to prompt them to select one
    if (subscriptionResolver) {
      subscriptionResolver(subscriptions).then(resolve, reject);
    } else {
      reject(
        new Error(
          "This Azure account has multiple subscriptions, and there's no way to resolve which one to use"
        )
      );
    }
  });
}

exports.login = (
  {
    clientId,
    clientSecret,
    tenantId,
    subscriptionId,
    interactiveLoginHandler,
    subscriptionResolver,
    serviceName,
    serviceClientId,
    serviceTenantId,
    secretStore = resolveSecretStore(),
    suppressBrowser
  } = {}
) => {
  let state;
  return authenticate({
    clientId,
    clientSecret,
    tenantId,
    serviceClientId,
    serviceTenantId,
    interactiveLoginHandler,
    secretStore,
    suppressBrowser
  })
    .then(({ credentials, interactive, subscriptions }) => {
      state = {
        accessToken: credentials.tokenCache._entries[0].accessToken,
        credentials,
        interactive
      };

      if (!subscriptionResolver && process.stdout.isTTY) {
        subscriptionResolver = promptForSubscription;
      }

      return resolveSubscription(
        subscriptions,
        subscriptionId,
        subscriptionResolver
      );
    })
    .then(({ id, tenantId }) => {
      state.subscriptionId = id;
      state.clientFactory = (clientConstructor, ...args) => {
        const client = Reflect.construct(clientConstructor, [
          state.credentials,
          id,
          ...args
        ]);
        client.addUserAgentInfo(serviceName || SERVICE_NAME);
        return client;
      };

      if (state.interactive) {
        // The credentials that were created via the interactive login process
        // aren't associated with any specific tenant, so let's re-create
        // them now that the user has specified the tenant they want to use.
        state.credentials = createCredentials(state.credentials, tenantId);
        return createServicePrincipal(
          state.credentials,
          tenantId,
          id,
          secretStore
        );
      }
    })
    .then(() => {
      return state;
    });
};

exports.logout = () => {
  return new Promise((resolve, reject) => {
    fse.exists(SERVICE_PRINCIPAL_FILE, exists => {
      if (!exists) {
        return resolve(false);
      }

      // TODO: Attempt to delete this SP from the user's
      // Azure account, before deleting the file on disk
      fse.unlink(SERVICE_PRINCIPAL_FILE, error => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  });
};
