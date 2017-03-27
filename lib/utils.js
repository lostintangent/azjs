const { green, yellow } = require("chalk");

module.exports.green = (stringParts, value) => {
    return stringParts.join(green(value));
};

module.exports.handle = (resolve, reject) => {
    return (error, result) => {
        if (error) {
            reject(error);
        } else {
            resolve(result);
        }
    };
};

module.exports.log = (message, value) => {
    console.log(`${yellow("[Info]")} ${message}`);
};