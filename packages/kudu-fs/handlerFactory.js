const debug = require("debug")("kudu-fs");
const fs = require("fs");
const { join: joinPath } = require("path");

const ERROR_STATUS = -1;
const SUCCESS_STATUS = 0;

const DIRECTORY_MIME_TYPE = "inode/directory";

const DIRECTORY_MODE = 20479;
const FILE_MODE = 36351;

const CURRENT_GID = process.getgid();
const CURRENT_UID = process.getuid();

function handlePromise(promise, cb) {
  return promise.then(() => cb(SUCCESS_STATUS)).catch(() => cb(ERROR_STATUS));
}

module.exports = kuduClient => {
  let fileDirectory = new Map();
  return {
    displayFolder: true,
    force: true,
    options: ["allow_other"],

    access(path, mode, cb) {
      cb(SUCCESS_STATUS);
    },

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
          gid: CURRENT_GID,
          uid: CURRENT_UID
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
        uid: CURRENT_UID,
        gid: CURRENT_GID
      };

      cb(SUCCESS_STATUS, stats);
    },

    // Read the contents of a specific file
    read(path, fd, buf, len, pos, cb) {
      const item = fileDirectory.get(path);
      if (item.contents) {
        debug("Reading cache file %o (%o bytes of offset %o)", path, len, pos);
        // Since this FS is only meant to be used between a single
        // developer, and a remote Kudu service, there's no need to
        // worry about cache eviction, since the only changes being
        // made would be coming from the sole/local developer's machine.
        const contentSlice = item.contents.slice(pos, pos + len);
        if (!contentSlice) return cb(SUCCESS_STATUS);

        buf.write(contentSlice);
        cb(contentSlice.length);
      } else {
        debug("Reading remote file %o (%o bytes at offset %o)", path, len, pos);
        kuduClient
          .getFileContents(path)
          .then(contents => {
            const contentSlice = contents.slice(pos, pos + len);
            if (!contentSlice) return cb(SUCCESS_STATUS);

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
      kuduClient
        .listDirectory(path)
        .then(items => {
          const children = items.map(content => {
            const itemPath = joinPath(path, content.name);
            fileDirectory.set(itemPath, content);
            return content.name;
          });
          debug("Listing directory %o, with children %o", path, children);
          cb(SUCCESS_STATUS, children);
        })
        .catch(error => {
          debug("Error listing directory %o: %o", path, error);
          cb(ERROR_STATUS);
        });
    },

    // Delete a directory. Note that when deleting a directory,
    // FUSE will list the directory's contents, and the unlink
    // each file individually, before ultimately calling this
    // method in order to delete the actually directory.
    rmdir(path, cb) {
      debug("Removing directory %o", path);
      handlePromise(kuduClient.deleteDirectory(path), cb);
    },

    // This enables files to be extended or
    // compressed in size, and is critical
    // for being able to edit a file.
    truncate(path, size, cb) {
      debug("Truncating %o to %o", path, size);
      cb(SUCCESS_STATUS);
    },

    // Delete an existing file
    unlink(path, cb) {
      debug("Deleting file %o", path);
      handlePromise(kuduClient.deleteFile(path), cb);
    },

    // Update the contents of an existing file
    write(path, fd, buffer, len, pos, cb) {
      debug("Writing to %o (%o bytes at offset %o)", path, len, pos);

      const dstbuf = new Buffer(len);
      dstbuf.fill(0);

      const copied = buf.fercopy(dstbuf, 0, 0, len);

      const contents = buffer.slice(pos, len);
      kuduClient.writeFileContents(path, contents).then(() => {
        // Update the in-memory cache
        const item = fileDirectory.get(path);
        item.contents = contents;

        cb(len);
      });
    }
  };
};
