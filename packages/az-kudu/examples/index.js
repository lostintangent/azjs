const { login } = require("az-login");

// 1) Require the az-kudu module
const Kudu = require("../");

!(async function() {
  // 2) Login to your Azure account via az-login
  const { clientFactory } = await login();

  // 3) Instantiate the Kudu client just like you would
  // any other Azure management SDK, but also specify
  // the name of the web app you want to manage.
  const kudu = clientFactory(Kudu, "coordinated-slip-2809");

  // 4) Begin managing your web app instance!
  const response = await kudu.runCommand("node -v");
  console.log(response);
})();
