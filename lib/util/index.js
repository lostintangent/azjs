const { green, red, yellow } = require("chalk");
const { Spinner } = require("cli-spinner");

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

exports.exit = (message, exitCode = -1) => {
    console.error(`${red(message)}`);
    process.exit(exitCode);
};

exports.log = (message, value) => {
    console.log(`${yellow("[Info]")} ${message}`);
};

const { success: CHECKMARK_GLYPH } = require("log-symbols");
exports.logCompletedOperation = (operationMessage) => {
    console.error(`${CHECKMARK_GLYPH} ${operationMessage}`);
}

exports.runOperation = ({ operation, inProgressMessage, finishedMessage }) => {
    return new Promise((resolve, reject) => {
        const spinner = new Spinner(inProgressMessage);
        spinner.setSpinnerString(18);
        spinner.start();

        try {
            const result = operation();
            if (result && result.then) {
                result.then(stopSpinner, reject);
            } else {
                stopSpinner(result);
            }
        }
        catch (error) {
            reject(error);
        }

        function stopSpinner(value) {
            spinner.stop(true);
            exports.logCompletedOperation(finishedMessage);
            resolve(value);
        }
    });
};