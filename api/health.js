import { getHealth } from "../server/apiHandlers.js";

export default function handler(req, res) {
  res.status(200).json(getHealth());
}
