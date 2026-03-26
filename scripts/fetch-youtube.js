const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { detectRegions } = require('./regions');

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('Error: YOUTUBE_API_KEY environment variable is not set.');
  process.exit(1);
}

const youtube = google.youtube({ version: 'v3', auth: API_KEY });

// ── Wine Categories ──
const WINE_CATEGORIES = {
  'Business & Trade': [
    'wine business',
    'wine industry',
    'wine trade',
    'wine market'
  ],
  'Connoisseur & Tasting': [
    'wine tasting',
    'sommelier',
    'wine review',
    'wine pairing'
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

const MAX_RESULTS_PER_QUERY = 5;

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

  // Process both wine and spirits categories
  const allCategories = { ...WINE_CATEGORIES, ...SPIRITS_CATEGORIES };

  for (const [category, queries] of Object.entries(allCategories)) {
    console.log(`\nFetching category: ${category}`);

    for (const query of queries) {
      console.log(`  Searching: "${query}"`);
      try {
        const items = await searchVideos(query);

        for (const item of items) {
          const videoId = item.id.videoId;
          const title = item.snippet.title;
          const channel = item.snippet.channelTitle;

          if (isBlocked(title, channel)) {
            console.log(`    Blocked: "${title}" (${channel})`);
            continue;
          }

          if (isNonEnglish(title)) {
            console.log(`    Skipped non-English: "${title}"`);
            continue;
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
            regions: detectRegions(searchText)
          });
        }

        console.log(`    Found ${items.length} results`);
      } catch (err) {
        console.error(`    Error searching "${query}": ${err.message}`);
      }
    }
  }

  // Set beverageType based on final categories
  const videos = Array.from(allVideos.values());
  for (const video of videos) {
    video.beverageType = getBeverageType(video.categories);
  }

  return videos;
}

async function main() {
  console.log('Wine & Spirits Media Hub — YouTube Video Fetcher');
  console.log('=================================================');

  const videos = await fetchAllVideos();

  // Sort by publish date (newest first)
  videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const output = {
    lastUpdated: new Date().toISOString(),
    totalVideos: videos.length,
    videos
  };

  const outPath = path.join(__dirname, '..', 'data', 'youtube.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Don't overwrite existing data if quota was exhausted (fewer results)
  if (fs.existsSync(outPath)) {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (videos.length < existing.totalVideos * 0.5) {
      console.log(`\nSkipping save: only fetched ${videos.length} videos vs ${existing.totalVideos} existing (likely quota exhausted)`);
      return;
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\nDone! Saved ${videos.length} videos to data/youtube.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
