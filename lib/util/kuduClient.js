const ROOT_DIRECTORY = "site/wwwroot";

module.exports = class KuduClient {
    constructor(webAppName, request) {
        this.kuduApiUrl = `https://${webAppName}.scm.azurewebsites.net/api`; 
        this.request = request;
    }

    deleteFile(fileName, directory = ROOT_DIRECTORY) {
        return new Promise((resolve, reject) => {
            this.request.delete(`${this.kuduApiUrl}/vfs/${directory}/${fileName}`, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    getFileContents(filePath, directory = ROOT_DIRECTORY) {
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

            this.request.post(options, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    uploadZip(directory = process.cwd(), remoteDirectory = ROOT_DIRECTORY) {
        return new Promise((resolve, reject) => {
            const archive = require("archiver")("zip");          
            archive.pipe(this.request.put(`${this.kuduApiUrl}/zip/${remoteDirectory}/`, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }));
            archive.glob("**/*", { ignore: "node_modules{,/**}" }).finalize();
        });
    }
};