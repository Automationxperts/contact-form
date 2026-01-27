/**
 * Project: GitHub App Contact Backend (Universal)
 * Platforms: Netlify & Vercel
 * © 2026 Automation Expert. All rights reserved.
 */

import { createAppAuth } from "@octokit/auth-app";

// Mapping frontend dropdown values to GitHub Discussion Global Node IDs
const DISCUSSION_MAP = {
    general: "D_kwDONkYa8s4Aj1Sn",
    feature: "D_kwDONkYa8s4Aj1Sk",
    bug: "D_kwDONkYa8s4Aj1St",
    feedback: "D_kwDONkYa8s4Aj1RP"
};

/**
 * Core Business Logic: Process the GitHub Mutation
 */
async function processSubmission(payload) {
    const { type, body, name, email } = payload;
    const targetId = DISCUSSION_MAP[type];

    if (!targetId) throw new Error("Invalid inquiry type selected.");

    // Initialize GitHub App Authentication
    const auth = createAppAuth({
        appId: process.env.GH_APP_ID,
        privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, '\n'),
        installationId: process.env.GH_INSTALLATION_ID,
    });

    const { token } = await auth({ type: "installation" });
    const commentBody = `**Name:** ${name}\n**Email:** ${email}\n**Type:** ${type}\n**Message:**\n${body}`;

    const graphqlResponse = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: `
                mutation AddComment($discussionId: ID!, $body: String!) {
                    addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
                        comment { id url }
                    }
                }
            `,
            variables: { discussionId: targetId, body: commentBody }
        }),
    });

    const result = await graphqlResponse.json();
    if (result.errors) throw new Error(result.errors[0].message);

    return { message: "Success", url: result.data.addDiscussionComment.comment.url };
}

/**
 * 1. Vercel Handler (Default Export)
 */
export default async function vercelHandler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const result = await processSubmission(req.body);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Vercel Error:", error);
        return res.status(500).json({ error: error.message });
    }
}

/**
 * 2. Netlify Handler (Named Export)
 */
export const handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    try {
        const payload = JSON.parse(event.body);
        const result = await processSubmission(payload);
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error("Netlify Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};