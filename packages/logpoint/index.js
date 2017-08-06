const { major } = require("node-version");

module.exports = {
  middleware: require("./server/middleware"),
  startServer: require("./server"),

  Client: require("./server/client"),
  Session:
    major >= 8
      ? require("./implementations/InspectorSession")
      : require("./implementations/DebugContextSession")
};
