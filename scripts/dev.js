import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

function run(name, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: isWindows,
    env: process.env
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

const server = run("server", "npm", ["run", "dev:server"]);
const client = run("client", "npm", ["run", "dev:client"]);

function stop() {
  server.kill();
  client.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
