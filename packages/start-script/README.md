## Start Script

This is a simple helper utility that allows you to auto-detect the startup script that an app expects to be run with (e.g. `npm start`, `node server.js`). This is mostly useful for tools that need to be able to run/manage other Node.js apps (e.g. [`Az.js`](https://github.com/lostintangent/azjs)), and don't want to duplicate/maintain the same logic (despite being pretty simple!).

## Pre-requisites

* [Node.js](https://nodejs.org/en/) v6.9.0+ (which is the current LTS release, and you should be using anyways!)

# Getting Started

In order to install the `start-script` module, simply run the following command within your app's directory:

```shell
npm install --save start-script
```

From within your app code, import the `start-script` module, and execute the returned function in order to retrieve the start script (e.g. `app.js`) for the specified application directory (defaults to `process.cwd()`):

```javascript
const startScript = require("start-script")();

// Fork a new Node.js process using the detected script...
```

## API Reference

The `start-script` module exports a single function, which has the following signature/behavior:

```javascript
startScript(appDirectory: string = process.cwd()): string
```

When called, the following heuristic will attempt to auto-detect the specific app's startup script:

1. Does the app have a `package.json` file, with a `scripts.start` member? If so, return the `*.js` file name that is specified.

2. Does the app have one of the following scripts (in order)? If so, return that: `server.js`, `app.js`, `index.js`.

Otherwise, it will return `null`, which indicates that a start script couldn't be auto-detected.