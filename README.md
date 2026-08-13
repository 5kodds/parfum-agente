# Parfum Agente V2.3

**Your scent, translated.**

Parfum Agente is a privacy-first fragrance discovery experience that turns a 12-question consultation into a six-dimension Scent DNA, an archetype, and ranked fragrance matches.

## Run locally

```bash
npm test
npm run serve
```

Then open `http://localhost:4173`.

The production frontend lives in `frontend/` and is deployed to GitHub Pages by `.github/workflows/pages.yml`.

See [the brand foundation](docs/BRAND.md) and [the product review and roadmap](docs/ROADMAP.md).

## Frontend
Copy everything inside `frontend/` to the root of the GitHub Pages repository.

The frontend works without the API and runs the local Scent Engine immediately.

To enable web grounding, add this before `app.js`:

```html
<script>window.PARFUM_AGENTE_API="https://YOUR-WORKER-DOMAIN";</script>
```

## API
Deploy `api/` as a Cloudflare Worker. The Worker keeps API credentials off the public site and calls a configured search/product API. Configure `SEARCH_API_URL` and the secret `SEARCH_API_KEY`.

The provider adapter expects a JSON object containing `results`. Update `normalize()` if your provider uses different fields.

## Grounding
Web results retain their source URL and are displayed separately from the curated local catalog. Do not invent prices, availability, reviews, retailer links or affiliate URLs.

## Affiliate schema
A fragrance may contain:

```json
"retailers":[{"name":"Retailer","url":"https://real-affiliate-url.example/..."}]
```

Only add verified affiliate links.


## V2.1 provider/enrichment layer

The recommended architecture is now a two-provider pipeline:

**Fragrance metadata → Scent enrichment → Commerce/affiliate offers → Parfum Agente ranking**

A fragrance metadata provider supplies structured fields such as:
- top / heart / base notes
- accords
- season / occasion signals
- longevity / sillage when available
- brand, release year and concentration

The commerce provider supplies:
- retailer
- price/currency
- availability
- product URL / affiliate URL
- product image

The Worker joins the two by normalized brand/product name and returns a single enriched fragrance object.

### Provider configuration

Set these Worker variables/secrets:

```text
FRAGELLA_URL
FRAGELLA_API_KEY
FRAGELLA_NAME
AFFILIATE_URL
AFFILIATE_API_KEY
AFFILIATE_NAME
```

The exact endpoint/credential format must follow the provider's current contract. Do not put either API key in the GitHub Pages frontend.

### Recommended provider choice

Fragella is a promising fragrance-specific metadata source to evaluate because its published description says it provides 13,000+ fragrances, note pyramids, accord percentages, season/occasion rankings, performance metrics and matching/search capabilities. This should be treated as a provider to verify/onboard, not as a claim that a free public API key is automatically available.

For commerce/affiliate data, Affiliate.com publishes a product API covering large numbers of merchants and product/offer fields including price, product identifiers and URLs. Its API requires customer access, so the Worker is designed to plug into it after account/API access is obtained.

Amazon's current official affiliate API is Creators API, which provides product search and item data for Associates; the older Product Advertising API is deprecated. It can be added as another commerce adapter later if Amazon is part of Parfum Agente's affiliate strategy.


## V2.2 — actual Fragella integration

The API layer now calls the documented Fragella REST API directly. The secret key stays server-side.

Base:
`https://api.fragella.com/api/v1/`

Authentication:
`x-api-key`

Primary recommendation endpoint:
`GET /fragrances/match`

Fallback:
`GET /fragrances`

The Worker normalizes Fragella fields including:
- `_id`
- `Name`
- `Brand`
- `Year`
- `Notes.Top`
- `Notes.Middle`
- `Notes.Base`
- `General Notes`
- `Main Accords`
- `Longevity`
- `Sillage`
- `OilType`
- `Purchase URL`
- image fields

It then maps the returned fragrance into the Parfum Agente recommendation layer and calculates a compatibility score from the user's preferred notes/families.

See `api/SETUP-FRAGELLA.md`.
