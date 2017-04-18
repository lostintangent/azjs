const { execSync } = require("child_process");

function cwdIsValidRepo() {
     try {
        execSync("git rev-parse --is-inside-work-tree");
        return true;
    } catch (error) {
        return false;
    };
}

exports.addRemote = (name, url) => {
    const repoMessage = `Configure your remotes as desired using the following URL: ${url}`;

    if (!cwdIsValidRepo()) {
        throw new Error(`A Git remote couldn't be added because the CWD isn't a Git repo. ${repoMessage}`);        
    }

    try {
        execSync(`git remote add ${name} '${url}'`);        
    } catch (error) {
        throw new Error(`A ${name} Git remote already exists. ${repoMessage}`);
    }
}

exports.pushRemote = (name = "azure", branch = "master") => {
    execSync(`git push ${name} ${branch}`)
};