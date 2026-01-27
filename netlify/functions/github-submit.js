/**
 * Project: GitHub App Contact Backend
 * Backend: Netlify/Node.js Serverless (ESM Version)
 * © 2026 Automation Expert. All rights reserved.
 */

import { createAppAuth } from "@octokit/auth-app";
import fetch from "node-fetch";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { title, body } = JSON.parse(event.body);

    // 1. Initialize Auth
    const auth = createAppAuth({
      appId: process.env.GH_APP_ID,
      privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, '\n'),
      installationId: process.env.GH_INSTALLATION_ID,
    });

    // 2. Get Token
    const { token } = await auth({ type: "installation" });

    // 3. Post to GraphQL
    const graphqlResponse = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation {
            createDiscussion(input: {
              repositoryId: "${process.env.GH_REPO_ID}",
              categoryId: "${process.env.GH_CATEGORY_ID}",
              title: "${title}",
              body: "${body}"
            }) {
              discussion { id }
            }
          }
        `,
      }),
    });

    const result = await graphqlResponse.json();

    if (result.errors) {
      console.error("GitHub API Error:", result.errors);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: result.errors[0].message }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};