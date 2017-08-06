const [execPath, scriptPath, file, line, expression] = process.argv;

const { Client } = require("ssh2");
const conn = new Client();
conn
  .on("ready", function() {
    conn.exec(
      `curl -s "http://localhost:8967/logpoint?file=${file}&line=${line}&expression=${expression}"`,
      function(err, stream) {
        if (err) throw err;
        stream
          .on("close", function(code, signal) {
            conn.end();
          })
          .on("data", function(data) {
            console.log("STDOUT: " + data);
          })
          .stderr.on("data", function(data) {
            console.log("STDERR: " + data);
          });
      }
    );
  })
  .connect({
    host: require("fs").readFileSync(
      `/home/site/ipaddr_${process.env.WEBSITE_ROLE_INSTANCE_ID}`,
      "utf8"
    ),
    port: 2222,
    username: "root",
    password: "Docker!",
    algorithms: {
      cipher: [
        "aes128-cbc",
        "3des-cbc",
        "aes256-cbc",
        "aes128-ctr",
        "aes256-ctr",
        "aes192-ctr"
      ],
      hmac: ["hmac-sha1", "hmac-sha1-96", "hmac-md5-96"]
    }
  });
