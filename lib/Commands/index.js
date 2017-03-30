const fs = require("fs");
const path = require("path");

module.exports = fs.readdirSync(__dirname)
    .filter((commandName) => (commandName !== path.basename(__filename) ? commandName : null))
    .map((commandName) => require(`./${commandName}`));