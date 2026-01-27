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
    // 1. Guard: Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. Extract Data from req.body (Vercel parses JSON automatically)
        const { type, body, name, email } = req.body;
        const targetId = DISCUSSION_MAP[type];

        if (!targetId) {
            return res.status(400).json({ error: "Invalid inquiry type." });
        }

        // 3. Initialize Octokit
        const octokit = new Octokit({
            authStrategy: (await import("@octokit/auth-app")).createAppAuth,
            auth: {
                appId: process.env.GH_APP_ID,
                privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, '\n'),
                installationId: process.env.GH_INSTALLATION_ID,
            },
        });

        const commentBody = `**Name:** ${name}\n**Email:** ${email}\n**Type:** ${type}\n**Message:**\n${body}`;

        // 4. Execute GraphQL Mutation
        const result = await octokit.graphql(`
            mutation AddComment($discussionId: ID!, $body: String!) {
                addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
                    comment { id url }
                }
            }
        `, {
            discussionId: targetId,
            body: commentBody
        });

        // 5. Success Response
        return res.status(200).json({ 
            message: "Success", 
            url: result.addDiscussionComment.comment.url 
        });

    } catch (error) {
        console.error("Vercel Function Error:", error);
        return res.status(500).json({ error: error.message });
    }
}