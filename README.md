# Az.js CLI

Az.js is a command line tool which attempts to provide an opinionated (and hopefully simpler!) developer experience for deploying and managing Node.js based apps running on Azure. It is meant to experiment/play around with ideas to reduce the barrier of entry to cloud development, and therefore, is a compliment to the already awesome [Azure CLI 2.0](github.com/azure/azure-cli) (which supports a significantly richer set of scenarios and capabilities).

This CLI is very much inspired by the amazing work done by other tools such as [Docker](http://www.docker.com), [Now](http://zeit.co/now) and [Serverless](http://serverless.com), which are making great strides in the pursuit of simplicity, and are great benchmarks for what CLI-driven workflows can and should look like moving forward.

<img src="https://cloud.githubusercontent.com/assets/116461/24375545/87aedc0e-12ed-11e7-93c7-f9e6afcc1a0e.png" width="500px" />

## Getting Started

The Az.js CLI is built using [Node.js](https://nodejs.org/en/) and distributed via NPM, and therefore, you'll need to have both installed on your development machine before you can get started. Additionally, Az.js requires Node.js v6.9.0 or greater (which you should be using anyways!), so if you have an older version installed, please update it before moving on.

> If you aren't already using a Node.js version manager, I would recommend using one, as they can help make it dramatically simpler to updgrade and toggle between Node.js versions. I prefer [NVS](github.com/jasongin/nvs) since it is cross platform (it runs on Windows, macOS and Linux), but there are other great ones available as well (e.g. [NVM](https://github.com/creationix/nvm)).

In order to install Az.js, simply run the following NPM command, which will make the `azjs` command globally available:

```shell
npm i -g azjs
```

Currently, the Az.js CLI doesn't provide a mechanism for authenticating with your Azure account (coming soon!), but rather, expects to find "service principal" credentials (which is a means for headless/automated tools to manage your Azure account on your behalf) via the following environment variables:

* **azureSubId** - The ID of the Azure subscription that you'd like to manage resources within
* **azureServicePrincipalClientId** - The name of the service principal
* **azureServicePrincipalPassword** - The password of the service principal
* **azureServicePrincipalTenantId** - The ID of the tenant that the service principal was created in

> These are the same environment variables that are expected from the [Serverless](http://serverless.com) experience for Azure Functions. However, other tools such as Terraform use different names for these variables, so I'll be updating them to support both naming conventions.

Once that is done, simply CD into a directory that contains a Node.js app and run the following command:

```shell
azjs
```

This will provision the neccessary infrastructure in your Azure account (using the provided service principal credentials), deploy your app and then begin streaming stdout to your terminal. Additionally, it copied the URL of the deployed app to your clipboard, so feel free to open a browse, paste in the URL and browse to your app!



When you're done, you can confidently remove all of your Azure resources (to prevent incurring any unexpected charges) by CDing into the directory again and running the following command:

```shell
azjs down
```

This will delete all of the infrastructure that was originally provisioned by running `azjs`.

## CLI Reference

### azjs / azjs up / azjs deploy

> This command is also aliased as `azjs deploy` in order to support users of the Serverless CLI, who may find that naming convention more familiar.

### azjs browse

While running `azjs` will copy your app's URL to the clipboard, if you'd like to automatically have it launch a your default browser, and navigate to your app's deployed URL, you can simply run the following command at any time:

```shell
azjs browse
```

### azjs down / remove

When you no longer need an app deployed in Azure, you can quickly delete all of its backing resources by running the following command:

```shell
azjs down
```

> This command is also aliased as `azjs remove` in order to support users of the Serverless CLI, who may find that naming convention more familiar.

### azjs logs

While running `azjs` will automatically begin streaming your app's stdout after deployment, if you'd like to re-open the log stream at any other time (e.g. you'd like to view the logs for an already deployed version of your app), you can simply run the following command:

```shell
azjs browse
```