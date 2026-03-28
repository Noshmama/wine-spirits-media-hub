const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const { detectRegions } = require('./regions');

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('Error: YOUTUBE_API_KEY environment variable is not set.');
  process.exit(1);
}

const youtube = google.youtube({ version: 'v3', auth: API_KEY });
const rssParser = new Parser();

const DATA_DIR = path.join(__dirname, '..', 'data');
const YOUTUBE_JSON_PATH = path.join(DATA_DIR, 'youtube.json');
const KNOWN_CHANNELS_PATH = path.join(DATA_DIR, 'known-channels.json');

// Maximum number of known channels to check via RSS (keeps it fast)
const MAX_RSS_CHANNELS = 75;

// ── Wine Categories ──
const WINE_CATEGORIES = {
  'Business & Trade': [
    'wine business',
    'wine industry',
    'wine trade',
    'wine market'
  ],
  'Tasting & Sommelier': [
    'wine tasting notes',
    'sommelier wine',
    'wine review tasting',
    'wine pairing food'
  ],
  'Wines by Region': [
    'French wine',
    'Italian wine',
    'Napa Valley wine',
    'Rioja wine',
    'Burgundy wine'
  ],
  'Grape Varieties': [
    'Cabernet Sauvignon wine',
    'Pinot Noir wine',
    'Chardonnay wine',
    'Merlot wine',
    'Riesling wine'
  ],
  'Winemaking & Viticulture': [
    'winemaking process',
    'viticulture',
    'wine harvest',
    'wine fermentation',
    'natural wine'
  ],
  'Wine Collecting & Investment': [
    'wine collecting',
    'wine auction',
    'wine cellar',
    'wine investment'
  ],
  'Wine & Food': [
    'cooking with wine',
    'wine dinner pairing',
    'restaurant wine list',
    'wine and cheese'
  ],
  'Wine Education': [
    'WSET wine',
    'wine certification',
    'sommelier exam',
    'wine school'
  ],
  'Sustainability & Climate': [
    'organic wine',
    'biodynamic wine',
    'climate change wine',
    'sustainable vineyard'
  ],
  'Emerging Wine Regions': [
    'Georgian wine',
    'English sparkling wine',
    'Chinese wine',
    'Croatian wine'
  ],
  'Wineries': [
    'winery tour',
    'winery visit',
    'best wineries',
    'winery behind the scenes'
  ]
};

// ── Spirits Categories ──
const SPIRITS_CATEGORIES = {
  'Whiskey': [
    'whiskey tasting',
    'bourbon review',
    'scotch whisky',
    'rye whiskey'
  ],
  'Tequila & Mezcal': [
    'tequila tasting',
    'mezcal review',
    'agave spirits'
  ],
  'Sotol': [
    'sotol spirit',
    'sotol tasting',
    'sotol Chihuahua'
  ],
  'Bacanora': [
    'bacanora spirit',
    'bacanora Sonora',
    'bacanora tasting'
  ],
  'Raicilla': [
    'raicilla spirit',
    'raicilla Jalisco',
    'raicilla tasting'
  ],
  'Pulque': [
    'pulque drink',
    'pulque Mexico',
    'pulque agave'
  ],
  'Rum': [
    'rum tasting',
    'rum review',
    'craft rum'
  ],
  'Vodka': [
    'vodka tasting',
    'craft vodka',
    'vodka review'
  ],
  'Gin': [
    'gin tasting',
    'gin review',
    'craft gin'
  ],
  'Brandy & Cognac': [
    'cognac tasting',
    'brandy review',
    'armagnac'
  ],
  'Spirits Business': [
    'spirits industry',
    'spirits business',
    'liquor industry'
  ],
  'Cocktails & Mixology': [
    'cocktail making',
    'mixology guide',
    'craft cocktails'
  ],
  'Cachaça': [
    'cachaça tasting',
    'cachaça review',
    'cachaça Brazil',
    'cachaça cocktail'
  ],
  'Distilleries': [
    'distillery tour',
    'distillery visit',
    'craft distillery'
  ]
};

const MAX_RESULTS_PER_QUERY = 10;

// Blocklist: titles or channels that aren't about wine/spirits
const TITLE_BLOCKLIST = [
  /28 days later/i,
  /movie\s*(review|trailer|clip|scene)/i,
  /official\s*trailer/i,
  /film\s*review/i,
  /\bnails?\s*(2026|2025|trend|look|art|design|polish)/i,
  /\bmanicure\b/i,
  /\bagriculture\b/i,
  /\bfarming\s*(types?|methods?|techniques?)\b/i,
  /\bbutter\s*sommelier\b/i,
  /\bjazz\b/i,
  /\blofi\b/i,
  /\bplaylist\b/i,
  /\bambience\b/i,
  /\bchill\s*(beats?|music|vibes?)\b/i,
  /\bbeer\b/i,
  /\bbrewer(y|ies|ing)?\b/i,
  /\bbrews\b/i,
  /\bkombucha\b/i,
  /\blipstick\b/i,
  /\bmakeup\b/i,
  /\bcosmetic/i,
  /\bfoundation\b.*\bshade/i,
  /\beyeshadow\b/i,
  /\bblush\b.*\b(palette|shade|swatch)/i,
  /\bnail\s*polish\b/i,
  /\bnail\s*color\b/i,
  /\bbeauty\s*(routine|tutorial|hack|tip|look|review)/i,
  /\bskincare\b/i,
  /\bhair\s*(color|dye|style|tutorial)/i,
  /\blips?\b.*\blike\b/i,
  /\blip\s*(liner|gloss|stick|shade|color|tint)/i,
  /\bpaella\b/i,
  /\bseafood\b/i,
  /\bprotest(ors?|ers?)?\b/i,
  /\boverdose/i,
  /\bhospital\b/i,
  /\bperfum/i,
  /\benglish\s*(podcast|lesson|class|learn)/i,
  /\bcook(s|ing|ed)?\s*(and|&)\s*(eat|eater)/i,
  /\betiquette\b/i,
  /\bmanners\b/i,
  /\bpolitics\b/i,
  /\btrump\b/i,
  /\belection\b/i,
  /\baiming\b/i,
  /\bgun\b/i,
  /\bfirearm/i,
  /\bshoot(ing|er)?\b/i,
  /\brifle\b/i,
  /\bammunition\b/i,
  /\bvlog\b/i,
  /\bgot\s*drunk\b/i,
  /\bspa\s*day\b/i,
  /\bgrwm\b/i,
  /\bget\s*ready\s*with\s*me\b/i,
  /\bminecraft\b/i,
  /\bhypixel\b/i,
  /\bbedwars?\b/i,
  /\bfortnite\b/i,
  /\broblox\b/i,
  /\bgaming\b/i,
  /\bvideo\s*game/i,
  /\bgameplay\b/i,
  /\bstreamer\b/i,
  /\btwitch\b/i,
];

const CHANNEL_BLOCKLIST = [];

function isBlocked(title, channel) {
  for (const pattern of TITLE_BLOCKLIST) {
    if (pattern.test(title)) return true;
  }
  for (const pattern of CHANNEL_BLOCKLIST) {
    if (pattern.test(channel)) return true;
  }
  return false;
}

// Filter out non-English content by detecting non-Latin scripts
function isNonEnglish(text) {
  const nonLatin = text.replace(/[\x00-\x7F\u00C0-\u024F\u1E00-\u1EFF]/g, '').replace(/\s/g, '');
  const total = text.replace(/\s/g, '').length;
  if (total === 0) return false;
  if ((nonLatin.length / total) > 0.3) return true;

  // Also catch Western European languages by common words
  const lower = text.toLowerCase();
  const foreignPatterns = [
    /\b(der|die|das|und|oder|mit|ein|eine|für|ist|nicht|auch|auf|aus|dem|den|des|sich|wie|noch|bei)\b/,  // German
    /\b(le|la|les|des|une|est|dans|pour|avec|sur|qui|que|pas|sont|nous|mais|vous|cette|tout|plus)\b/,     // French
    /\b(il|della|delle|degli|nel|nella|sono|che|con|una|per|alla|questo|anche|dal|dei|gli|sua|tra)\b/,     // Italian
    /\b(el|los|las|del|una|por|con|para|que|más|pero|como|esto|desde|todo|esta|estos|sobre|tiene)\b/,      // Spanish
    /\b(het|een|van|dat|voor|zijn|ook|aan|naar|maar|nog|uit|dan|hun|haar|werd|wordt|deze|geen)\b/,         // Dutch
    /\b(och|att|det|som|för|med|den|har|till|inte|var|kan|ett|hade|från|ska|alla|min|efter)\b/,             // Swedish/Norwegian
    /\b(e|ou|para|com|uma|não|por|mais|como|sua|dos|das|pelo|esta|esse|isso|são|foi|nos)\b/,               // Portuguese
  ];

  let matches = 0;
  for (const pattern of foreignPatterns) {
    const found = lower.match(new RegExp(pattern.source, 'g'));
    if (found) matches += found.length;
  }

  // If 3+ foreign common words detected, likely non-English
  return matches >= 3;
}

/**
 * Determine beverageType from a video's categories.
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

// ─── Improvement 2: Cache/skip stale categories ───

/**
 * Load existing youtube.json and determine which categories are fresh
 * (newest video published less than 2 days ago). Returns a Set of
 * category names that can be skipped.
 */
function getFreshCategories() {
  if (!fs.existsSync(YOUTUBE_JSON_PATH)) {
    console.log('No existing youtube.json found — will fetch all categories.');
    return new Set();
  }

  let existing;
  try {
    existing = JSON.parse(fs.readFileSync(YOUTUBE_JSON_PATH, 'utf8'));
  } catch (err) {
    console.log(`Could not parse existing youtube.json: ${err.message} — will fetch all categories.`);
    return new Set();
  }

  if (!existing.videos || !Array.isArray(existing.videos)) {
    return new Set();
  }

  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const freshCategories = new Set();

  // Build a map: category -> newest publishedAt timestamp
  const newestByCategory = {};
  for (const video of existing.videos) {
    if (!video.categories) continue;
    const ts = new Date(video.publishedAt).getTime();
    for (const cat of video.categories) {
      if (!newestByCategory[cat] || ts > newestByCategory[cat]) {
        newestByCategory[cat] = ts;
      }
    }
  }

  for (const [cat, ts] of Object.entries(newestByCategory)) {
    if (ts > twoDaysAgo) {
      freshCategories.add(cat);
    }
  }

  if (freshCategories.size > 0) {
    console.log(`Skipping ${freshCategories.size} fresh categories: ${[...freshCategories].join(', ')}`);
  }

  return freshCategories;
}

// ─── Improvement 3: Known channels & RSS feed hybrid ───

/**
 * Load known channel IDs from data/known-channels.json.
 * Returns a Map of channelId -> channelTitle.
 */
function loadKnownChannels() {
  if (!fs.existsSync(KNOWN_CHANNELS_PATH)) {
    return new Map();
  }
  try {
    const data = JSON.parse(fs.readFileSync(KNOWN_CHANNELS_PATH, 'utf8'));
    // data is an array of { channelId, channelTitle, lastSeen }
    return new Map(data.map(c => [c.channelId, c]));
  } catch (err) {
    console.log(`Could not parse known-channels.json: ${err.message}`);
    return new Map();
  }
}

/**
 * Save known channel IDs to data/known-channels.json.
 */
function saveKnownChannels(channelsMap) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = Array.from(channelsMap.values());
  // Sort by lastSeen descending so the most recently seen are first
  data.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  fs.writeFileSync(KNOWN_CHANNELS_PATH, JSON.stringify(data, null, 2));
  console.log(`Saved ${data.length} known channels to data/known-channels.json`);
}

/**
 * Fetch recent videos from a channel's RSS feed (free, no API quota).
 * Returns an array of video objects or empty array on failure.
 */
async function fetchChannelRSS(channelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const feed = await rssParser.parseURL(feedUrl);
    return (feed.items || []).map(item => {
      // RSS item has: title, link, pubDate, author, id (yt:video:XXXX)
      const videoId = item.id ? item.id.replace('yt:video:', '') : null;
      if (!videoId) return null;
      return {
        videoId,
        title: item.title || '',
        channel: item.author || feed.title || '',
        channelId,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: item.pubDate || item.isoDate || null,
      };
    }).filter(Boolean);
  } catch (err) {
    console.log(`    RSS fetch failed for channel ${channelId}: ${err.message}`);
    return [];
  }
}

/**
 * Fetch videos from known channels via RSS feeds.
 * Returns an array of video-like objects (without categories yet).
 */
async function fetchFromKnownChannels(knownChannelsMap) {
  const channels = Array.from(knownChannelsMap.values());
  // Limit to most recent MAX_RSS_CHANNELS channels
  const channelsToCheck = channels.slice(0, MAX_RSS_CHANNELS);

  if (channelsToCheck.length === 0) {
    console.log('No known channels to check via RSS.');
    return [];
  }

  console.log(`\nChecking ${channelsToCheck.length} known channels via RSS feeds (free, no quota)...`);
  const allRSSVideos = [];

  for (const ch of channelsToCheck) {
    const videos = await fetchChannelRSS(ch.channelId);
    if (videos.length > 0) {
      console.log(`  RSS: ${ch.channelTitle} — ${videos.length} videos`);
      allRSSVideos.push(...videos);
    }
  }

  console.log(`RSS feeds returned ${allRSSVideos.length} total videos.`);
  return allRSSVideos;
}

async function searchVideos(query) {
  const response = await youtube.search.list({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: MAX_RESULTS_PER_QUERY,
    order: 'date',
    relevanceLanguage: 'en',
    safeSearch: 'moderate'
  });
  return response.data.items || [];
}

async function fetchAllVideos() {
  const allVideos = new Map();
  const freshCategories = getFreshCategories();
  const knownChannelsMap = loadKnownChannels();

  // ─── Phase 1: Fetch from known channels via RSS (free) ───
  const rssVideos = await fetchFromKnownChannels(knownChannelsMap);

  for (const rv of rssVideos) {
    if (isBlocked(rv.title, rv.channel)) continue;
    if (isNonEnglish(rv.title)) continue;

    if (!allVideos.has(rv.videoId)) {
      const searchText = rv.title + ' ' + rv.channel;
      allVideos.set(rv.videoId, {
        videoId: rv.videoId,
        title: rv.title,
        channel: rv.channel,
        thumbnail: rv.thumbnail,
        publishedAt: rv.publishedAt,
        categories: [],  // Will be enriched below or left empty
        regions: detectRegions(searchText),
        _channelId: rv.channelId,
      });
    }
  }

  // ─── Phase 2: Search API for discovery (skipping fresh categories) ───
  const allCategories = { ...WINE_CATEGORIES, ...SPIRITS_CATEGORIES };

  for (const [category, queries] of Object.entries(allCategories)) {
    // Improvement 2: skip categories that are already fresh
    if (freshCategories.has(category)) {
      console.log(`\nSkipping fresh category: ${category}`);
      continue;
    }

    console.log(`\nFetching category: ${category}`);

    for (const query of queries) {
      console.log(`  Searching: "${query}"`);
      try {
        const items = await searchVideos(query);

        for (const item of items) {
          const videoId = item.id.videoId;
          const title = item.snippet.title;
          const channel = item.snippet.channelTitle;
          const channelId = item.snippet.channelId;

          if (isBlocked(title, channel)) {
            console.log(`    Blocked: "${title}" (${channel})`);
            continue;
          }

          if (isNonEnglish(title)) {
            console.log(`    Skipped non-English: "${title}"`);
            continue;
          }

          // Track discovered channels for future RSS fetching
          if (channelId) {
            knownChannelsMap.set(channelId, {
              channelId,
              channelTitle: channel,
              lastSeen: new Date().toISOString(),
            });
          }

          if (allVideos.has(videoId)) {
            const existing = allVideos.get(videoId);
            if (!existing.categories.includes(category)) {
              existing.categories.push(category);
            }
            continue;
          }

          const searchText = title + ' ' + channel;
          allVideos.set(videoId, {
            videoId,
            title,
            channel,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            publishedAt: item.snippet.publishedAt,
            categories: [category],
            regions: detectRegions(searchText),
            _channelId: channelId,
          });
        }

        console.log(`    Found ${items.length} results`);
      } catch (err) {
        console.error(`    Error searching "${query}": ${err.message}`);
      }
    }
  }

  // ─── Enrich RSS-only videos: assign categories based on title keywords ───
  const allCategoryEntries = Object.entries(allCategories);
  for (const video of allVideos.values()) {
    if (video.categories.length === 0) {
      // Try to match categories from title text
      const lowerTitle = (video.title + ' ' + video.channel).toLowerCase();
      for (const [category, queries] of allCategoryEntries) {
        for (const query of queries) {
          if (lowerTitle.includes(query.toLowerCase())) {
            if (!video.categories.includes(category)) {
              video.categories.push(category);
            }
            break;
          }
        }
      }
    }
  }

  // Remove RSS-sourced videos that couldn't be matched to any category — likely irrelevant
  for (const [videoId, video] of allVideos) {
    if (video.categories.length === 0) {
      allVideos.delete(videoId);
    }
  }

  // Save updated known channels
  saveKnownChannels(knownChannelsMap);

  // Set beverageType based on final categories and clean up internal fields
  const videos = Array.from(allVideos.values());
  for (const video of videos) {
    video.beverageType = getBeverageType(video.categories);
    delete video._channelId;
  }

  return videos;
}

async function main() {
  console.log('Wine & Spirits Media Hub — YouTube Video Fetcher');
  console.log('=================================================');

  const videos = await fetchAllVideos();

  // Sort by publish date (newest first)
  videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // Cap at 100 videos
  const capped = videos.slice(0, 200);

  const output = {
    lastUpdated: new Date().toISOString(),
    totalVideos: capped.length,
    videos: capped
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Don't overwrite existing data if quota was exhausted (fewer results)
  if (fs.existsSync(YOUTUBE_JSON_PATH)) {
    const existing = JSON.parse(fs.readFileSync(YOUTUBE_JSON_PATH, 'utf8'));
    if (videos.length < 20) {
      console.log(`\nSkipping save: only fetched ${videos.length} videos vs ${existing.totalVideos} existing (likely quota exhausted)`);
      return;
    }
  }

  fs.writeFileSync(YOUTUBE_JSON_PATH, JSON.stringify(output, null, 2));

  console.log(`\nDone! Saved ${videos.length} videos to data/youtube.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
