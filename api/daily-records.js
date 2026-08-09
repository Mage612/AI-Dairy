import { handleDailyRecords } from "../server/apiHandlers.js";

export default async function handler(req, res) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    res.status(200).json(await handleDailyRecords({ method: req.method, body }));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: "每日记录云端读写失败。",
      detail: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}
