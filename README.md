# Az.js CLI

[![Greenkeeper badge](https://badges.greenkeeper.io/lostintangent/azjs.svg)](https://greenkeeper.io/)

Az.js is a command line tool which attempts to provide an opinionated (and hopefully simpler!) developer experience for deploying and managing Node.js apps on Azure. It is meant to experiment/play around with ideas to reduce the barrier of entry to cloud development, and therefore, is a compliment to the already awesome [Azure CLI 2.0](http://github.com/azure/azure-cli) (which supports a significantly richer set of scenarios and capabilities).

This CLI is very much inspired by the amazing work done by other tools such as [Docker](http://www.docker.com), [Now](http://zeit.co/now) and [Serverless](http://serverless.com), which are making great strides in the pursuit of simplicity, and are benchmarks for what CLI-driven workflows can and should look like moving forward.

<img src="https://cloud.githubusercontent.com/assets/116461/25299168/31e0a546-26b1-11e7-9f09-a8acffdfdffe.png" width="545px" />

## Pre-requisites

* [Node.js](https://nodejs.org/en/) v6.9.0+, and the platform-specific tools needed to compile native NPM modules *(which you may already have)*:
    * Windows - Run the following in an elevated prompt (`cmd.exe` or PowerShell): `npm i -g windows-build-tools`
    * Ubuntu - Run `sudo apt-get install build-essential`
    * macOS - Install Xcode
* Azure account ([start a free trial with a $200 credit!](https://azure.microsoft.com/en-us/free))

## Getting Started

In order to install the Az.js CLI, simply run the following NPM command, which will add the `azjs` command to your `PATH`:

```shell
npm i -g azjs
```

Then, simply CD into a directory that contains a Node.js app and run the following command:

```shell
azjs deploy
```

You will be asked to login to your Azure account, and authorize `azjs` to manage Azure resources on your behalf (e.g. create web apps). Paste the provided "device code" into the launched browser (it is automatically copied to your clipboard), complete the authentication process, and then return to your terminal, which will begin progressing with the deployment momentarily.

> Note: Once you're successfully authenticated, all subsequent CLI commands will re-use this same login session, which prevents you from needing to re-authenticate every time you'd like to deploy changes to your app.

As soon as the deploymented is finished, the terminal will begin streaming your app's stdout, and will display the URL you can use to immediately browse/test your deployed app.

<img src="https://cloud.githubusercontent.com/assets/116461/25141329/1b7dfeca-2418-11e7-9920-bf07cc051eda.png" width="600" />

If your app uses MongoDB as its backing database (as many Node apps do!), and you'd like to provision a fully-managed, geo-replicable instance, you can simply run the following command in order to spin one up and inject it's connection string into your app via an environment variable named `MONGODB_URL` (view [reference below](#azjs-service) for more details of how this works):

```shell
azjs service create -t mongodb
```

<img src="https://cloud.githubusercontent.com/assets/116461/25141537/a8c42e08-2418-11e7-9c01-5330554afbaa.png" width="700" />

> Note: In order to see all of the service types that are supported, run `azjs service create -h` to see the options that the `-t` flag accepts (e.g. Redis)

After your app has been running for a while, and you'd like to check it's telemetry and health, you can simply run the following command:

```shell
azjs monitor
```

This will launch your browser, and navigate you directly to the telemetry dashboard for your app, within the Azure portal. From here, you can inspect your HTTP traffic, exceptions, performance metrics, etc. You can also configure alerts, so that you can be notified of interesting events in the future, which justify further investigation.

<img src="https://cloud.githubusercontent.com/assets/116461/24817224/4b8158bc-1ba1-11e7-9ae0-44b2b7522c03.png" width="600" />

> Note: This monitoring support is provided by means of Application Insights, which you can find more information about [here](https://azure.microsoft.com/en-us/services/application-insights/).

If at some point you no longer need your app to be deployed on Azure, you can confidently remove all of your Azure resources (to prevent incurring any unexpected charges) by CDing into the app directory again and simply running the following command:

```shell
azjs remove
```

This will delete all of the infrastructure that was originally provisioned by running `azjs`. This way, Az.js has a zero-imapct effect on your Azure account, unless you want it to.

<img src="https://cloud.githubusercontent.com/assets/116461/24817537/76d3c616-1ba2-11e7-8928-ed5fb8c055a5.png" width="225" />

## CLI Command Reference

* [Browse](#azjs-browse)
* [Cat](#azjs-cat)
* [Deploy](#azjs-deploy)
* [Exec](#azjs-exec)
* [Export](#azjs-export)
* [Logs](#azjs-logs)
* [Logpoint](#azjs-logpoint)
    * [Add](#azjs-logpoint-add)
    * [Clear](#azjs-logpoint-clear)
* [Monitor](#azjs-monitor)
* [Portal](#azjs-portal)
* [Remove](#azjs-remove)
* [Restart](#azjs-restart)
* [Service](#azjs-service)
    * [Create](#azjs-service-create)
    * [Remove](#azjs-service-remove)

### azjs browse

If at any point you'd like to launch the latest deployment of your app, in your default browser, simply run the following command:

```shell
azjs browse
```

### azjs cat

View the contents of a file on the remote server. This is useful if you'd like to set a [logpoint](#azjs-logpoint-add) for diagnostic purposes, but you need to determine the exact line number in a file you're interested in.

```shell
azjs cat -f app/routes.js
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

### azjs exec

While `azjs` provides numerous first-class commands for running specific operations (e.g. reading a remote file), there may be times where you want to execute an arbitrary shell command against the remote web app. To do this, you can simply run the following command:

```shell
azjs exec -c 'npm i -g gulp'
```

If the command exits with a 0 status code, then its stdout will be printed to the terminal. Otherwise, it's stderr will be printed, so you can identify what went wrong.

### azjs export

While Az.js supports lots of app development workflows, there may be times where you'd like to "pierce the viel" of abstraction that it provides, and manage your app using other means. In order to ensure that any work you've done with Az.js isn't lost, you can run the following command, which will export the Azure deployment script needed to re-deploy it to another account and/or resource group at any time:

```shell
azjs export
```

By default, this command will output an ARM template to stdout, but if you'd like to explicitly write it to a file (as opposed to piping it), you can also specify a file name to write to, like so:

```shell
azhs export -f myApp.json
```

### azjs logs

While running `azjs deploy` and/or `azjs browse` will automatically begin streaming your app's stdout for you, if you'd like to re-open the log stream at any other time (e.g. you'd like to view the logs for an already deployed version of your app), you can simply run the following command:

```shell
azjs logs
```

### azjs logpoint

Allows managing the dynamic logpoints that allow diagnosing your app in production.

#### azjs logpoint add

If you forget to add a log statement to your app before deployment, you can dynamically add one by simply running the following command:

```shell
azjs logpoint add -f app/routes.js -l 22 -e req.path
```

Once defined, this logpoint will be outputted to your log stream (e.g. when runnin `azjs logs`) in the same way that any "statically" defined log statement would be.

#### azjs logpoint clear

Once you're finished with your logpoints, you can clear all of them by running the following command, which prevents your logs from being cluttered with unneccessary diagnostic messages:

```shell
azjs logpoint clear
```

### azjs monitor

When you deploy an app with Az.js, it automatically configures monitoring for you, so that you can view basic telemetry (e.g. HTTP traffic, exceptions) without needing to do anything. In order to view your telemetry dashboard, you can simply run the following command:

```shell
azjs monitor
```

### azjs portal

If you'd like to view and/or manage your web app within the Azure portal (or are just curious), you can break out of the Az.js abstraction by running the following command:

```shell
azjs portal
```

### azjs remove

When you no longer need an app deployed in Azure, you can quickly delete all of its backing resources by running the following command:

```shell
azjs remove
```

### azjs restart

If at any point, you'd like to restart the web app, in order to force changes to apply, you can simply run the following command:

```shell
azjs restart
```

### azjs service

Allows managing the external services that your app uses (e.g. MongoDB, Redis)

#### azjs service create

Provisions a new instance of a specific service type (e.g. MongoDB, Redis) and "binds" it to your deployed web app. For example, to create a MongoDB database, simply run the following command:

```shell
azjs service create -t mongodb
```

This will create the MongoDB service, and then inject the connection string into your web app, via an environment variable named `MONGODB_URL`. Therefore, as long as your app expects to find it's MongoDB connection via an environment variable (as any good 12 Factor App should), then you shouldn't need to make any code changes in order to benefit from this command.

#### azjs service remove

Deletes a previously provisioned service and unbinds it from your web app (e.g. removes any injected environment variables).

## Authentication Reference

The `azjs` CLI defaults to using an interactive login experience, in order to provide a simple getting started experience. However, if you'd like to customize the exact credentials that `azjs` uses to manage your Azure account, you can specify a specific service principal to use for authentication, by setting the following four environment variables (using either of the listed aliases):

* **azureSubId / ARM_SUBSRIPTION_ID** - The ID of the Azure subscription that you'd like to manage resources within
* **azureServicePrincipalClientId / ARM_CLIENT_ID** - The name of the service principal
* **azureServicePrincipalPassword / ARM_CLIENT_SECRET** - The password of the service principal
* **azureServicePrincipalTenantId / ARM_TENANT_ID** - The ID of the tenant that the service principal was created in

> These are the same environment variables that are expected from the [Serverless](https://serverless.com/framework/docs/providers/azure/guide/credentials/) experience for Azure Functions (`azure*`), and the Terraform Azure builder (`ARM*`), so if you've already set these environment variables in order to use one or both of these tools, then `azjs` will automatically use the same credentials.