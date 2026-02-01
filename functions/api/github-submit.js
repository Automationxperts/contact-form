/**
 * Project: GitConnect Unified Backend (AutomationExpert Factory)
 * Platform: Cloudflare Pages (Standalone)
 * © 2026 Automation Expert. All rights reserved.
 */

// We use the full ESM URL to bypass the local build/dependency issues entirely.
// import { createAppAuth } from "https://esm.sh/@octokit/auth-app@7.1.1";
import { createAppAuth } from "@octokit/auth-app";

/**
 * CORE LOGIC
 */
async function executeSubmission(payload, env) {
  const { type, body, name, email } = payload;
  
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
      "User-Agent": "AutomationExpert-Factory"
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
/* CLOUDFLARE PAGES HANDLER                                                   */
/* -------------------------------------------------------------------------- */

export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    const payload = await request.json();
    const result = await executeSubmission(payload, env);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Execution Error" }), { 
      status: err.status || 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};

// Handle CORS Pre-flight (Browsers send OPTIONS before POST)
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};