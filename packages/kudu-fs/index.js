const debug = require("debug")("kudu-fs");
const fuse = require("fuse-bindings");
const handlerFactory = require("./handlerFactory");

module.exports = (mountPath, kuduClient) => {
  return new Promise((resolve, reject) => {
    fuse.mount(mountPath, handlerFactory(kuduClient), error => {
      if (error) {
        return reject(error);
      }

      debug("Mounted at %o", mountPath);
      const unmount = cb => {
        fuse.unmount(mountPath, () => {
          debug("Unmounted at %o", mountPath);
          cb && cb();
        });
      };

      // Make the unmount method also appear
      // as if it were a "disposable".
      unmount.dispose = unmount;
      resolve(unmount);
    });
  });
};
