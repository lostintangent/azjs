const fs = require("fs");
const fuse = require("fuse-bindings");
const handlerFactory = require("./handlerFactory");

module.exports = (mountPath, kuduClient) => {
  return new Promise((resolve, reject) => {
    fuse.mount(mountPath, handlerFactory(kuduClient), error => {
      if (error) {
        return reject(error);
      }

      resolve(cb => {
        fuse.unmount(mountPath, cb);
      });
    });
  });
};
