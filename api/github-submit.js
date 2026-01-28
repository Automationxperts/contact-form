/**
 * Project: GitConnect Unified Backend (AutomationExpert Factory)
 * Platforms: Netlify & Vercel
 * © 2026 Automation Expert. All rights reserved.
 */

import { createAppAuth } from "@octokit/auth-app";

const DISCUSSION_MAP = {
  general: "D_kwDONkYa8s4Aj1Sn",
  feature: "D_kwDONkYa8s4Aj1Sk",
  bug: "D_kwDONkYa8s4Aj1St",
  feedback: "D_kwDONkYa8s4Aj1RP",
};

/**
 * CORE LOGIC: Agnostic of the hosting platform
 */
async function executeSubmission(payload) {
  const { type, body, name, email } = payload;
  const discussionId = DISCUSSION_MAP[type];

  if (!name || !email || !body || !discussionId) {
    throw { status: 400, message: "Invalid input or discussion type." };
  }

  // 1. GitHub App Auth
  const auth = createAppAuth({
    appId: process.env.GH_APP_ID,
    privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, "\n"),
    installationId: process.env.GH_INSTALLATION_ID,
  });

  const { token } = await auth({ type: "installation" });

  // 2. Build Content
  const commentBody = `**Name:** ${name}\n**Email:** ${email}\n**Type:** ${type}\n**Message:**\n${body}`.trim();

  // 3. GraphQL Mutation
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation AddComment($discussionId: ID!, $body: String!) {
          addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
            comment { url }
          }
        }
      `,
      variables: { discussionId, body: commentBody },
    }),
  });

  const result = await response.json();
  if (result.errors) throw { status: 400, message: result.errors[0].message };

  return { success: true, url: result.data.addDiscussionComment.comment.url };
}

/* -------------------------------------------------------------------------- */
/* PLATFORM HANDLERS                            */
/* -------------------------------------------------------------------------- */

/**
 * VERCEL: Default Export (Express-like req/res)
 */
export default async function vercelHandler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const result = await executeSubmission(req.body || {});
    return res.status(200).json(result);
  } catch (err) {
    console.error("Vercel Error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  }
}

/**
 * NETLIFY: Named Export 'handler' (AWS Lambda style)
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const payload = JSON.parse(event.body || "{}");
    const result = await executeSubmission(payload);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("Netlify Error:", err);
    return {
      statusCode: err.status || 500,
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    };
  }
};