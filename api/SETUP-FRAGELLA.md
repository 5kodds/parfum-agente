# Fragella setup

1. Create/sign into a Fragella developer account.
2. Open the Fragella Developer Dashboard and copy the secret API key.
3. Deploy this Worker.
4. Store the key as a Worker secret named `FRAGELLA_API_KEY`.
5. Do NOT put the secret in GitHub Pages or `app.js`.

The current Fragella API base is:
`https://api.fragella.com/api/v1/`

Authentication is:
`x-api-key: YOUR_API_KEY`

Parfum Agente uses:
- `/fragrances/match` for note/accord matching
- `/fragrances` as a fallback fuzzy search
- `/usage` for quota monitoring

The Worker converts Fragella's response into Parfum Agente's normalized format:
brand, name, image, notes, accords, longevity, sillage, price and purchase URL.

The current API documentation says `/fragrances/match` supports accords plus top/middle/base/general notes, and `/fragrances/similar` can return similar scents. The implementation starts with `match` and falls back to fuzzy search when the match query is not accepted.

For Cloudflare:
`npx wrangler secret put FRAGELLA_API_KEY`
then:
`npx wrangler deploy`
