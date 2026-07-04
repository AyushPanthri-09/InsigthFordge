import http from "node:http";
import { spawn } from "node:child_process";

const publicPort = Number(process.env.PORT || 8080);
const backendPort = Number(process.env.BACKEND_PORT || 8000);
const frontendPort = Number(process.env.FRONTEND_PORT || 3000);
const host = "127.0.0.1";

const apiPrefixes = ["/auth", "/analyze", "/upload", "/health", "/docs", "/redoc", "/openapi.json"];

const children = [];
let shuttingDown = false;

function startProcess(name, command, args, env) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "inherit", "inherit"],
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(`${name} exited with code ${code ?? "null"} signal ${signal ?? "null"}`);
    shutdown(code ?? 1);
  });

  children.push(child);
  return child;
}

function proxyRequest(targetPort, clientReq, clientRes) {
  const targetReq = http.request(
    {
      hostname: host,
      port: targetPort,
      path: clientReq.url,
      method: clientReq.method,
      headers: clientReq.headers,
    },
    (targetRes) => {
      clientRes.writeHead(targetRes.statusCode ?? 502, targetRes.headers);
      targetRes.pipe(clientRes);
    },
  );

  targetReq.on("error", (error) => {
    console.error(`Proxy target ${targetPort} failed:`, error);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "content-type": "application/json" });
    }
    clientRes.end(JSON.stringify({ detail: "Upstream service unavailable." }));
  });

  clientReq.pipe(targetReq);
}

const backend = startProcess(
  "backend",
  "python",
  ["-m", "uvicorn", "backend.app:app", "--host", host, "--port", String(backendPort)],
  {
    HOST: host,
    PORT: String(backendPort),
    DEBUG: process.env.DEBUG || "false",
  },
);

const frontend = startProcess("frontend", process.execPath, [".output/server/index.mjs"], {
  HOST: host,
  PORT: String(frontendPort),
  NITRO_HOST: host,
  NITRO_PORT: String(frontendPort),
});

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
  const targetPort = apiPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
    ? backendPort
    : frontendPort;

  proxyRequest(targetPort, req, res);
});

server.listen(publicPort, "0.0.0.0", () => {
  console.log(`InsightForge Railway proxy listening on 0.0.0.0:${publicPort}`);
  console.log(`Frontend SSR upstream: http://${host}:${frontendPort}`);
  console.log(`FastAPI upstream: http://${host}:${backendPort}`);
});

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  const normalizedExitCode = typeof exitCode === "number" ? exitCode : 0;
  shuttingDown = true;
  server.close();
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(normalizedExitCode), 500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
