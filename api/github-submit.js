import { addDiscussionComment } from "../lib/githubDiscussion.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  // CORS (safe default)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const url = await addDiscussionComment(payload);

    return res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(400).json({
      error: error.message,
    });
  }
}
