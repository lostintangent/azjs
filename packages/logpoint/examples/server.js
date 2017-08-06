const { sayHi } = require("./lib/greeter");
const { startServer, Client } = require("../index");

startServer("Logpoint: ");
setInterval(() => sayHi("JC"), 2000);

// Emulating a "remote" client...

const client = new Client();
client.addLogpoint("lib/greeter", 3, "name");
client.addLogpoint("lib/greeter", 3, "2 + 2");

// After seeing the logpoint three times, we'll
// clear it, at which point, you should only see the app logs
setTimeout(() => {
  client.removeLogpoint("lib/greeter", 3, "name");

  setTimeout(() => client.clearLogpoints(), 4000);
}, 6000);
