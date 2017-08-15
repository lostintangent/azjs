// This is the default directory that your app is
// stored in for both Windows and Linux Web Apps.
const ROOT_DIRECTORY = "site/wwwroot";

function normalizePath(path) {
  // Strip off a leading slash, since we
  // already add it to the URL when requesting the list.
  if (path.startsWith("/")) {
    path = path.substring(1);
  }

  // If the specified directory isn't rooted within
  // the app directory, then append it
  if (!path.startsWith(ROOT_DIRECTORY)) {
    path = `${ROOT_DIRECTORY}/${path}`;
  }

  return path;
}

module.exports = class KuduClient {
  // This constructor conforms to the signature that all Azure Node.js
  // SDK clients accept, in order to be instantiatable via az-login
  constructor(credentials, subscriptionId, webAppName) {
    this._accessToken = credentials.tokenCache._entries[0].accessToken;
    this._kuduApiUrl = `https://${webAppName}.scm.azurewebsites.net/api`;
  }

  // This method is called by az-login in order to set the right user agent
  // string on all network requests, so we also use it to "hook" the initialization
  // of the underlying network clients, with the user's access token.
  addUserAgentInfo(userAgent) {
    const defaults = {
      headers: {
        Authorization: `Bearer ${this._accessToken}`,
        "User-Agent": userAgent
      }
    };

    this._requestPromise = require("request-promise-native").defaults(defaults);
    this._requestStream = require("request").defaults(defaults);
  }

  createDirectory(path) {
    return this._requestPromise.put(
      `${this._kuduApiUrl}/vfs/${noramlizePath(path)}/`
    );
  }

  deleteDirectory(path) {
    return this._requestPromise.delete(
      `${this._kuduApiUrl}/vfs/${normalizePath(path)}/`,
      {
        headers: {
          "If-Match": "*"
        }
      }
    );
  }

  deleteFile(path) {
    return this._requestPromise.delete(
      `${this._kuduApiUrl}/vfs/${normalizePath(path)}`,
      {
        headers: {
          "If-Match": "*"
        }
      }
    );
  }

  getFileContents(path) {
    return this._requestPromise(
      `${this._kuduApiUrl}/vfs/${normalizePath(path)}`
    );
  }

  listDirectory(path = ROOT_DIRECTORY) {
    return this._requestPromise.get(
      `${this._kuduApiUrl}/vfs/${normalizePath(path)}`,
      { json: true }
    );
  }

  openLogStream() {
    return this._requestStream(`${this._kuduApiUrl}/logstream`);
  }

  runCommand(command, cwd = "site\\wwwroot") {
    return this._requestPromise
      .post({
        url: `${this._kuduApiUrl}/command`,
        json: true,
        body: {
          command,
          dir: cwd
        }
      })
      .then(({ Error: error, ExitCode, Output }) => {
        if (ExitCode > 0) {
          throw new Error(error);
        }

        return Output;
      });
  }

  uploadDirectory(directory = process.cwd(), remoteDirectory = ROOT_DIRECTORY) {
    return new Promise((resolve, reject) => {
      const archive = require("archiver")("zip");
      archive.pipe(
        this._requestStream.put(
          `${this._kuduApiUrl}/zip/${remoteDirectory}/`,
          error => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          }
        )
      );
      archive
        .glob("**/*", { dot: true, ignore: "node_modules{,/**}" })
        .finalize();
    });
  }

  uploadZipFile(zipFilePath, remoteDirectory = ROOT_DIRECTORY) {
    return new Promise((resolve, reject) => {
      require("fs").createReadStream(zipFilePath).pipe(
        this._requestStream.put(
          `${this._kuduApiUrl}/zip/${remoteDirectory}/`,
          error => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          }
        )
      );
    });
  }
};
