# Azure Web Apps Kudu Client (az-kudu)

The `az-kudu` module provides a simple client for interacting with the [Kudu API](https://github.com/projectkudu/kudu/wiki), which you can conceptually think of as the "management plane" of Azure Web Apps. It allows you to programmatically perform common operations such as uploading/downloading files, running remote commands, and streaming the output logs for a specific Azure Web App instance (kind of like a PaaS equivalent of SSH/SCP). It is meant to be used along with the [`az-login`](https://github.com/lostintangent/az-login) module, which handles the Azure authentication process, and allows instantianting `az-kudu` instances just like any other client API in the [Azure Node.js SDK](https://github.com/Azure/azure-sdk-for-node).

## Pre-requisites

* [Node.js](https://nodejs.org/en/) v6.9.0+ (which is the current LTS release, and you should be using anyways!)
* [az-login](https://github.com/lostintangent/az-login), which you can install by simply running `npm i az-login`

## Getting Started

In order to install the `az-kudu` module, simply run the following command within your app's directory:

```shell
npm i --save az-kudu
```

> Note: If you're using NPM 5+, you can omit the `--save` flag, since installed dependencies are automatically saved!

From within your app code, import the `az-kudu` module, and pass it (along with the name of the web app that you wish to manage) to the `clientFactory` method that is returned after logging in with `az-login`:

```javascript
const kudu = require("az-kudu");
const { login } = require("az-login");

const { clientFactory } = await login();
const kuduClient = clientFactory(kudu, "web-app-name");
```

Use the client to perform management operations, such as running a remote command within the context of the specified web app instance:

```javascript
const response = await kuduClient.runCommand("npm install -g gulp");
```

And that's it! For more details on what capabilities are available from the Kudu client, refer to the API reference section below.

## API Reference

The `az-kudu` module exports a single object, which represents the factory method for creating client instances (as illustrated in the [`Getting Started`](#getting-started) section). Once constructed via the `clientFactory`, the returned client object has the following methods:

## deleteFile

```javascript
deleteFile(filePath: string): Promise<void>
```

Deletes a remote file within the currently deployed Web App instance. The specified `filePath` is relative to the app's root directory (e.g. `server.js` as oppposed to `D:\site\wwwroot\server.js`), which allows clients to ignore the filesystem specifics of the Linux and/or Windows Web Apps runtime environment.

The returned `Promise` will resolve if the file was successfully deleted. Otherwise, it will be rejected with the appropriate error message.

## getFileContents

```javascript
getFileContents(filePath: string): Promise<string>
```

Returns the contents of a remote file, as it exists in the currently deployed Web App instance (as opposed to on your local machine, in source control, etc.). The specified `filePath` is relative to the app's root directory (e.g. `server.js` as oppposed to `D:\site\wwwroot\server.js`), which allows clients to ignore the filesystem specifics of the Linux and/or Windows Web Apps runtime environment.

If the specified value exists on the server, then the returned `Promise` will resolve to a `string` whose value is its contents. Otherwise, the `Promise` will be rejected.

## openLogStream

```javascript
openLogStream(): stream.Readable
```

Returns a [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable) which provides real-time access to the Web App instance's `stdout` stream.

## runCommand

```javascript
runCommand(command: string, cwd?: string): Promise<string>
```

Executes a shell command within the context of the remote Web App environment (e.g. the hosting VM). By default, the specified command will be executed within the app's root directory, however, you can customize this behavior by setting the optional `cwd` argument (e.g. in order to run `ls` in a sub-directory of the app).

If the command executes successfully (i.e. it exits with a status code of `0`), then the returned `Promise` will resolve to the contents of the command's `stdout` stream. Otherwise, the `Promise` will be rejected with the failure reason (e.g. the specified command doesn't exist).

> Note: The output of the specified shell command is buffered on the server, as opposed to streamed.

## uploadDirectory

```javascript
uploadZip(directory: string = process.cwd(), remoteDirectory?: string): Promise<void>
```

Uploads to the contents of a local directory to the remote Web App instance. By default, the `directory` will zip up the contents of the `cwd` and upload it to the root of the Web App. However, both the local and remote directories can be customized (e.g. in order to upload an arbitrary directory to an arbitrary location on your Web App's filesystem).

The returned `Promise` is resolved/rejected based on the success of the upload operation.

## uploadZipFile

```javascript
uploadZip(zipFilePath, remoteDirectory?: string): Promise<void>
```

Similar to the `uploadDirectory` method, however, instead of zipping up a directory for you, this method allows you to upload an existing zip file to your remote Web App instance (e.g. because you generated it via other means).