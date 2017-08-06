const http = require("http");
const querystring = require("querystring");

module.exports = class LogpointClient {
  constructor({ hostname = "localhost", port = 8967 } = {}) {
    this._hostname = hostname;
    this._port = port;
  }

  addLogpoint(file, line, expression) {
    return this._makeRequest("add", {
      file,
      line,
      expression
    });
  }

  clearLogpoints() {
    return this._makeRequest("clear");
  }

  removeLogpoint(file, line, expression) {
    return this._makeRequest("remove", {
      file,
      line,
      expression
    });
  }

  _makeRequest(path, params) {
    return new Promise((resolve, reject) => {
      if (params) {
        path += `?${querystring.stringify(params)}`;
      }

      http.get(
        {
          host: this._hostname,
          port: this._port,
          path: `/${path}`
        },
        response => {
          response.setEncoding("utf8");
          let responseBody = "";
          response.on("data", chunk => (responseBody += chunk));

          response.on("end", () => {
            if (response.statusCode >= 400) {
              reject(new Error(responseBody));
            } else {
              resolve(responseBody);
            }
          });
        }
      );
    });
  }
};
