const authorization = require("azure-arm-authorization");
const azureRest = require("ms-rest-azure");
const { copy } = require("copy-paste");
const fse = require("fs-extra");
const graph = require("azure-graph");
const moment = require("moment");
const opn = require("opn");
const os = require("os");
const path = require("path");
const { exit, green, log } = require("../utils");

const CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");

const AZ_CLI_PROFILE_FILE = path.join(CONFIG_DIRECTORY, "azureProfile.json");
const SERVICE_PRINCIPAL_FILE = path.join(CONFIG_DIRECTORY, "azjsServicePrincipal.json");

function authenticate() {
    return new Promise((resolve, reject) => {
        let interactive = false;

        // Support the same env vars that the Serverless (azure*) and Terraform (ARM*) CLIs expect
        const clientId = process.env.azureServicePrincipalClientId || process.env.ARM_CLIENT_ID;
        const clientSecret = process.env.azureServicePrincipalPassword || process.env.ARM_CLIENT_SECRET;
        const tenantId = process.env.azureServicePrincipalTenantId || process.env.ARM_TENANT_ID;

        if (clientId && clientSecret && tenantId) {
            try {
                azureRest.loginWithServicePrincipalSecret(clientId, clientSecret, tenantId, resolvePromise);
            } catch (error) {
                exit("The credentials specified in your environment variables are invalid.");
            }
        } else {
            if (fse.existsSync(SERVICE_PRINCIPAL_FILE)) {
                const { id, secret, tenant } = fse.readJSONSync(SERVICE_PRINCIPAL_FILE);  

                try {     
                    azureRest.loginWithServicePrincipalSecret(id, secret, tenant, resolvePromise); 
                } catch (error) {
                    // The SP is either invalid or expired, but since the end-user doesn't
                    // know about this file, let's simply delete it and move on to interactive auth.
                    fse.removeSync(SERVICE_PRINCIPAL_FILE);
                    loginInteractively();
                }
            } else {
                loginInteractively();
            }
        }
        
        function loginInteractively() {
            const userCodeResponseLogger = (message) => {
                const [code] = message.match(/[A-Z0-9]{7,}/);
                copy(code);

                log(green`Login to your Azure account in order to continue. The following authentication code has been copied to your clipboard and can be pasted into the launched browser: ${code}`);
                opn("https://aka.ms/devicelogin");
            };

            interactive = true;
            azureRest.interactiveLogin({ userCodeResponseLogger }, resolvePromise);
        }

        function resolvePromise(error, credentials, subscriptions) {
            resolve({ credentials, subscriptions, interactive });
        }
    });
}

function createServicePrincipal(credentials, tenantId, subscriptionId) {
    const credOptions = {
        domain: tenantId,
        tokenAudience: "graph",
        username: credentials.username,
        tokenCache: credentials.tokenCache,
        environment: credentials.environment
    };

    const credsForGraph = new azureRest.DeviceTokenCredentials(credOptions);
    const graphClient = new graph(credsForGraph, tenantId);
    const spPass = azureRest.generateUuid();
    const spName = `http://${azureRest.generateUuid()}.azjs.com`;
    const appOptions = {
        availableToOtherTenants: false,
        displayName: "azjs",
        homepage: spName,
        identifierUris: [spName],
        passwordCredentials: [{
            startDate: moment().toISOString(),
            endDate: moment().add(1, "month").toISOString(),
            keyId: azureRest.generateUuid(),
            value: spPass
        }]
    };

    graphClient.applications.create(appOptions, (error, app) => {
        const spOptions = {
            appId: app.appId,
            accountEnabled: true
        };

        graphClient.servicePrincipals.create(spOptions, (error, sp) => {
            var authzClient = new authorization(credentials, subscriptionId, null);
            const roleId = "b24988ac-6180-42a0-ab88-20f7382dd24c"; // Contributor
            const scope = `/subscriptions/${subscriptionId}`;
            const roleDefinitionId = `${scope}/providers/Microsoft.Authorization/roleDefinitions/${roleId}`;

            const roleOptions = {
                properties: {
                    principalId: sp.objectId,
                    roleDefinitionId,
                    scope
                }
            };

            authzClient.roleAssignments.create(scope, azureRest.generateUuid(), roleOptions, (error) => {
                fse.writeJSONSync(SERVICE_PRINCIPAL_FILE, { id: sp.appId, secret: spPass, tenant: tenantId });
            });
        });
    });
};

function selectSubscription(subscriptions) {
    switch (subscriptions.length) {
        case 0:
            exit("No subscriptions associated with this account");
        
        case 1:
            return subscriptions[0];

        default:
            let subscriptionId = process.env.azureSubId || process.env.ARM_SUBSCRIPTION_ID;
            
            if (!subscriptionId) {                    
                if (fse.existsSync(AZ_CLI_PROFILE_FILE)) {
                    try {
                        const profile = fse.readJsonSync(configFile);
                        subscriptionId = profile.subscriptions.find((sub) => sub.isDefault).id;
                    } catch (error) {
                        // Add error handling here
                        process.exit(-1);
                    }
                } else {
                    // Todo: Prompt the user to select a sub
                }
            }

            const subscription = subscriptions.find((sub) => sub.id === subscriptionId);
            if (subscription) {
                return subscription;
            } else {
                exit(green`Specified subscription isn't associated with your account: ${subscriptionId}`);
            };
    }
}

exports.login = async () => {
    const { credentials, subscriptions, interactive } = await authenticate();
    const { id, tenantId } = await selectSubscription(subscriptions);

    if (interactive) {
        await createServicePrincipal(credentials, tenantId, id);
    }

    const accessToken = credentials.tokenCache._entries[0].accessToken;
    return { accessToken, credentials, subscriptionId: id };
};