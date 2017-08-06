const { startServer } = require("logpoint");
startServer();

require("applicationinsights").setup().start();

require("./{{STARTUP_FILE}}");
