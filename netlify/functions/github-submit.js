/**
 * Project: GitHub App Contact Backend (Comment Mode)
 * Backend: Netlify/Node.js Serverless (ESM)
 * © 2026 Automation Expert. All rights reserved.
 */

import { createAppAuth } from "@octokit/auth-app";
import fetch from "node-fetch";

// Mapping frontend dropdown values to GitHub Discussion Global Node IDs
// Replace these with the IDs you found using the "Inspect Element" or "gh api" method
const DISCUSSION_MAP = {
    general: "D_kwDONkYa8s4Aj1Sn",
    feature: "D_kwDONkYa8s4Aj1Sk",
    bug: "D_kwDONkYa8s4Aj1St",
    feedback: "D_kwDONkYa8s4Aj1RP"
};

export const handler = async (event) => {
  // 1. Guard: Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 2. Parse payload from frontend
    // 'type' is the key from DISCUSSION_MAP, 'body' is the user's message
    const { type, body, name, email } = JSON.parse(event.body);
    
    const targetId = DISCUSSION_MAP[type];
    
    if (!targetId) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: "Invalid inquiry type selected." }) 
        };
    }

    // 3. Initialize GitHub App Authentication
    const auth = createAppAuth({
      appId: process.env.GH_APP_ID,
      privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, '\n'),
      installationId: process.env.GH_INSTALLATION_ID,
    });

    // 4. Generate the Installation Access Token
    const { token } = await auth({ type: "installation" });

    // 5. Construct the comment body
    // We include the sender's info inside the comment since it's all in one thread now
    const commentBody = `**Name:** ${name} **Email:** (${email})\n**Message:**\n${body}`;

    // 6. Execute GraphQL Mutation: addDiscussionComment
    const graphqlResponse = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
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
            discussionId: targetId,
            body: commentBody
        }
      }),
    });

    const result = await graphqlResponse.json();

    // 7. Handle GraphQL specific errors
    if (result.errors) {
      console.error("GraphQL Error:", result.errors);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: result.errors[0].message }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Success", url: result.data.addDiscussionComment.comment.url }),
    };

  } catch (error) {
    console.error("Serverless Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};