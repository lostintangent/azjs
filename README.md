# Az.js CLI

Az.js is a command line tool which attempts to provide an opinionated (and hopefully simpler!) developer experience for deploying and managing Node.js based apps running on Azure. It is meant to experiment/play around with ideas to reduce the barrier of entry to cloud development, and therefore, is a compliment to the already awesome [Azure CLI 2.0](http://github.com/azure/azure-cli) (which supports a significantly richer set of scenarios and capabilities).

This CLI is very much inspired by the amazing work done by other tools such as [Docker](http://www.docker.com), [Now](http://zeit.co/now) and [Serverless](http://serverless.com), which are making great strides in the pursuit of simplicity, and are benchmarks for what CLI-driven workflows can and should look like moving forward.

<img src="https://cloud.githubusercontent.com/assets/116461/24490140/129080e0-14d6-11e7-93b9-b5175c1e131f.png" width="500px" />

## Pre-requisites

* [Node.js](https://nodejs.org/en/) v7.6.0+
* NPM
* Active Azure account ([start a free trial with a $200 credit!](https://azure.microsoft.com/en-us/free))

## Getting Started

In order to install the Az.js CLI, simply run the following NPM command, which will add the `azjs` command to your `PATH`:

```shell
npm i -g azjs
```

Then, simply CD into a directory that contains a Node.js app and run the following command:

```shell
azjs deploy
```

You will be asked to login to your Azure account, and authorize `azjs` to manage Azure resources on your behalf (e.g. create web apps). Paste the provided "device code" into the launched browser (it is automatically copied to your clipboard), complete the authentication, and then return to your terminal, which will begin progressing with the deployment momentarily.

> Note: Once you're successfully authenticated, all subsequent CLI commands will re-use that same login session, so that you don't need to continue authenticating every time you'd like to deploy changes to your app.

As soon as the deploymented is finished, the terminal will begin streaming your app's stdout, and will display the URL you can use to immediately browse/test your deployed app.

<img width="643" alt="screen shot 2017-03-29 at 11 24 36 pm" src="https://cloud.githubusercontent.com/assets/116461/24490319/f76485e0-14d6-11e7-9e04-852af665d49a.png">

If you no longer need your app to be deployed on Azure, you can confidently remove all of your Azure resources (to prevent incurring any unexpected charges) by CDing into the app directory again and simply running the following command:

```shell
azjs remove
```

This will delete all of the infrastructure that was originally provisioned by running `azjs`.

## CLI Command Reference

* [Browse](#azjs-browse)
* [Deploy](#azjs-deploy)
* [Logs](#azjs-logs)
* [Remove](#azjs-remove)

### azjs browse

While running `azjs` will copy your app's URL to the clipboard, if you'd like to automatically have it launch a your default browser, and navigate to your app's deployed URL, you can simply run the following command at any time:

```shell
azjs browse
```

### azjs deploy

When you want to deploy a web app and/or push changes to an existing web app, you can quickly do this by CDing into your app directory and running the following command:

```shell
azjs deploy
```

This will zip up the contents of your web app and deploy them to Azure. It will then install your NPM dependencies, and begin displaying the log stream from your app's stdout.

#### Local Git Deployment

If you'd like to track your app via a local Git repo, and push changes to your web app as if it was another remote, then simply run the following command:

```shell
azjs deploy --git
```

This will behave exactly like the non-Git workflow, except it will also add a new Git remote to your repo called `azure` and then run a `git push` for you. If you'd like to suppress the automatic `git push`, simply pass the `--no-sync` flag, and do the push to the added `azure` remote as appropriate.

As you make changes to your app, you can simply run `git push azure master` in order to deploy them, as opposed to needing to run `azjs deploy` again.

#### Remote Git Deployment

If you're already tracking your app via a remote Git repo (e.g. GitHub), you can "connect" your web app to that by running the following command:

```shell
azjs deploy --git-url <GIT_REPO_URL>
```

This will behave similarly to the local Git deployment solution, however, instead of pushing changes directly to your web app, you would push changes to the specified Git repo, and allow the deployed web app to pull updates from it.

### azjs logs

While running `azjs` will automatically begin streaming your app's stdout after deployment, if you'd like to re-open the log stream at any other time (e.g. you'd like to view the logs for an already deployed version of your app), you can simply run the following command:

```shell
azjs logs
```

### azjs remove

When you no longer need an app deployed in Azure, you can quickly delete all of its backing resources by running the following command:

```shell
azjs remove
```

## Authentication Reference

The `azjs` CLI defaults to using an interactive login experience, in order to provide a simple getting started experience. However, if you'd like to customize the exact credentials that `azjs` uses to manage your Azure account, you can specify a specific service principal to use for authentication, by setting the following four environment variables (using either of the listed aliases):

* **azureSubId / ARM_SUBSRIPTION_ID** - The ID of the Azure subscription that you'd like to manage resources within
* **azureServicePrincipalClientId / ARM_CLIENT_ID** - The name of the service principal
* **azureServicePrincipalPassword / ARM_CLIENT_SECRET** - The password of the service principal
* **azureServicePrincipalTenantId / ARM_TENANT_ID** - The ID of the tenant that the service principal was created in

> These are the same environment variables that are expected from the [Serverless](https://serverless.com/framework/docs/providers/azure/guide/credentials/) experience for Azure Functions (`azure*`), and the Terraform Azure builder (`ARM*`), so if you've already set these environment variables in order to use one or both of these tools, then `azjs` will automatically use the same credentials.