const { red } = require("chalk");

exports.exit = (message) => {
    console.error(`${red("[Error]")} ${message}`);
    process.exit(-1);
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