import { createAppAuth } from "@octokit/auth-app";

const DISCUSSION_MAP = {
  general: "D_kwDONkYa8s4Aj1Sn",
  feature: "D_kwDONkYa8s4Aj1Sk",
  bug: "D_kwDONkYa8s4Aj1St",
  feedback: "D_kwDONkYa8s4Aj1RP",
};

export async function addDiscussionComment({ type, body, name, email }) {
  const discussionId = DISCUSSION_MAP[type];
  if (!discussionId) {
    throw new Error("Invalid inquiry type selected.");
  }

  const auth = createAppAuth({
    appId: process.env.GH_APP_ID,
    privateKey: process.env.GH_PRIVATE_KEY.replace(/\\n/g, "\n"),
    installationId: process.env.GH_INSTALLATION_ID,
  });

  const { token } = await auth({ type: "installation" });

  const commentBody = `**Name:** ${name}
**Email:** ${email}
**Type:** ${type}

**Message:**
${body}`;

  const response = await fetch("https://api.github.com/graphql", {
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
              url
            }
          }
        }
      `,
      variables: { discussionId, body: commentBody },
    }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data.addDiscussionComment.comment.url;
}
