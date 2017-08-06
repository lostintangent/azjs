module.exports = (logPrefix = "", port = 8967) => {
  const http = require("http");
  const middleware = require("./middleware");

  http.createServer(middleware(logPrefix)).listen(port, () => {
    console.log(`Logpoint server listening on port ${port}`);
  });
};
