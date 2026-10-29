// Local test helper: mint a key like the Majestic Cloud Function will.
// usage: MINIAPP_KEY_SECRET=... node scripts/mint.mjs <uid> <name> <trip> [ttlSeconds]
import { signKey } from "../src/lib/miniappkey.js";
const [uid, name, trip, ttl = "86400"] = process.argv.slice(2);
const secret = process.env.MINIAPP_KEY_SECRET;
if (!secret || !trip) { console.error("usage: MINIAPP_KEY_SECRET=... node scripts/mint.mjs <uid> <name> <trip> [ttl]"); process.exit(1); }
console.log(await signKey({ uid, name, trip, app: "ss", exp: Math.floor(Date.now() / 1000) + Number(ttl) }, secret));
