# Wine & Spirits Media Hub

A fully automated content platform that curates wine and spirits YouTube videos and podcasts in a split-screen layout. Hosted on GitHub Pages, refreshed twice weekly via GitHub Actions.

**Live site:** https://noshmama.github.io/wine-spirits-media-hub/

---

## Architecture Overview

```
wine-spirits-media-hub/
├── index.html                          # Main page (single-page app)
├── css/
│   └── styles.css                      # All styling (responsive, mobile-first)
├── js/
│   ├── app.js                          # Shared utilities, modal handling, category lists
│   ├── youtube-panel.js                # YouTube panel: filtering, pagination, video embed
│   └── podcast-panel.js                # Podcast panel: filtering, pagination, audio players
├── scripts/
│   ├── fetch-youtube.js                # YouTube Data API v3 + RSS hybrid fetcher
│   ├── fetch-podcasts.js               # iTunes Search API + RSS feed fetcher
│   └── regions.js                      # Shared geographic region detection module
├── data/
│   ├── youtube.json                    # Auto-generated video metadata (up to 200 entries)
│   ├── podcasts.json                   # Auto-generated podcast metadata (up to 200 entries)
│   └── known-channels.json            # Discovered YouTube channel IDs for RSS fetching
├── images/
│   ├── profile.jpg                     # Creator profile photo (About modal)
│   └── game-button.jpg                 # Trivia game medallion button
├── .github/workflows/
│   └── update-content.yml              # Automated refresh (Wed + Sun, 8:30 AM UTC)
├── package.json                        # Dependencies: googleapis, rss-parser
└── README.md
```

---

## How It Works

### Data Pipeline

The site stores **no video or audio files** — only metadata and links. Two Node.js scripts fetch content from external APIs and save lightweight JSON files:

**YouTube (`scripts/fetch-youtube.js`)**
- **Phase 1 — RSS feeds (free):** Checks up to 75 known channels via YouTube's public RSS feeds (`youtube.com/feeds/videos.xml?channel_id=...`). Zero API quota cost. Channel IDs are discovered during search and saved to `data/known-channels.json`.
- **Phase 2 — Search API (quota-based):** Uses YouTube Data API v3 to discover new content across 24 categories (11 wine + 13 spirits). Skips categories where the newest video is less than 2 days old (category caching).
- **Filters:** Non-English content detection (non-Latin scripts + European language common words), title/channel blocklists (gaming, politics, beauty, cooking, etc.), region detection via keyword matching.
- **Output:** `data/youtube.json` — up to 200 videos with videoId, title, channel, thumbnail URL, publish date, categories, beverageType, and regions.

**Podcasts (`scripts/fetch-podcasts.js`)**
- Uses iTunes Search API (free, no key) to find podcasts, then fetches RSS feeds via `rss-parser` for episode details.
- **Filters:** iTunes `languageCodesISO2A` field (rejects non-English), name/author blocklist, non-Latin script detection.
- **Output:** `data/podcasts.json` — up to 200 podcasts with name, author, artwork URL, description, categories, beverageType, regions, and up to 5 episodes each (title, date, duration, audio stream URL).

### Content Categories

**Wine (11 categories):**
Business & Trade, Tasting & Sommelier, Wines by Region, Grape Varieties, Winemaking & Viticulture, Wine Collecting & Investment, Wine & Food, Wine Education, Sustainability & Climate, Emerging Wine Regions, Wineries

**Spirits (13 categories):**
Whiskey, Tequila & Mezcal, Sotol, Bacanora, Raicilla, Pulque, Rum, Vodka, Gin, Brandy & Cognac, Spirits Business, Cocktails & Mixology, Distilleries

### Region Detection (`scripts/regions.js`)

Each video and podcast is tagged with geographic regions based on keyword matching against titles and channel/author names. Regions include US states (Kentucky, Tennessee, Texas, California, etc.), European countries/regions (Scotland, Scottish Isles, France/Cognac/Armagnac, etc.), Mexican states (Jalisco, Oaxaca, Chihuahua, Sonora), Caribbean islands (Cuba, Jamaica, Martinique, etc.), and others.

### Frontend

**Stack:** Plain HTML, CSS, JavaScript — no frameworks.

**`index.html`** — Single page with:
- Header: site title, tagline, "About The Creator" button, trivia game medallion link, analyses popup link
- Split-screen layout: YouTube (left panel) and Podcasts (right panel)
- Beverage toggle (All / Wine / Spirits) per panel
- Dynamic category dropdown (changes based on beverage selection, uses `<optgroup>`)
- Region dropdown filter
- Text search with 200ms debounce
- Modals: About Me (profile + contact form), Video Player (YouTube iframe embed), Industry Analyses (reports, workflow projects, game, LinkedIn, contact)

**`js/app.js`** — Shared utilities:
- `fetchData()`, `formatDate()`, `escapeHtml()`, `renderError()`
- `populateCategories()` — dynamically rebuilds category dropdown based on beverage toggle
- `IntersectionObserver` for lazy image loading
- Modal open/close handlers
- Contact form submission via FormSubmit.co (email obfuscated in JS)

**`js/youtube-panel.js`** and **`js/podcast-panel.js`** — Panel logic:
- Build all cards once on page load (one-time DOM creation)
- Filter by toggling CSS `display` property — no DOM rebuild on filter change
- `data-categories`, `data-beverage`, `data-regions`, `data-searchtext` attributes on each card
- 30-item pagination with "Show more" button
- YouTube: click opens iframe embed modal; Podcasts: click toggles episode list with HTML5 audio players

**`css/styles.css`** — Responsive design:
- Mobile-first approach (base styles for mobile, `min-width: 1025px` for desktop)
- Wine-themed color palette: burgundy (#722F37), gold (#C9A84C), cream (#FAF6F0)
- Category badges: gold for wine, blue for spirits

### Automated Refresh

**`.github/workflows/update-content.yml`**

Two independent parallel jobs run every Wednesday and Sunday at 8:30 AM UTC:
- `update-youtube` (15-min timeout) — fetches videos, commits `data/youtube.json` + `data/known-channels.json`
- `update-podcasts` (30-min timeout) — fetches podcasts, commits `data/podcasts.json`

If one job fails, the other still saves its data.

**API Keys:**
- `YOUTUBE_API_KEY` — for local development/testing
- `YOUTUBE_API_KEY_CI` — dedicated key for GitHub Actions (separate daily quota)

---

## Performance Optimizations

| Optimization | Impact |
|---|---|
| One-time DOM build, CSS show/hide filtering | Instant category/search filtering on mobile |
| IntersectionObserver lazy image loading | Only loads images visible on screen |
| 30-item pagination with "Show more" | Fast initial render with 200+ cards |
| JSON field trimming (no unused data) | Smaller download size |
| RSS hybrid YouTube fetching | Reduces API quota usage by checking known channels for free |
| Category caching (skip fresh categories) | Fewer API calls on subsequent runs |
| Separate CI API key | Local dev never blocks automated refresh |
| Split workflow jobs | One failure doesn't block the other |

---

## Local Development

```bash
# Install dependencies
npm install

# Fetch YouTube videos (requires API key)
YOUTUBE_API_KEY=your_key node scripts/fetch-youtube.js

# Fetch podcasts (no key needed)
node scripts/fetch-podcasts.js

# Serve locally
npx serve .
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `googleapis` | YouTube Data API v3 client |
| `rss-parser` | Parse podcast RSS feeds + YouTube channel RSS |
