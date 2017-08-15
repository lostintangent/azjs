const fs = require("fs");
const fuse = require("fuse-bindings");
const handlerFactory = require("./handlerFactory");

module.exports = (mountPath, kuduClient) => {
  return new Promise((resolve, reject) => {
    !fs.existsSync(mountPath) && fs.mkdirSync(mountPath);
    fuse.mount(mountPath, handlerFactory(kuduClient), error => {
      if (error) {
        reject(error);
      } else {
        resolve(() => fuse.unmount(mountPath));
      }
    });
  });
};
