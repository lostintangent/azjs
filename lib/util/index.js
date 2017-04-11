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

exports.printLogo = () => {
console.log(String.raw` ______  ______     __  ______    
/\  __ \/\___  \   /\ \/\  ___\   
\ \  __ \/_/  /__ _\_\ \ \___  \  
 \ \_\ \_\/\_____/\_____\/\_____\ 
  \/_/\/_/\/_____\/_____/\/_____/                                 

An opinionated CLI for deploying and managing Node.js apps on Azure
`);
};