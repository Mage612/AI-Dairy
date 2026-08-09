import { handleChat } from "../server/apiHandlers.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    res.status(200).json(await handleChat(body));
  } catch (error) {
    res.status(500).json({
      type: "ERROR",
      message: "分析失败，请稍后重试。",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}
