/**
 * Project: GitConnect Unified Backend (AutomationExpert Factory)
 * Platforms: Netlify, Vercel, & Cloudflare Workers
 * © 2026 Automation Expert. All rights reserved.
 */

import { createAppAuth } from "@octokit/auth-app";

/**
 * CORE LOGIC: Agnostic of the hosting platform
 * Now takes 'env' as an argument to support Cloudflare's architecture.
 */
async function executeSubmission(payload, env) {
  const { type, body, name, email } = payload;
  
  // Mapping frontend keys to Environment Variables
  const discussionId = {
    general: env.ID_GENERAL,
    feature: env.ID_FEATURE,
    bug: env.ID_BUG,
    feedback: env.ID_FEEDBACK
  }[type];

  if (!name || !email || !body || !discussionId) {
    throw { status: 400, message: "Invalid input or missing configuration." };
  }

  // 1. GitHub App Auth
  const auth = createAppAuth({
    appId: env.GH_APP_ID,
    privateKey: env.GH_PRIVATE_KEY.replace(/\\n/g, "\n"),
    installationId: env.GH_INSTALLATION_ID,
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
      "User-Agent": "AutomationExpert-Factory-Worker" // Required for Cloudflare/GitHub compatibility
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
/* PLATFORM HANDLERS                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 1. VERCEL: Default Export
 */
export default async function vercelHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const result = await executeSubmission(req.body || {}, process.env);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Vercel Error:", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  }
}

/**
 * 2. NETLIFY: Named Export 'handler'
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const payload = JSON.parse(event.body || "{}");
    const result = await executeSubmission(payload, process.env);
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

/**
 * 3. CLOUDFLARE WORKERS: Default Fetch Export
 */
export const fetch = async (request, env) => {
  // CORS Pre-flight for Workers
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await request.json();
    const result = await executeSubmission(payload, env);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Worker Error" }), {
      status: err.status || 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
};