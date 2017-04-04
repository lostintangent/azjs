const { green, red, yellow } = require("chalk");

exports.green = (stringParts, value) => {
    return stringParts.join(green(value));
};

exports.handle = (resolve, reject) => {
    return (error, result) => {
        if (error) {
            reject(error);
        } else {
            resolve(result);
        }
    };
};

exports.exit = (message) => {
    console.error(`${red("[Error]")} ${message}`);
    process.exit(-1);
};

exports.log = (message, value) => {
    console.log(`${yellow("[Info]")} ${message}`);
};