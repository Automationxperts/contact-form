/**
 * Project: GitHub App Contact Backend (Vercel Stable)
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
    // 1. Handle CORS and Methods
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. Data Extraction
        // Note: Vercel sometimes doesn't parse the body if the Content-Type header is messy.
        const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { type, body, name, email } = data;

        const targetId = DISCUSSION_MAP[type];
        if (!targetId) throw new Error("Invalid inquiry type.");

        // 3. Initialize Octokit
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

        return res.status(200).json({ success: true, url: result.addDiscussionComment.comment.url });

    } catch (error) {
        console.error("Vercel Internal Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
