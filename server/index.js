import http from "node:http";
import fs from "node:fs";
import { URL } from "node:url";
import { getHealth, handleChat, handleDailyRecords } from "./apiHandlers.js";

loadEnvFile();

const PORT = Number(process.env.PORT || 8787);

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, getHealth());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    try {
      const body = await readBody(req);
      sendJson(res, 200, await handleChat(body));
    } catch (error) {
      sendJson(res, 500, {
        type: "ERROR",
        message: "分析失败，请稍后重试。",
        detail: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
    return;
  }

  if (url.pathname === "/api/daily-records" && ["GET", "POST"].includes(req.method)) {
    try {
      const body = req.method === "POST" ? await readBody(req) : {};
      sendJson(res, 200, await handleDailyRecords({ method: req.method, body }));
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        message: "每日记录云端读写失败。",
        detail: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
    return;
  }

  sendJson(res, 404, { message: "Not found" });
});

server.listen(PORT, () => {
  console.log(`AI&Diary API listening on http://localhost:${PORT}`);
});

function loadEnvFile() {
  if (!fs.existsSync(".env")) return;
  const lines = fs.readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim().replace(/^\uFEFF/, "");
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
