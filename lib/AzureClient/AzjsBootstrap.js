require("applicationinsights")
    .setup()
    .setAutoDependencyCorrelation(true)
    .start();

require("./{{STARTUP_FILE}}");