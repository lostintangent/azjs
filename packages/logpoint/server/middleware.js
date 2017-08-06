module.exports = (logPrefix = "") => {
  const url = require("url");

  const { Session } = require("..");
  const session = new Session(logPrefix);

  return (req, res) => {
    evaluateRoutes(req)
      .then(result => {
        res.end(result);
      })
      .catch(reason => {
        res.statusCode = 404;
        res.end(reason);
      });
  };

  function evaluateRoutes(req) {
    const { pathname, query } = url.parse(req.url, true);
    const { file, line, expression } = query;

    switch (pathname.substr("1")) {
      case "add":
        if (!file || !line || !expression) {
          return Promise.reject("Invalid args");
        }

        return session.addLogpoint(file, Number.parseInt(line), expression);

      case "clear":
        return session.clearLogpoints();

      case "remove":
        if (!file || !line) {
          return Promise.reject("Invalid args");
        }

        return session.removeLogpoint(file, Number.parseInt(line), expression);

      default:
        return Promise.reject("Invalid command");
    }
  }
};
