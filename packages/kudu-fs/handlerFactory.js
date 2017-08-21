const fs = require("fs");
const { join: joinPath } = require("path");

const ERROR_STATUS = -1;
const SUCCESS_STATUS = 0;

const DIRECTORY_MIME_TYPE = "inode/directory";

const DIRECTORY_MODE = 20479;
const FILE_MODE = 36351;

function handlePromise(promise, cb) {
  return promise.then(() => cb(SUCCESS_STATUS)).catch(() => cb(ERROR_STATUS));
}

module.exports = kuduClient => {
  let fileDirectory = new Map();
  let fd = 1;

  return {
    displayFolder: true,
    force: true,

    // Retrieve the attributes of a specific
    // file or directory (e.g. permissions, size)
    getattr(path, cb) {
      if (path === "/") {
        return cb(SUCCESS_STATUS, {
          atime: new Date(),
          ctime: new Date(),
          mtime: new Date(),
          size: 1000000,
          mode: DIRECTORY_MODE,
          gid: process.getgid(),
          uid: process.getuid()
        });
      }

      const file = fileDirectory.get(path);
      if (!file) {
        return cb(ERROR_STATUS);
      }

      const stats = {
        atime: file.mtime, // Kudu doesn't return the atime attribute
        ctime: file.crtime,
        mtime: file.mtime,
        size: file.size,
        mode: file.mime === DIRECTORY_MIME_TYPE ? DIRECTORY_MODE : FILE_MODE,
        uid: process.getuid(),
        gid: process.getgid()
      };

      cb(SUCCESS_STATUS, stats);
    },

    // Create a new directory
    mkdir(path, mode, cb) {
      handlePromise(kuduClient.createDirectory(path), cb);
    },

    // Read the contents of a specific file
    read(path, fd, buf, len, pos, cb) {
      const item = fileDirectory.get(path);
      if (item.contents) {
        // Since this FS is only meant to be used between a single
        // developer, and a remote Kudu service, there's no need to
        // worry about cache eviction, since the only changes being
        // made would be coming from the sole/local developer's machine.
        const contentSlice = item.contents.slice(pos, pos + len);
        if (!contentSlice) return cb(0);

        buf.write(contentSlice);
        cb(contentSlice.length);
      } else {
        kuduClient
          .getFileContents(path)
          .then(contents => {
            const contentSlice = contents.slice(pos, pos + len);
            if (!contentSlice) return cb(0);

            buf.write(contentSlice);
            item.contents = contents;
            cb(contentSlice.length);
          })
          .catch(() => cb(ERROR_STATUS));
      }
    },

    // Retrieves the list of files
    // within a specified directory
    readdir(path, cb) {
      // TODO: Check whether we'd ls'd a dir already
      // and if so, short-circuit hitting the server
      kuduClient
        .listDirectory(path)
        .then(items => {
          const childrem = items.map(content => {
            const itemPath = joinPath(path, content.name);
            fileDirectory.set(itemPath, content);
            return content.name;
          });
          cb(SUCCESS_STATUS, childrem);
        })
        .catch(() => cb(ERROR_STATUS));
    },

    rename(src, dest, cb) {
      console.log(`Renaming ${src} to ${dest}`);
      handlePromise(kuduClient.renameFile(src, dest), cb);
    },

    rmdir(path, cb) {
      handlePromise(kuduClient.deleteDirectory(path), cb);
    },

    // This enables files to be extended or
    // compressed in size, and is critical
    // for being able to edit a file.
    truncate(path, size, cb) {
      cb(SUCCESS_STATUS);
    },

    // Delete an existing file
    unlink(path, cb) {
      handlePromise(kuduClient.deleteFile(path), cb);
    },

    // Update the contents of an existing file
    write(path, fd, buffer, length, position, cb) {
      kuduClient
        .writeFileContents(path, buffer.toString())
        .then(() => cb(buffer.length));
    }
  };
};
