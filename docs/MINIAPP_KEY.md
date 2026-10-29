# Mini-app key contract

`k = base64url(payload) + "." + base64url(HMAC_SHA256(secret, base64url(payload)))`
The HMAC input is the ASCII bytes of the base64url payload string (not the decoded JSON). base64url has no padding.

Payload: `{ "uid": "<firebase uid>", "name": "<displayName>", "trip": "<tripId>", "app": "<slug>", "exp": <unix seconds> }`

Minting (Majestic Cloud Function):
- `exp` = now + 24h, fresh on every tap. The site rejects `exp` more than 25h ahead.
- `app` = first path segment of the target URL (`ss` for `https://ericarmstrong.tech/ss/`).
- Allowlisted host: `ericarmstrong.tech` (add `www.` only if the site serves it). Never attach a key to another host.
- Append as `?k=<key>`.

Site verification (`src/lib/miniappkey.js`): exactly one `.`, strict base64url, length <= 2048, constant-time HMAC check,
integer `exp` in the future, `app` matches the page, non-empty `uid`/`trip`, and `trip` matches `src/roster.js`.
Any failure returns a bare 403 "no permission" (noindex). A valid key is exchanged for an HttpOnly `__Host-ms_ss` cookie
and the browser is redirected to the same URL without `k`.

Secret: one random 32+ byte value, set as a Firebase Secret Manager secret and as the Worker secret `MINIAPP_KEY_SECRET`.
Rotating it invalidates all keys and cookies.

Known limits: a live key can be forwarded by its holder until it expires; removing a member doesn't revoke a minted key.
