const RSSParser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const { detectRegions } = require('./regions');

const rssParser = new RSSParser({
  timeout: 10000,
});

// ── Wine Categories ──
const WINE_CATEGORIES = {
  'Business & Trade': [
    'wine business',
    'wine trade',
    'wine industry'
  ],
  'Connoisseur & Tasting': [
    'wine tasting',
    'sommelier',
    'wine connoisseur'
  ],
  'Wines by Region': [
    'wine regions',
    'world wine'
  ],
  'Grape Varieties': [
    'wine varietals',
    'grape varieties wine'
  ],
  'Winemaking & Viticulture': [
    'winemaking',
    'viticulture',
    'natural wine'
  ],
  'Wine Collecting & Investment': [
    'wine collecting',
    'wine investment',
    'fine wine'
  ],
  'Wine & Food': [
    'wine and food',
    'wine pairing dinner'
  ],
  'Wine Education': [
    'wine education',
    'WSET wine',
    'sommelier training'
  ],
  'Sustainability & Climate': [
    'sustainable wine',
    'organic wine',
    'climate change wine'
  ],
  'Emerging Wine Regions': [
    'new wine regions',
    'emerging wine'
  ],
  'Wineries': [
    'winery podcast',
    'winery tour',
    'winery stories'
  ]
};

// ── Spirits Categories ──
const SPIRITS_CATEGORIES = {
  'Whiskey': [
    'whiskey podcast',
    'bourbon podcast',
    'scotch whisky'
  ],
  'Tequila & Mezcal': [
    'tequila podcast',
    'mezcal podcast',
    'agave spirits'
  ],
  'Sotol': [
    'sotol spirit',
    'sotol Mexican spirit'
  ],
  'Bacanora': [
    'bacanora spirit',
    'bacanora agave'
  ],
  'Raicilla': [
    'raicilla spirit',
    'raicilla Mexican'
  ],
  'Pulque': [
    'pulque podcast',
    'pulque traditional'
  ],
  'Rum': [
    'rum podcast',
    'rum tasting'
  ],
  'Vodka': [
    'vodka podcast',
    'vodka review'
  ],
  'Gin': [
    'gin podcast',
    'gin tasting'
  ],
  'Brandy & Cognac': [
    'cognac podcast',
    'brandy podcast'
  ],
  'Spirits Business': [
    'spirits business',
    'spirits industry'
  ],
  'Cocktails & Mixology': [
    'cocktails podcast',
    'mixology podcast'
  ],
  'Cachaça': [
    'cachaça spirit',
    'cachaça Brazil',
    'cachaça cocktail'
  ],
  'Distilleries': [
    'distillery podcast',
    'distillery tour'
  ]
};

const MAX_RESULTS_PER_QUERY = 10;
const MAX_EPISODES_PER_PODCAST = 5;

// Blocklist: podcast names that aren't about wine/spirits
const NAME_BLOCKLIST = [
  /28 da(ys|tes) later/i,
  /movie/i,
  /film review/i,
  /corkbuzz/i,
  /ghost stor/i,
  /creepy/i,
  /true crime/i,
  /horror/i,
  /harrisburg news/i,
  /wall street week/i,
  /your world tonight/i,
  /economist podcast/i,
  /the intelligence from/i,
  /reversing climate change/i,
  /what if we get it right/i,
  /true beauty podcast/i,
  /song exploder/i,
];

function isPodcastBlocked(name) {
  for (const pattern of NAME_BLOCKLIST) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/**
 * Determine beverageType from a podcast's categories.
 */
function getBeverageType(categories) {
  const wineNames = new Set(Object.keys(WINE_CATEGORIES));
  const spiritsNames = new Set(Object.keys(SPIRITS_CATEGORIES));
  let hasWine = false;
  let hasSpirits = false;
  for (const cat of categories) {
    if (wineNames.has(cat)) hasWine = true;
    if (spiritsNames.has(cat)) hasSpirits = true;
  }
  if (hasSpirits) return 'spirits';
  return 'wine';
}

async function searchITunes(query) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=${MAX_RESULTS_PER_QUERY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`iTunes API error: ${response.status}`);
  }
  const data = await response.json();
  return data.results || [];
}

async function fetchWithTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchRSSEpisodes(feedUrl) {
  try {
    const feed = await fetchWithTimeout(rssParser.parseURL(feedUrl), 8000);
    const episodes = (feed.items || []).slice(0, MAX_EPISODES_PER_PODCAST).map(item => ({
      title: item.title || 'Untitled Episode',
      pubDate: item.pubDate || item.isoDate || null,
      duration: item.itunes?.duration || null,
      audioUrl: item.enclosure?.url || null
    }));
    return episodes;
  } catch (err) {
    console.error(`    Failed to parse RSS feed: ${err.message}`);
    return [];
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllPodcasts() {
  const allPodcasts = new Map();
  const seenNames = new Set();

  // Process both wine and spirits categories
  const allCategories = { ...WINE_CATEGORIES, ...SPIRITS_CATEGORIES };

  for (const [category, queries] of Object.entries(allCategories)) {
    console.log(`\nFetching category: ${category}`);

    for (const query of queries) {
      console.log(`  Searching: "${query}"`);
      try {
        const results = await searchITunes(query);

        for (const result of results) {
          const podcastId = result.collectionId;
          if (!podcastId) continue;

          const podcastName = result.collectionName || result.trackName || '';
          if (isPodcastBlocked(podcastName)) {
            console.log(`    Blocked: "${podcastName}"`);
            continue;
          }

          const nameLower = podcastName.toLowerCase().trim();
          if (seenNames.has(nameLower)) {
            console.log(`    Skipping duplicate name: "${podcastName}"`);
            continue;
          }

          if (allPodcasts.has(podcastId)) {
            const existing = allPodcasts.get(podcastId);
            if (!existing.categories.includes(category)) {
              existing.categories.push(category);
            }
            continue;
          }

          const searchText = podcastName + ' ' + (result.artistName || '');
          seenNames.add(nameLower);
          allPodcasts.set(podcastId, {
            name: result.collectionName || result.trackName || 'Unknown Podcast',
            author: result.artistName || 'Unknown',
            artwork: result.artworkUrl600 || result.artworkUrl100 || result.artworkUrl60 || '',
            description: result.description || '',
            feedUrl: result.feedUrl || '',
            categories: [category],
            regions: detectRegions(searchText),
            episodes: []
          });
        }

        console.log(`    Found ${results.length} results`);
        await sleep(500);
      } catch (err) {
        console.error(`    Error searching "${query}": ${err.message}`);
      }
    }
  }

  return allPodcasts;
}

const MAX_PODCASTS_TO_ENRICH = 500;

async function enrichWithEpisodes(podcastsMap) {
  const podcasts = Array.from(podcastsMap.values());
  const toEnrich = podcasts.filter(p => p.feedUrl).slice(0, MAX_PODCASTS_TO_ENRICH);
  console.log(`\nFetching episodes for ${toEnrich.length} of ${podcasts.length} podcasts (cap: ${MAX_PODCASTS_TO_ENRICH})...`);

  let succeeded = 0;
  let failed = 0;

  // Fetch in parallel batches of 10 for speed
  const BATCH_SIZE = 10;
  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const batch = toEnrich.slice(i, i + BATCH_SIZE);
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toEnrich.length / BATCH_SIZE)} (${batch.length} podcasts)`);
    await Promise.all(batch.map(async (podcast) => {
      podcast.episodes = await fetchRSSEpisodes(podcast.feedUrl);
      if (podcast.episodes.length > 0) {
        succeeded++;
      } else {
        failed++;
      }
    }));
    await sleep(200);
  }

  for (const podcast of podcasts) {
    if (!podcast.episodes) podcast.episodes = [];
  }

  console.log(`\n  Episode fetch complete: ${succeeded} succeeded, ${failed} failed/empty`);
  return podcasts;
}

async function main() {
  console.log('Wine & Spirits Media Hub — Podcast Fetcher');
  console.log('===========================================');

  const podcastsMap = await fetchAllPodcasts();
  const podcasts = await enrichWithEpisodes(podcastsMap);

  // Set beverageType based on final categories
  for (const podcast of podcasts) {
    podcast.beverageType = getBeverageType(podcast.categories);
  }

  // Remove podcasts with no playable episodes
  const before = podcasts.length;
  const playable = podcasts.filter(p => p.episodes && p.episodes.length > 0);
  console.log(`\nRemoved ${before - playable.length} podcasts with no playable episodes (${playable.length} remaining)`);

  // Sort by most recent episode date (newest first), then by name as tiebreaker
  playable.sort((a, b) => {
    const aDate = a.episodes && a.episodes.length > 0 ? new Date(a.episodes[0].pubDate || 0) : new Date(0);
    const bDate = b.episodes && b.episodes.length > 0 ? new Date(b.episodes[0].pubDate || 0) : new Date(0);
    const dateDiff = bDate - aDate;
    if (dateDiff !== 0) return dateDiff;
    return a.name.localeCompare(b.name);
  });

  // Strip feedUrl (not needed on the frontend)
  const cleanPodcasts = playable.map(({ feedUrl, ...rest }) => rest);

  const output = {
    lastUpdated: new Date().toISOString(),
    totalPodcasts: cleanPodcasts.length,
    podcasts: cleanPodcasts
  };

  const outPath = path.join(__dirname, '..', 'data', 'podcasts.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\nDone! Saved ${cleanPodcasts.length} podcasts to data/podcasts.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
