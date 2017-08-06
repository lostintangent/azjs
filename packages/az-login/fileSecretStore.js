const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CONFIG_DIRECTORY = path.join(os.homedir(), ".azure");
const PASSWORD_FILE = path.join(
  CONFIG_DIRECTORY,
  "azloginServicePrincipalSecret"
);

// This secret store isn't meant to provide production-ready
// security, as compared to using something like keytar.
const CIPHER_ALGORITHM = "aes-256-ctr";
const CIPHER_PASSWORD = "az-login";

module.exports = {
  getPassword(serviceName, account) {
    if (!fs.existsSync(PASSWORD_FILE)) {
      return Promise.resolve();
    }

    const encryptedPassword = fs.readFileSync(PASSWORD_FILE, "utf8");
    const decipher = crypto.createDecipher(CIPHER_ALGORITHM, CIPHER_PASSWORD);
    let decryptedPassword = decipher.update(encryptedPassword, "hex", "utf8");
    decryptedPassword += decipher.final("utf8");
    return Promise.resolve(decryptedPassword);
  },
  deletePassword(serviceName, account) {
    if (fs.existsSync(PASSWORD_FILE)) {
      fs.unlinkSync(PASSWORD_FILE);
      return Promise.resolve(true);
    } else {
      return Promise.resolve(false);
    }
  },
  setPassword(serviceName, account, password) {
    const cipher = crypto.createCipher(CIPHER_ALGORITHM, CIPHER_PASSWORD);
    let encryptedPassword = cipher.update(password, "utf8", "hex");
    encryptedPassword += cipher.final("hex");
    fs.writeFileSync(PASSWORD_FILE, encryptedPassword);

    return Promise.resolve();
  }
};
