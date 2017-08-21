const fs = require("fs");
const kudu = require("az-kudu");
const path = require("path");
const { login } = require("az-login");

!(async function() {
  const { clientFactory } = await login();
  const kuduClient = clientFactory(kudu, "agreeable-grass-6360");
  const kuduFS = require("../");

  try {
    const mountPath = path.join(process.cwd(), "mount");
    !fs.existsSync(mountPath) && fs.mkdirSync(mountPath);

    const unmount = await kuduFS(mountPath, kuduClient);
    console.log("Press <CTRL+C> to stop the KuduFS mount...");

    process.on("SIGINT", () => {
      unmount(error => {
        error && console.log(error.message);
        process.exit();
      });
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
