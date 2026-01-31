// functions/github-submit.js
// This is the Cloudflare Pages "Entry Point"
import { fetch as workerHandler } from "../api/github-submit.js";

export const onRequestPost = async (context) => {
  // Cloudflare Pages Functions provide a 'context' object
    // context.request = the incoming request
      // context.env = your environment variables/secrets
        return workerHandler(context.request, context.env);
        };
        