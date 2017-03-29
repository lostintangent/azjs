const azureRest = require("ms-rest-azure");
const fs = require("fs");
const fse = require("fs-extra");
const nameGenerator = require("project-name-generator");
const opn = require("opn");
const path = require("path");
const request = require("request");
const resourceClient = require("azure-arm-resource");
const websiteClient = require("azure-arm-website")
const zipFolder = require("zip-folder");

const SettingsManager = require("../SettingsManager");
const { copy } = require("copy-paste");
const { execSync } = require("child_process");
const { green, handle, log } = require("../utils");

// TODO: Provide a guided authentication experience
// TODO: Stream the build logs to the CLI
// TODO: Detect Node.js version
// TODO: Add support for adding custom Node CLI flags
// TODO: Add support for deploying from a non-master GitHub branch
// TODO: Pivot logging behind verbosity flag (add -q flag?)
// TODO: Convert ARM template usage to Node API instead
// TODO: Allow customizing app name
// TODO: Short-circuit some of the deployment work in update scenarios, to improve perf
// TODO: Add TTY checks and prompt when we can't determine deployment type deterministically
// TODO: Add support for renaming the the app/project

module.exports = class AzureClient {
    constructor() {
        this.subscriptionId = process.env.azureSubId;
        this.clientId = process.env.azureServicePrincipalClientId;
        this.clientSecret = process.env.azureServicePrincipalPassword;
        this.tenantId = process.env.azureServicePrincipalTenantId;
        this.location = process.env.AZURE_LOCATION || "WestUS";

        const settings = new SettingsManager();
        this.appName = settings.appName;
        this.resourceGroup = settings.resourceGroupName;

        this.appUrl = `https://${this.appName}.azurewebsites.net`;
        this.kuduUrl = `https://${this.appName}.scm.azurewebsites.net/api`;
    }

    async addGitRemote() {
        try {
            execSync("git rev-parse --is-inside-work-tree");
        } catch (error) {
            return;
        }

        log(green`Adding Git remote ${"azure"}`);
        
        // TODO: Add error checking here, in the event
        // that an "Azure" remote already exists.
        const url = await this.getGitRemote();
        execSync(`git remote add azure '${url}'`);
    }

    async createResourceGroup() {
        log(green`Creating resource group: ${this.resourceGroup}`);

        return new Promise((resolve, reject) => {
            this.client.resourceGroups.createOrUpdate(this.resourceGroup, { location: this.location }, handle(resolve, reject));
        });
    }

    async createWebApp(enableGit, remoteRepoUrl) {
        // TODO: This code is pretty nasty right now, so
        // it needs to be refactored for clarity/maintainability.
        log(green`Creating web app: ${this.appName}`);
        
        let scmType = "None";
        if (enableGit && remoteRepoUrl === undefined) {
            log("Setting up a local Git repo");
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
            this.client.deployments.createOrUpdate(this.resourceGroup, deploymentName, deploymentParameters, handle(resolve, reject));
        });
    }

    async createPM2Config() {
        log("Creating process.json...");

        const startFile = await this.getStartFile();
        const config = fs.readFileSync(path.join(__dirname, "process.json"), "utf8")
                         .replace(/\{\{STARTUP_FILE\}\}/g, startFile);
            
        fs.writeFileSync(path.join(process.cwd(), "process.json"), config, "utf8");
    }

    async createWebConfig() {
        log("Creating web.config...");

        const startFile = await this.getStartFile();
        const config = fs.readFileSync(path.join(__dirname, "web.config"), "utf8")
                         .replace(/\{\{STARTUP_FILE\}\}/g, startFile);
            
        fs.writeFileSync(path.join(process.cwd(), "web.config"), config, "utf8");
    }

    async deleteResourceGroup() {
        log(green`Deleting resource group: ${this.resourceGroup}`);

        return new Promise((resolve, reject) => {
            this.client.resourceGroups.deleteMethod(this.resourceGroup, handle(resolve, reject));
        });
    }

    async deploy() {
        await this.createWebConfig();

        log("Deploying code...");
        const zipFile = path.join(process.cwd(), `${this.appName}.zip`);
        return new Promise((resolve, reject) => {
            zipFolder(process.cwd(), zipFile, () => {
                fs.createReadStream(zipFile).pipe(this.request.put(`${this.kuduUrl}/zip/site/wwwroot/`, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        fs.unlinkSync(zipFile);
                        fs.unlinkSync(path.join(process.cwd(), "web.config"));
                        resolve();
                    }
                }));
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
                log(green`Setting app start file: ${startFile}`);
                resolve(startFile);
            } catch (error) {
                ["server.js", "app.js", "index.js"].forEach((fileName) => {
                    if (fs.existsSync(path.join(process.cwd(), fileName))) {
                        log(green`Setting app start file: ${fileName}`);
                        resolve(fileName);
                    }
                });

                reject(new Error("No start file found"));
            }
        });
    }

    async installDependencies() {
        log("Installing dependencies...");

        return new Promise((resolve, reject) => {
            const options = {
                url: `${this.kuduUrl}/command`, 
                json: true,                     
                body: {
                    command: "npm install --production",
                    dir: 'site\\wwwroot'
                }
            };

            this.request.post(options, handle(resolve, reject));
        });
    }

    async login() {
        log("Authenticating with Azure...");

        return new Promise((resolve, reject) => {
            azureRest.loginWithServicePrincipalSecret(this.clientId, this.clientSecret, this.tenantId, (error, credentials) => {
                if (error) {
                    reject(error);
                } else {
                    this.client = new resourceClient.ResourceManagementClient(credentials, this.subscriptionId);  
                    this.appClient = new websiteClient(credentials, this.subscriptionId);
        
                    this.request = request.defaults({
                        headers: {
                            Authorization: `Bearer ${credentials.tokenCache._entries[0].accessToken}`
                        }
                    });

                    resolve();
                }
            });
        });
    }

    async launchApp() {
        log(green`Launching browser to ${this.appUrl}...`);
        opn(this.appUrl);
    }

    async openLogStream() {
        await new Promise((resolve) => {
            copy(this.appUrl, resolve);
        });

        log(green`App deployed to ${this.appUrl} (it's copied to your clipboard!)`);
        log(green`Initializing log stream. Press ${"CTRL+C"} to exit...`);
        
        this.request(`${this.kuduUrl}/logstream`)
            .pipe(process.stdout);
    }

    async syncRemoteRepo() {
        log("Syncing Git repo");

        return new Promise((resolve, reject) => {
            this.appClient.sites.syncSiteRepository(this.resourceGroup, this.appName, null, handle(resolve, reject));
        });
    }
};