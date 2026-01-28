import { createAppAuth } from "@octokit/auth-app";

/**
 * Map frontend "type" → GitHub Discussion ID
 */
const DISCUSSION_MAP = {
  general: "D_kwDONkYa8s4Aj1Sn",
  feature: "D_kwDONkYa8s4Aj1Sk",
  bug: "D_kwDONkYa8s4Aj1St",
  feedback: "D_kwDONkYa8s4Aj1RP",
};

export default async function handler(req, res) {
  /* -------------------- CORS (ALWAYS FIRST) -------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    /* -------------------- Parse input -------------------- */
    const { type, body, name, email } = req.body || {};

    if (!type || !body || !name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const discussionId = DISCUSSION_MAP[type];
    if (!discussionId) {
      return res.status(400).json({ error: "Invalid discussion type" });
    }

    /* -------------------- GitHub App Auth -------------------- */
    const auth = createAppAuth({
      appId: process.env.GH_APP_ID,
      privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, "\n"),
      installationId: process.env.GH_INSTALLATION_ID,
    });

    const { token } = await auth({ type: "installation" });

    /* -------------------- Build comment -------------------- */
    const commentBody = `
**Name:** ${name}
**Email:** ${email}
**Type:** ${type}
**Message:**
${body}
`.trim();


    /* -------------------- GraphQL mutation -------------------- */
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation AddComment($discussionId: ID!, $body: String!) {
            addDiscussionComment(input: {
              discussionId: $discussionId,
              body: $body
            }) {
              comment {
                id
                url
              }
            }
          }
        `,
        variables: {
          discussionId,
          body: commentBody,
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error("GitHub GraphQL Error:", result.errors);
      return res.status(400).json({
        error: result.errors[0].message,
      });
    }

    /* -------------------- Success -------------------- */
    return res.status(200).json({
      success: true,
      url: result.data.addDiscussionComment.comment.url,
    });

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
