import arcjet, { detectBot, shield, tokenBucket, slidingWindow} from "@arcjet/node";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
config({ path: envPath, override: false });

if(!process.env.ARCJET_KEY && process.env.NODE_ENV !== 'test') {
  throw new Error("ARCJET_KEY is not set");
}

const aj = arcjet({

  // Get your site key from https://app.arcjet.com and set it as an environment

  // variable rather than hard coding.

  key: process.env.ARCJET_KEY!,
  characteristics: ["ip.src"],

  rules: [

    // Shield protects your app from common attacks e.g. SQL injection

    shield({ mode: "LIVE" }),

    // Create a bot detection rule

    detectBot({

      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only

      // Block all bots except the following

      allow: [

        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc

        // Uncomment to allow these other common bot categories

        // See the full list at https://arcjet.com/bot-list

        "CATEGORY:MONITOR", // Uptime monitoring services

        "CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord

      ],

    }),

    // Create a token bucket rate limit. Other algorithms are supported.

    slidingWindow({
        
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      interval: '2s',
      max:5,
    })

  ],

});

export default aj;

