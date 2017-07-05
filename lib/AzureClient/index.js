const fs = require("fs");
const fse = require("fs-extra");
const opn = require("opn");
const os = require("os");
const path = require("path");
const SettingsManager = require("../util/SettingsManager");
const { execSync } = require("child_process");
const { green, logCompletedOperation, runOperation } = require("../util");
const serviceManager = require("../services/serviceManager");

const BOOTSTRAP_FILE_NAME = "AzjsBootstrap.js";
const GIT_REMOTE_NAME = "azure";

module.exports = class AzureClient {
    addLogpoint(file, line, expression, linux = false) {
        const { escape } = require("querystring");
        const command = linux ? `node webSSHClient.js ${file} ${line} ${expression}` :
                                `curl -s "http://localhost:8967/add?file=${file}&line=${line}&expression=${escape(expression)}"`;

        return this.runRemoteCommand(command);
    }

    clearLogpoints() {
        return this.runRemoteCommand('curl -s "http://localhost:8967/clear"');
    }

    createService(type) {
        return runOperation({
            operation: () => this.serviceManager.create(type),
            inProgressMessage: `Creating ${type} service`,
            finishedMessage: `Created ${type} service`
        });
    }

    removeService(type) {
        return runOperation({
            operation: () => this.serviceManager.remove(type),
            inProgressMessage: `Deleting ${type} service`,
            finishedMessage: `Deleted ${type} service`
        });
    }

    createResourceGroup() {
        return runOperation({
            inProgressMessage: green`Creating project: ${this.appName}`,
            finishedMessage: green`Created project: ${this.appName}`,
            operation: () => this.client.resourceGroups.createOrUpdate(this.resourceGroup, { location: this.location })
        });
    }

    createWebApp(enableGit, remoteRepoUrl, linux) {
        return runOperation({
            inProgressMessage: green`Creating web app: ${this.appName}`,
            finishedMessage: green`Created web app: ${this.appName}`,
            operation: () => {
                let scmType = "None";
                if (enableGit && !remoteRepoUrl) {
                    scmType = "LocalGit";
                }

                // TODO: Figure out how to merge these two ARM templates and/or
                // just use the Azure SDK instead of a template.
                let templateFile = linux ? "linuxTemplate.json" : (remoteRepoUrl ? "gitTemplate.json" : "template.json");

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
                        template: JSON.parse(fs.readFileSync(path.join(__dirname, "templates", templateFile), "utf8")),
                        mode: "Incremental",
                        parameters
                    }
                };

                return this.client.deployments.createOrUpdate(this.resourceGroup, deploymentName, deploymentParameters).then(() => this.appUrl);
            }
        });
    }

    createConfig(linux) {
        return this.getStartFile().then((startFile) => {
            const bootstrap = fs.readFileSync(path.join(__dirname, "templates", BOOTSTRAP_FILE_NAME), "utf8")
                                .replace(/\{\{STARTUP_FILE\}\}/g, startFile);

            fs.writeFileSync(path.join(process.cwd(), BOOTSTRAP_FILE_NAME), bootstrap, "utf8");

            if (linux) {
                fse.copySync(path.join(__dirname, "templates", "process.json"), path.join(process.cwd(), "process.json"));
                fse.copySync(path.join(__dirname, "templates", "webSSHClient.js"), path.join(process.cwd(), "webSSHClient.js"));
            } else {
                fse.copySync(path.join(__dirname, "templates", "web.config"), path.join(process.cwd(), "web.config"));
            }

            return () => {
                if (linux) {
                    fs.unlinkSync(path.join(process.cwd(), "process.json"));
                    fs.unlinkSync(path.join(process.cwd(), "webSSHClient.js"));
                } else {
                    fs.unlinkSync(path.join(process.cwd(), "web.config"));
                }

                fs.unlinkSync(path.join(process.cwd(), BOOTSTRAP_FILE_NAME));
            }
        });
    }

    runRemoteCommand(command) {
        return this.kuduClient.runCommand(command);
    }

    deleteResourceGroup() {
        return runOperation({
            inProgressMessage: green`Deleting project ${this.appName}`,
            finishedMessage: green`Deleted project ${this.appName}`,
            operation: () => this.client.resourceGroups.deleteMethod(this.resourceGroup)
        });
    }

    buildApp(buildScript) {
        return runOperation({
            inProgressMessage: green`Running build script: ${buildScript}`,
            finishedMessage: green`Ran build script: ${buildScript}`,
            operation: () => this.runRemoteCommand("npm run build")
        });
    }

    deploy(linux) {
        return runOperation({
            inProgressMessage: "Deploying code",
            finishedMessage: "Deployed code",
            operation: () => {
                return this.createConfig(linux).then((clearConfig) => {
                    return this.kuduClient.uploadZip().then(clearConfig);
                });
            }
        });
    }

    getFileContents(filePath) {
        return this.kuduClient.getFileContents(filePath);
    }

    exportResourceGroup() {
        return this.client.resourceGroups.exportTemplate(this.resourceGroup, { resources: ["*"] })
                   .then(({ template }) => template);
    }

    getGitRemote() {
        return this.appClient.webApps.listPublishingCredentials(this.resourceGroup, this.appName).then(({ publishingUserName, publishingPassword }) => {
            // TODO: How can I retrieve this entire URL as opposed to needing to construct it
            return `https://${publishingUserName}:${publishingPassword}@${this.appName}.scm.azurewebsites.net/${this.appName}.git`;
        });
    }

    getPackageScript(scriptName) {
        const packageFile = path.join(process.cwd(), "package.json");
        if (fse.existsSync(packageFile)) {
            const { scripts } = require(packageFile);
            if (scripts) {
                return scripts[scriptName];
            }
        }
    }

    getStartFile() {
        return new Promise((resolve, reject) => {
            const startScript = this.getPackageScript("start");
            if (startScript) {
                const startFile = startScript.replace("node ", "");
                logCompletedOperation(green`Set app start file: ${startFile}`);
                resolve(startFile);
            } else {
                let startFileFound = false;
                ["server.js", "app.js", "index.js"].forEach((fileName) => {
                    if (fs.existsSync(path.join(process.cwd(), fileName))) {
                        startFileFound = true;
                        logCompletedOperation(green`Set app start file: ${fileName}`);
                        resolve(fileName);
                    }
                });

                if (!startFileFound) {
                    reject(new Error("No start file found"));
                }
            }
        });
    }

    initAppSettings(subscriptionId, clientFactory) {
        // TODO: Fix this to
        this.location = process.env.AZURE_LOCATION || "WestUS";
        this.subscriptionId = subscriptionId;

        const settings = new SettingsManager();
        this.insightsName = settings.insightsName;
        this.appName = settings.appName;
        this.resourceGroup = settings.resourceGroupName;

        this.appUrl = `https://${this.appName}.azurewebsites.net`;
        this.kuduUrl = `https://${this.appName}.scm.azurewebsites.net/api`;

        this.kuduClient = clientFactory(require("az-kudu"), this.appName);
        this.serviceManager = serviceManager(this.appClient, clientFactory, this.resourceGroup, this.appName);
    }

    installDependencies(production) {
        const command = "npm install" + (production ? " --production" : "");
        return runOperation({
            inProgressMessage: "Installing NPM dependencies",
            finishedMessage: "Installed NPM dependencies",
            operation: () => this.runRemoteCommand(command)
        });
    }

    installAppInsights() {
        return runOperation({
            inProgressMessage: "Installing monitoring agent",
            finishedMessage: "Installed monitoring agent",
            operation: () => this.runRemoteCommand("npm install applicationinsights logpoint --no-save")        
        });
    }

    login() {
        const { login } = require("az-login");
        const pkg = require("../../package.json");

        return login({ serviceName: `${pkg.name}/${pkg.version}` })
            .then(({ clientFactory, subscriptionId }) => {
                const { ResourceManagementClient } = require("azure-arm-resource");
                const websiteClient = require("azure-arm-website");

                this.client = clientFactory(ResourceManagementClient);
                this.appClient = clientFactory(websiteClient);

                this.initAppSettings(subscriptionId, clientFactory);
            });
    }

    launchApp() {
        return new Promise((resolve, reject) => {
            logCompletedOperation(green`Launching ${this.appUrl}`);
            opn(this.appUrl, { wait: false });
            resolve();
        });
    }

    openLogStream() {
        logCompletedOperation(green`Starting log stream. Press ${"CTRL+C"} to exit\n`);
        this.kuduClient.openLogStream().pipe(process.stdout);
    }

    restartApp() {
        return runOperation({
            inProgressMessage: "Restarting web app",
            finishedMessage: "Restarted web app",
            operation: () => this.appClient.webApps.restart(this.resourceGroup, this.appName, { synchronous: true })
        });
    }

    syncLocalRepo() {
        return runOperation({
            inProgressMessage: "Syncing local Git repo",
            finishedMessage: "Synced local Git repo",
            operation: () => execSync(`git push ${GIT_REMOTE_NAME} master`)
        });
    }

    syncRemoteRepo() {
        return runOperation({
            inProgressMessage: "Syncing remote Git repo",
            finishedMessage: "Synced remote Git repo",
            operation: () => this.appClient.webApps.syncRepository(this.resourceGroup, this.appName)
        });
    }
};
