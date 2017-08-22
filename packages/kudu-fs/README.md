# Azure Kudu Remote Filesystem (KuduFS)

This library provide a FUSE filesystem for locally mounting an Azure App Service instance. This allows you to edit your deployed source code as if it were a local file, which can be handy if you want to make a quick change, and don't want to bother using FTP, Git deployment, etc. in order to do it.

## Filesystem Support

KuduFS doesn't currently implement the entirety of the FUSE API. Since the primary intended use of this filesystem is to make quick edits to a deployed Azure web app, it is optmized for enabling reading and edits existing files, as opposed to arbitrary filesystem access/operations.

### Supported Operations

1. Listing the contents of directories (and sub-directories)
2. Reading the contents of a file
3. Deleting existing files and/or directories
4. Writing to existing files

### Unsupported Operations

1. Adding new files and/or directories
2. Renaming existing files and/or directories
3. Creating symlinks
