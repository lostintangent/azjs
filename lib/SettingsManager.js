const fs = require("fs");
const nameGenerator = require("project-name-generator");
const path = require("path");

module.exports = class SettingsManager {
    constructor() {
        const settingsFile = path.join(process.cwd(), ".azjs.json");

        if (fs.existsSync(settingsFile)) {
            this.settings = require(settingsFile);
        } else {
            const appName = nameGenerator({ number: true }).dashed;
            this.settings = {
                appName,
                resourceGroupName: `${appName}-rg`
            };

            fs.writeFileSync(settingsFile, JSON.stringify(this.settings), "utf8");
        }
    }

    get appName() {
        return this.settings.appName
    }

    get resourceGroupName() {
        return this.settings.resourceGroupName;
    }
}