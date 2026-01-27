/**
 * Project: GitHub App Contact Backend (Vercel Dedicated)
 * Path: /api/github-submit.js
 * © 2026 Automation Expert. All rights reserved.
 */

import { Octokit } from "octokit";

const DISCUSSION_MAP = {
    general: "D_kwDONkYa8s4Aj1Sn",
    feature: "D_kwDONkYa8s4Aj1Sk",
    bug: "D_kwDONkYa8s4Aj1St",
    feedback: "D_kwDONkYa8s4Aj1RP"
};

export default async function handler(req, res) {
    // 1. Handle CORS Pre-flight & Method Guard
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. Extract Data (Vercel parses JSON bodies into req.body automatically)
        const { type, body, name, email } = req.body;
        const targetId = DISCUSSION_MAP[type];

        if (!targetId) {
            return res.status(400).json({ error: "Invalid inquiry type selected." });
        }

        // 3. Initialize Octokit
        // Note: Using dynamic import for auth-app to prevent bundling issues
        const { createAppAuth } = await import("@octokit/auth-app");
        
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.GH_APP_ID,
                privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, '\n'),
                installationId: process.env.GH_INSTALLATION_ID,
            },
        });

        const commentBody = `**Name:** ${name}\n**Email:** ${email}\n**Type:** ${type}\n**Message:**\n${body}`;

        // 4. GraphQL Mutation
        const result = await octokit.graphql(`
            mutation AddComment($discussionId: ID!, $body: String!) {
                addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
                    comment { url }
                }
            }
        `, {
            discussionId: targetId,
            body: commentBody
        });

        return res.status(200).json({ 
            success: true, 
            url: result.addDiscussionComment.comment.url 
        });

    } catch (error) {
        console.error("Vercel Function Failure:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
