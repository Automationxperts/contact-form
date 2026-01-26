/**
 * Project: GitHub App Contact Backend
 * Backend: Netlify/Node.js Serverless
 * © 2026 Automation Expert. All rights reserved.
 */

const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { title, body } = JSON.parse(event.body);

    // 1. Initialize the GitHub App Auth
    const auth = createAppAuth({
      appId: process.env.GH_APP_ID,
      privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, '\n'),
      installationId: process.env.GH_INSTALLATION_ID,
    });

    // 2. Get an Installation Access Token
    const { token } = await auth({ type: "installation" });

    // 3. Use GraphQL to create the discussion
    // Using fetch-style or Octokit to hit the GraphQL endpoint
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

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success", id: result.data.createDiscussion.discussion.id }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to submit to GitHub" }),
    };
  }
};