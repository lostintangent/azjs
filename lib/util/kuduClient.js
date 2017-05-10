const fs = require("fs");
const path = require("path");

module.exports = class KuduClient {
    constructor(webAppName, request) {
        this.kuduApiUrl = `https://${webAppName}.scm.azurewebsites.net/api`; 
        this.request = request;
    }

    deleteFile(fileName, directory = "site/wwwroot") {
        return new Promise((resolve, reject) => {
            this.request.delete(`${this.kuduUrl}/vfs/${directory}/${fileName}`, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    getFileContents(filePath, directory = "site/wwwroot") {
        return new Promise((resolve, reject) => {
            this.request(`${this.kuduApiUrl}/vfs/${directory}/${filePath}`, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    openLogStream() {
        return this.request(`${this.kuduApiUrl}/logstream`);
    }

    runCommand(command, cwd = "site\\wwwroot") {
        return new Promise((resolve, reject) => {
            const options = {
                url: `${this.kuduApiUrl}/command`, 
                json: true,                     
                body: {
                    command,
                    dir: cwd
                }
            };

            this.request.post(options, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    uploadZip(directory = process.cwd(), remoteDirectory = "site/wwwroot") {
        const uuid = require("uuid/v1");
        const zipFolder = require("zip-folder");

        const zipFileName = `${uuid()}.zip`;
        const zipFile = path.join(directory, zipFileName);

        return new Promise((resolve, reject) => {
            zipFolder(directory, zipFile, () => {
                fs.createReadStream(zipFile).pipe(this.request.put(`${this.kuduApiUrl}/zip/${remoteDirectory}/`, (error) => {
                    fs.unlinkSync(zipFile);

                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                }));
            });
        });
    }
};