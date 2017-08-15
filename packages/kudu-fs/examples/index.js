const kudu = require("az-kudu");
const path = require("path");
const { login } = require("az-login");

login().then(({ clientFactory }) => {
  const kuduClient = clientFactory(kudu, "distinct-actor-1738");
  const kuduFS = require("../");

  const mountPath = path.join(process.cwd(), "mount");
  kuduFS(mountPath, kuduClient)
    .then(unmount => {
      process.on("SIGINT", () => {
        unmount();
        process.exit();
      });

      console.log("Press any key in order to stop the KuduFS mount...");
      process.stdin.on("data", () => {
        unmount();
        process.exit();
      });
    })
    .catch(error => {
      console.log(error);
      process.exit(1);
    });
});
