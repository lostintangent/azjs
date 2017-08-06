const { Session } = require("../index");
const { sayHi } = require("./lib/greeter");

!(async function run() {
  // Initialize a new logpoint session, providing
  // an optional prefix for the dynamic logs
  const session = new Session("Logpoint: ");

  // Add a log point on the greet module's "sayHi"
  // method and then trigger it
  await session.addLogpoint("lib/greeter", 3, "name");
  await session.addLogpoint("lib/greeter", 3, "2+2", "'Nice'");
  sayHi("JC (w/logpoint)");

  // Remove the logpoint and trigger the method
  // again, without the added output
  await session.removeLogpoint("lib/greeter", 3);
  sayHi("JC (wo/logpoint)");

  // Start a second session, with a new prefix
  // and a seperate set of logpoints
  const session2 = new Session("Logpoint #2: ");
  await session2.addLogpoint("lib/greeter", 3, "2+2");
  sayHi("Math is cool!");

  // Clear all logpoints
  await session2.clearLogpoints();
  sayHi("No more logpoints!");
})();
