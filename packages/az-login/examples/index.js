const util = require("util");
const { login } = require("../");
const { ResourceManagementClient } = require("azure-arm-resource");

// 1) Run the login method, which will automatically authenticate the user,
// if they previously logged in, or set the expected env vars. Otherwise,
// this will guide the user with an "interactive login process" via their browser.
login()
  .then(({ clientFactory }) => {
    // 2) Use the "clientFactory" function to initialize any
    // management client type from the Azure Node.js SDK
    const { resourceGroups } = clientFactory(ResourceManagementClient);

    // 3) Use the management client as normal, without needing to worry about specifying
    // any credentials or subscription ID to it (since this was handle by the login method)
    resourceGroups.list().then(groups => {
      const prettyGroups = util.inspect(groups, { colors: true });
      console.log(prettyGroups);
    });
  })
  .catch(error => {
    // Optionally, catch any errors that occur
    // as a part of the login process.
    console.log(error);
  });
