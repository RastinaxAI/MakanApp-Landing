import { access, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const standalone = path.join(appRoot, ".next", "standalone", "apps", "web");
const server = path.join(standalone, "server.js");
const portFlag = process.argv.indexOf("--port");
const port = Number(portFlag === -1 ? (process.env.PORT ?? 3000) : process.argv[portFlag + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid local server port.");

await access(server);
await Promise.all([
  cp(path.join(appRoot, "public"), path.join(standalone, "public"), { recursive: true }),
  cp(path.join(appRoot, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true }),
]);
process.env.PORT = String(port);
process.env.HOSTNAME = "127.0.0.1";
await import(pathToFileURL(server).href);
