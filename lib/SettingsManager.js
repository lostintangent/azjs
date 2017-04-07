const fs = require("fs");
const nameGenerator = require("project-name-generator");
const path = require("path");

const SETTINGS_FILE_PATH = path.join(process.cwd(), ".azjs.json");

class SettingsManager {
    constructor() {
        if (fs.existsSync(SETTINGS_FILE_PATH)) {
            this.settings = require(SETTINGS_FILE_PATH);
        } else {
            const appName = nameGenerator({ number: true }).dashed;
            this.settings = {
                appName,
                resourceGroupName: `${appName}-rg`,
                insightsName: `${appName}-insights`
            };

            fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(this.settings), "utf8");
        }
    }

    static clear() {
        fs.unlinkSync(SETTINGS_FILE_PATH);
    }

    get appName() {
        return this.settings.appName
    }

    get insightsName() {
        return this.settings.insightsName;
    }

    get resourceGroupName() {
        return this.settings.resourceGroupName;
    }
}

module.exports = SettingsManager;