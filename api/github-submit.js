/**
 * Project: GitHub App Contact Backend (Vercel)
 * Path: /api/github-submit.js
 * © 2026 Automation Expert. All rights reserved.
 */

import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

const DISCUSSION_MAP = {
  general: "D_kwDONkYa8s4Aj1Sn",
  feature: "D_kwDONkYa8s4Aj1Sk",
  bug: "D_kwDONkYa8s4Aj1St",
  feedback: "D_kwDONkYa8s4Aj1RP",
};

export default async function handler(req, res) {
  /* -----------------------------
     1. CORS
  ----------------------------- */
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
    /* -----------------------------
       2. Body Parsing (Vercel-safe)
    ----------------------------- */
    const data =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { type, body, name, email } = data || {};

    if (!type || !body || !name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const discussionId = DISCUSSION_MAP[type];
    if (!discussionId) {
      return res.status(400).json({ error: "Invalid inquiry type" });
    }

    /* -----------------------------
       3. GitHub App Auth (Vercel)
    ----------------------------- */
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GH_APP_ID,
        privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, "\n"),
        installationId: process.env.GH_INSTALLATION_ID,
      },
    });

    const commentBody = `
**Name:** ${name}
**Email:** ${email}
**Type:** ${type}

**Message:**
${body}
    `.trim();

    /* -----------------------------
       4. GraphQL Mutation
    ----------------------------- */
    const result = await octokit.graphql(
      `
      mutation AddComment($discussionId: ID!, $body: String!) {
        addDiscussionComment(
          input: { discussionId: $discussionId, body: $body }
        ) {
          comment {
            url
          }
        }
      }
      `,
      {
        discussionId,
        body: commentBody,
      }
    );

    return res.status(200).json({
      success: true,
      url: result.addDiscussionComment.comment.url,
    });
  } catch (error) {
    console.error("Vercel API Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}
