const azureRest = require("ms-rest-azure");
const fs = require("fs");
const fse = require("fs-extra");
const nameGenerator = require("project-name-generator");
const opn = require("opn");
const os = require("os");
const path = require("path");
const request = require("request");
const resourceClient = require("azure-arm-resource");
const websiteClient = require("azure-arm-website")
const zipFolder = require("zip-folder");
const getUrls = require("get-urls");
const SettingsManager = require("../util/SettingsManager");
const { execSync } = require("child_process");
const { exit, green, handle, log } = require("../util");
const { login } = require("./Authentication");
const { Spinner} = require("cli-spinner");

// TODO: Stream the build logs to the CLI
// TODO: Detect Node.js version
// TODO: Add support for adding custom Node CLI flags
// TODO: Add support for deploying from a non-master GitHub branch
// TODO: Pivot logging behind verbosity flag (add -q flag?)
// TODO: Allow customizing app name
// TODO: Short-circuit some of the deployment work in update scenarios, to improve perf
// TODO: Add TTY checks and prompt when we can't determine deployment type deterministically

const BOOTSTRAP_FILE_NAME = "AzjsBootstrap.js";
const GIT_REMOTE_NAME = "azure";

module.exports = class AzureClient {
    async addGitRemote() {
        const url = await this.getGitRemote();
        const repoMessage = `Configure your remotes as desired using the following URL: ${url}`;

        try {
            execSync("git rev-parse --is-inside-work-tree");
        } catch (error) {
            log(green`A Git remote couldn't be added because the CWD isn't a Git repo. ${repoMessage}`);
            return;
        }

        try {
            execSync(`git remote add ${GIT_REMOTE_NAME} '${url}'`);
           
            console.log( green`${"\u2713"} ` + green`Added Git remote: ${GIT_REMOTE_NAME}`);
        } catch (error) {
            log(green`A ${GIT_REMOTE_NAME} Git remote already exists. ${repoMessage}`);
        }
    }

    async createResourceGroup() {
        return new Promise((resolve, reject) => {
            this.client.resourceGroups.createOrUpdate(this.resourceGroup, { location: this.location }, handle(resolve, reject));
        });
    }

    async createWebApp(enableGit, remoteRepoUrl) {
        // TODO: This code is pretty nasty right now, so
        // it needs to be refactored for clarity/maintainability.
        const spinner = new Spinner(green`Creating web app: ${this.appName}`);
        spinner.setSpinnerString(18);
        spinner.start();
        
        let scmType = "None";
        if (enableGit && !remoteRepoUrl) {
            scmType = "LocalGit";
        }

        // TODO: Figure out how to merge these two ARM templates and/or 
        // just use the Azure SDK instead of a template.
        let templateFile = remoteRepoUrl ? "gitTemplate.json" : "template.json";

        const parameters = {
            webAppName: {
                value: this.appName
            }
        };

        if (remoteRepoUrl) {
            parameters.gitUrl = {
                value: remoteRepoUrl
            }
        } else {
            parameters.scmType = {
                value: scmType
            };
        }

        const deploymentName = `${this.resourceGroup}-${Math.random()}`;
        const deploymentParameters = {
            properties: {
                template: JSON.parse(fs.readFileSync(path.join(__dirname, templateFile), "utf8")),                
                mode: "Incremental",
                parameters
            }
        };

        return new Promise((resolve, reject) => {
            this.client.deployments.createOrUpdate(this.resourceGroup, deploymentName, deploymentParameters, (error) => {
                resolve(this.appUrl);
                spinner.stop(true);

                // Create new-line
                console.log(green`${"\u2713"} ` + green`Created web app: ${this.appName}`);
            });
        });
    }

    async createWebConfig() {
        const startFile = await this.getStartFile();
        const bootstrap = fs.readFileSync(path.join(__dirname, BOOTSTRAP_FILE_NAME), "utf8")
                            .replace(/\{\{STARTUP_FILE\}\}/g, startFile);

        fs.writeFileSync(path.join(process.cwd(), BOOTSTRAP_FILE_NAME), bootstrap, "utf8");
        fse.copySync(path.join(__dirname, "web.config"), path.join(process.cwd(), "web.config"));
    }

    async deleteResourceGroup() {
        const spinner = new Spinner(green`Deleting app: ${this.appName}`);
        spinner.setSpinnerString(18);
        spinner.start();

        return new Promise((resolve, reject) => {
            this.client.resourceGroups.deleteMethod(this.resourceGroup, () => {
                SettingsManager.clear();
                spinner.stop(true);
                console.log(green`${"\u2713"} ` + green`Deleted app: ${this.appName}`)
                resolve();
            });
        });
    }

    async deploy() {
        const spinner = new Spinner("Deploying code");
        spinner.setSpinnerString(18);
        spinner.start();

        await this.createWebConfig();

        const zipFile = path.join(process.cwd(), `${this.appName}.zip`);
        return new Promise((resolve, reject) => {
            zipFolder(process.cwd(), zipFile, () => {
                fs.createReadStream(zipFile).pipe(this.request.put(`${this.kuduUrl}/zip/site/wwwroot/`, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        fs.unlinkSync(zipFile);
                        fs.unlinkSync(path.join(process.cwd(), "web.config"));
                        fs.unlinkSync(path.join(process.cwd(), BOOTSTRAP_FILE_NAME));
                        
                        spinner.stop(true);
                        console.log(green`${"\u2713"} ` + "Deployed code");
                        resolve();
                    }
                }));
            });
        });
    }

    async exportResourceGroup() {
        return new Promise((resolve, reject) => {
            this.client.resourceGroups.exportTemplate(this.resourceGroup, { resources: ["*"] }, (error, result) => {
                resolve(result.template);
            });
        });
    }

    async getGitRemote() {
        return new Promise((resolve, reject) => {
            this.appClient.sites.listSitePublishingCredentials(this.resourceGroup, this.appName, null, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.scmUri);
                }
            });
        });
    }

    async getStartFile() {
        return new Promise((resolve, reject) => {
            try {      
                const startFile = require(path.join(process.cwd(), "package.json")).scripts.start.replace("node ", "");
                console.log(green`${"\u2713"} ` + green`Set app start file: ${startFile}`);
                resolve(startFile);
            } catch (error) {
                ["server.js", "app.js", "index.js"].forEach((fileName) => {
                    if (fs.existsSync(path.join(process.cwd(), fileName))) {
                        console.log(green`${"\u2713"} ` + green`Set app start file: ${fileName}`);
                        resolve(fileName);
                    }
                });

                reject(new Error("No start file found"));
            }
        });
    }

    async initAppSettings(subscriptionId) {
        // TODO: Fix this to 
        this.location = process.env.AZURE_LOCATION || "WestUS";
        this.subscriptionId = subscriptionId;
        
        const settings = new SettingsManager();
        this.insightsName = settings.insightsName;
        this.appName = settings.appName;
        this.resourceGroup = settings.resourceGroupName;

        this.appUrl = `https://${this.appName}.azurewebsites.net`;
        this.kuduUrl = `https://${this.appName}.scm.azurewebsites.net/api`;
    }

    async installDependencies() {
        const spinner = new Spinner("Installing NPM dependencies");
        spinner.setSpinnerString(18);
        spinner.start();

        return new Promise((resolve, reject) => {
            const options = {
                url: `${this.kuduUrl}/command`, 
                json: true,                     
                body: {
                    command: "npm install --production",
                    dir: 'site\\wwwroot'
                }
            };

            this.request.post(options, () => {
                spinner.stop(true);
                console.log(green`${"\u2713"} ` + "Installed NPM dependencies")
                resolve();
            });
        });
    }

    async installAppInsights() {
        return new Promise((resolve, reject) => {
            const options = {
                url: `${this.kuduUrl}/command`, 
                json: true,                     
                body: {
                    command: "npm install applicationinsights",
                    dir: 'site\\wwwroot'
                }
            };

            this.request.post(options, handle(resolve, reject));
        });
    }

    async login() {
        const { accessToken, credentials, subscriptionId } = await login();

        this.client = new resourceClient.ResourceManagementClient(credentials, subscriptionId);  
        this.appClient = new websiteClient(credentials, subscriptionId);

        this.request = request.defaults({
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        this.initAppSettings(subscriptionId);   
    }

    async launchApp() {
        console.log(green`${"\u2713"} ` + green`Launching ${this.appUrl}`);
        opn(this.appUrl, { wait: false });
    }

    async openLogStream() {
        console.log(green`${"\u2713"} ` + green`Starting log stream. Press ${"CTRL+C"} to exit\n`);
        
        this.request(`${this.kuduUrl}/logstream`)
            .pipe(process.stdout);
    }
    
    async syncLocalRepo() {
        const spinner = new Spinner("Syncing local Git repo");
        spinner.setSpinnerString(18);
        spinner.start();

        execSync(`git push ${GIT_REMOTE_NAME} master`);

        spinner.stop(true);
        console.log(green`${"\u2713"} ` + green`Synced local Git repo`);
    }

    async syncRemoteRepo() {
        const spinner = new Spinner("Syncing Git repo");
        spinner.setSpinnerString(18);
        spinner.start();

        return new Promise((resolve, reject) => {
            this.appClient.sites.syncSiteRepository(this.resourceGroup, this.appName, null, () => {
                spinner.stop(true);
                console.log(green`${"\u2713"} ` + green`Synced local Git repo`);
                resolve();
            });
        });
    }
};