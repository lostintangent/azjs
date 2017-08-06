# Azure Login (az-login)

The `az-login` module provides a simple way to add authentication to a Node.js-based automation script, CLI tool, VS Code extension, etc. that manages Azure resources on behalf of yourself and/or end-users. It is meant to compliment the already awesome [Azure SDK for Node](https://github.com/Azure/azure-sdk-for-node) (which provides the actual client APIs for managing Azure resources), by means of an opinionated and exploratory login experience.

## Pre-requisites

* [Node.js](https://nodejs.org/en/) v6.9.0+ (which is the current LTS release, and you should be using anyways!)

## Getting Started

In order to install the `az-login` module, simply run the following command within your app's directory:

```shell
npm i --save az-login
```

> Note: If you're using NPM 5+, you can omit the `--save` flag, since installed dependencies are automatically saved!

From within your app code, import the `login` method from the `az-login` module, as well as any management APIs that you need from the Azure SDK (e.g. `azure-arm-resource`):

```javascript
const { login } = require("az-login");
const { ResourceManagementClient } = require("azure-arm-resource");
```

> Note: Refer to the [documentation](http://azure.github.io/azure-sdk-for-node/) to determine all of the various management scenarios that the Azure SDK enables (e.g. creating VMs, configuring DNS, etc.)

Call the `login` method in order to initiate the authentication process ([details](#login)), and then use the returned `clientFactory` function to create automatically authenticated instances of the desired Azure management clients. It's that simple!

```javascript
const { clientFactory } = await login();
const { resourceGroups } = clientFactory(ResourceManagementClient);

// Begin managing the Azure account as usual!
const groups = await resourceGroups.list();
```

> Note: The above code sample is using [`async/await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) (since they make async code way more readable!), which requires Node.js 7.6+. If you're using an older version of Node.js (or you're not using TypeScript/Babel to transpile it), you can simply use the [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) returned by the `login` method, and call `.then()` on it to get the `clientFactory`.

If at some later point, you'd like to clear the local auth state from the current machine (e.g. in response to a `Logout` command), you can import and call the `logout` method, and rest assured that no credentials have been "leaked" unexpectedly.

```javascript
const { logout } = require("az-login");
await logout();
```

If you'd like to check out a simple example, and play around with this module, you can refer to `examples\index.js` file, which demonstrates how to login, and then retrieve the list of resource groups associated with the Azure account used to authenticate with.

## API Reference

The `az-login` module exports the following methods:

* [login](#login)
* [logout](#logout)

### login

```javascript
login(options? : LoginOptions): Promise<LoginResult>
```

Calling the `login` method will result in an "authentication code" being automatically copied to the clipboard, and a browser being launched, which allows you (or your end-users) to interactively authenticate with Azure. Once the login is complete, an Azure "service principal" is auto-created and persisted to disk, so that subsequent calls to `login` won't require re-authenticating. This allows your own apps to behave similarly to tools such as the [Az CLI](https://github.com/azure/azure-cli), without too much effort.

If you'd like to specify an exact Azure identity that should be used to authenticate, you can provide a service principal to the `login` method via it's `options` argument (see below), or you can set the following environment variables (which provide interop with other Azure management tools such as Serverless and Terraform):

* **azureSubId / ARM_SUBSRIPTION_ID** - The ID of the Azure subscription that you'd like to manage resources within
* **azureServicePrincipalClientId / ARM_CLIENT_ID** - The name of the service principal
* **azureServicePrincipalPassword / ARM_CLIENT_SECRET** - The password of the service principal
* **azureServicePrincipalTenantId / ARM_TENANT_ID** - The ID of the tenant that the service principal was created in

Additionally, it will attempt to automatically select the right Azure subscription to use for this login session, and will fall back to prompting the end-user as neccessary. This way, you don't need to write any subscription resolution logic in your app. You can simply call `login` and use the `clientFactory` to create management clients.

#### LoginOptions

While the primary use case of the `login` method is to call it without any arguments, it takes an optional config object, that allows specifying the Azure service principal via the following properties (all of which must be set, if any of them are set):

* *clientId* - The ID/username of the service principal that should be used to authenticate with Azure.

* *clientSecret* - The password/secret of the service principal that should be used to authenticate with Azure.

* *interactiveLoginHandler* - A function that will be called whenever an interactive login occurs. `az-login` will acquire the "device code", copy it to the clipboard, and then execute this function, passing in the copied device code, along with the console message it would have printed. This allows consumers of `az-login` to customize how they display this information to their end-users. This function is called syncronously, and afterwards, will immediately launch the end-users default browser (unless suppressed via the `suppressBrowser` option) to the neccessary authentication page (`https://aka.ms/devicelogin`).

    ```javascript
    const { login } = require("az-login");
    const { credentials } = await login({ interactiveLoginHandler: (code, message) => {
        // Do something with the device code, in order to notify your users to
        // complete the authentication process in the browser that will be launched
        // or simply customize the standard message (e.g. console.log(`[Some Prefix] ${message}`))
    }});

* *secretStore* - An object that represents the secret store that should be used to persist the Azure service principal that is generated after an interactive login is successfully completed. This object should have the same API interface at [`keytar`](https://github.com/atom/node-keytar#docs), and in particular, implement the following three methods: `deletePassword`, `getPassword` and `setPassword`. By default, it will attempt to use the first available option in the following ordered list:

    1. The `vscode.credentials` API, if the running process is a VS Code extension
    2. The `keytar` module, if the running app has installed it
    3. A simple, file-based `crypto` store, for all other cases

* *serviceClientId* - Provide a custom Azure AD client ID that will be used when presenting the end-user with the consent screen, during an interactive login. If unspecified, the "Microsoft Cross Platform CLI" identity will be used, which may be confusing. This is an advanced setting and should only be specified if you absolutely know what you're doing. Additionally, if this is set, then *serviceTenantId* must also be specified.

* *serviceTenantId* - The tenant ID associated with the *serviceClientId*, which allows customizing the identity that is displayed when the end-user is doing an interactive login.

* *serviceName* - Provide a custom service name that will be included in the User Agent string for tracking. Defaults to `az-login`.

* *subscriptionId* - The ID of the subscription that should be auto-selected for managing the Azure account. Setting this "disables" the logic for attempting to resolve a subscription ID automatically and/or prompting the user for a selection.

* *suppressBrowser* - Specifies whether to disable automatically launching the end-user's default browser when performing an interactive login. Defaults to `false`.

* *tenantId* - The ID of the Azure Active Directory (AAD) tenant that the specified service principal is defined within.

#### LoginResult

After the authentication process is successfully completed, the `Promise` returned by the `login` method will resolve with an object that includes the following properties:

* *accessToken* - A "raw" access token that can be added to REST API calls directly (via the `Authorization: Bearer` header) to Azure and/or Kudu (the App Service "control plane"). This is only for advanced use cases, and unless you have a good reason to, you should likely use the `credentials` and/or `clientFactory` instead.

* *clientFactory* - A function that can be used to instantiate Azure client SDKs (e.g. `ResourceManagementClient`). This can be used to create the APIs you need, without dealing with the `credentials` or `subscriptionId` values "manually", and therefore, helps simplify your usage of Azure even further. See the [Getting Started](#getting-started) section for a sample of how this is used.

    ```javascript
    clientFactory<T>(azureClientConstructor: (credentials, subscriptionId): T): T
    ```

* *credentials* - Provides the opaque credentials object that represents a succesful authentication session, and can be provided directly to any management client constructor within the Azure SDK (along with the `subscriptionId`). The following sample illustrates what it looks like when not using the `clientFactory`:

    ```javascript
    const { login } = require("az-login");
    const { ResourceManagementClient } = require("azure-arm-resource");

    const { credentials, subscriptionId } = await login();
    const { resourceGroups } = new ResourceManagementClient(credentials, subscriptionId);

    const result = await resourceGroups.createOrUpdate("MyResourceGroup", { location: "WestUS" });
    ```

* *subscriptionId* - The ID of the subscription that has been selected for this account as part of the login process. This value can be provided directly to any management client constructor within the Azure SDK, which will dictate which subscription (if the authenticated account has more than one) will be the target of any management operations (e.g. create a resource group). See the documentation above for the `credentials` value, to see how this is used.

### logout

```javascript
logout(): Promise<boolean>
```

The `logout` method simply deletes the service principal identity that is persisted to disk after a successful call to `login`. If you explicitly create and specify a custom service prinicipal (via `login` args or env vars), then calling `logout` will simply no-op (but won't fail), since the corresponding call to `login` didn't actually create/persist a service prinicpal that needs to be removed.