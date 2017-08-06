const path = require("path");

// We need to determine the root directory of the running
// app, which is either the main module's directory, or a
// static path when running in Azure App Service.
const rootFileName = path.dirname(require.main.filename);
const ROOT_DIR =
  rootFileName.indexOf("iisnode") === -1
    ? rootFileName
    : "D:\\home\\site\\wwwroot";

module.exports = class BaseSession {
  constructor(logPrefix = "") {
    this._logPoints = new Map();
    this._logPointIds = new Map();

    this._logPrefix = logPrefix;
  }

  addLogpoint(file, lineNumber, ...expression) {
    return new Promise((resolve, reject) => {
      const { filePath, id } = this._resolveLogpoint(file, lineNumber);
      let logPoint = this._logPoints.get(id);

      if (logPoint) {
        resolveWithExpression();
      } else {
        this._addLogpoint(filePath, lineNumber).then(breakpointId => {
          logPoint = {
            breakpointId,
            expressions: []
          };

          this._logPoints.set(id, logPoint);
          this._logPointIds.set(breakpointId, id);

          resolveWithExpression();
        });
      }

      function resolveWithExpression() {
        logPoint.expressions.push(...expression);
        resolve();
      }
    });
  }

  clearLogpoints() {
    return this._clearLogpoints().then(() => {
      this._logPoints.clear();
      this._logPointIds.clear();
    });
  }

  removeLogpoint(file, lineNumber, expression) {
    const { id, instance } = this._resolveLogpoint(file, lineNumber);
    if (!instance) {
      return Promise.reject(
        `The specified logpoint doesn't exist: ${file}@${lineNumber}`
      );
    }

    if (!expression) {
      return removeLogpoint.call(this);
    }

    const { expressions } = instance;
    const expressionIndex = expressions.indexOf(expression);

    if (expressionIndex === -1) {
      return Promise.reject(
        `The specified expression isn't included in the logpoint: ${expression}`
      );
    }

    // If we're removing the sole expression
    // then just remove the entire logpoint
    if (expressions.length === 1) {
      return removeLogpoint.call(this);
    } else {
      expressions.splice(expressionIndex, 1);
      return Promise.resolve();
    }

    function removeLogpoint() {
      this._logPoints.delete(id);
      this._logPointIds.delete(instance.breakpointId);

      return this._removeLogpointByBreakpointId(instance.breakpointId);
    }
  }

  _resolveLogpoint(file, lineNumber) {
    // Accomodate file names being specified
    // via "module name" syntax (extensionless)
    if (!file.endsWith(".js")) {
      file += ".js";
    }

    const filePath = path.join(ROOT_DIR, file);
    const id = `${filePath}:${lineNumber}:0`;

    return {
      filePath,
      id,
      instance: this._logPoints.get(id)
    };
  }

  _writeLogpoint(value) {
    console.log(`${this._logPrefix}${value}`);
  }
};
