const filename = "/Users/apple/Downloads/backup-credentials-api-logs-14-12-2021/credentials-api-out.log" // 2,540,034 lines, 187MB
// filename = "/var/log/messages";             // 25,703 lines, 2.5MB
// filename = "out";                           // 2000 lines, 188K (head -2000 access.log)
// filename = "/etc/motd";                     // 7 lines, 286B
const regexp = /1863424573542/

const child_process = require("child_process")
const qfgets = require("qfgets")

function grepWithFork (filename, regexp, done) {
  const cmd = "grep -A 20 -B 20 '114-6948779-3272235'" + filename
  child_process.exec(cmd, { maxBuffer: 200000000 }, function (err, stdout, stderr) {
    console.log("stdOut: ", stdout)
    console.log("stderr: ", stderr)

    done(err)
  })
}

grepWithFork(filename, regexp, function (err) {
  console.log("fork done")
})
