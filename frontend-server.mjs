import http from "node:http";
import https from "node:https";
import { spawn } from "node:child_process";

const publicPort = Number(process.env.PORT || 8080);
const frontendPort = Number(process.env.FRONTEND_PORT || 3000);
const frontendHost = "127.0.0.1";
const backendUrl = (process.env.BACKEND_URL || process.env.VITE_INSIGHTFORGE_API_URL || "").trim();

const apiPrefixes = ["/auth", "/analyze", "/upload", "/docs", "/redoc", "/openapi.json"];
let shuttingDown = false;

const frontend = spawn(process.execPath, [".output/server/index.mjs"], {
  env: {
    ...process.env,
    HOST: frontendHost,
    PORT: String(frontendPort),
    NITRO_HOST: frontendHost,
    NITRO_PORT: String(frontendPort),
  },
  stdio: ["ignore", "inherit", "inherit"],
});

frontend.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }

  console.error(`frontend exited with code ${code ?? "null"} signal ${signal ?? "null"}`);
  shutdown(code ?? 1);
});

function proxyToFrontend(clientReq, clientRes) {
  const targetReq = http.request(
    {
      hostname: frontendHost,
      port: frontendPort,
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
    console.error("Frontend upstream failed:", error);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "content-type": "application/json" });
    }
    clientRes.end(JSON.stringify({ detail: "Frontend service unavailable." }));
  });

  clientReq.pipe(targetReq);
}

function proxyToBackend(clientReq, clientRes) {
  if (!backendUrl) {
    clientRes.writeHead(502, { "content-type": "application/json" });
    clientRes.end(
      JSON.stringify({ detail: "BACKEND_URL is not configured for this frontend service." }),
    );
    return;
  }

  const target = new URL(
    clientReq.url || "/",
    backendUrl.endsWith("/") ? backendUrl : `${backendUrl}/`,
  );
  const transport = target.protocol === "https:" ? https : http;
  const headers = { ...clientReq.headers, host: target.host };

  const targetReq = transport.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: clientReq.method,
      headers,
    },
    (targetRes) => {
      clientRes.writeHead(targetRes.statusCode ?? 502, targetRes.headers);
      targetRes.pipe(clientRes);
    },
  );

  targetReq.on("error", (error) => {
    console.error("Backend upstream failed:", error);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "content-type": "application/json" });
    }
    clientRes.end(JSON.stringify({ detail: "Backend service unavailable." }));
  });

  clientReq.pipe(targetReq);
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
  const isApiRequest = apiPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isApiRequest) {
    proxyToBackend(req, res);
    return;
  }

  proxyToFrontend(req, res);
});

server.listen(publicPort, "0.0.0.0", () => {
  console.log(`InsightForge frontend listening on 0.0.0.0:${publicPort}`);
  console.log(`Frontend SSR upstream: http://${frontendHost}:${frontendPort}`);
  console.log(`Backend API upstream: ${backendUrl || "(not configured)"}`);
});

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  const normalizedExitCode = typeof exitCode === "number" ? exitCode : 0;
  shuttingDown = true;
  server.close();
  if (!frontend.killed) {
    frontend.kill("SIGTERM");
  }
  setTimeout(() => process.exit(normalizedExitCode), 500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
