const { login } = require("az-login");

// 1) Require the az-kudu module
const Kudu = require("../");

// 2) Login to your Azure account via az-login
login().then(({ clientFactory }) => {
  // 3) Instantiate the Kudu client just like you would
  // any other Azure management SDK, but also specify
  // the name of the web app you want to manage.
  const kudu = clientFactory(Kudu, "web-app-name");

  // 4) Begin managing your web app instance!
  kudu.runCommand("node -v").then(
    response => {
      console.log(response);
    },
    error => {
      console.log(`[Error] ${error}`);
    }
  );
});
