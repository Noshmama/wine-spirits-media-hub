/**
 * Wine & Spirits Media Hub — Shared Region Detection
 * Detects geographic regions from title + channel name via keyword matching.
 */

const REGION_KEYWORDS = {
  // US States
  'Kentucky': [
    /\bkentucky\b/i, /\bbourbon\b/i, /\bwoodford\s*reserve\b/i,
    /\bmaker'?s\s*mark\b/i, /\bjim\s*beam\b/i, /\bwild\s*turkey\b/i,
    /\bbulleit\b/i, /\bfour\s*roses\b/i, /\bbuffalo\s*trace\b/i,
    /\bevan\s*williams\b/i, /\bheaven\s*hill\b/i, /\bknob\s*creek\b/i,
    /\bangel'?s\s*envy\b/i, /\belijah\s*craig\b/i, /\blarceny\b/i,
    /\bmichter'?s\b/i, /\bpappy\b/i, /\bweller\b/i, /\bblantons?\b/i
  ],
  'Tennessee': [
    /\btennessee\b/i, /\bjack\s*daniel'?s?\b/i, /\bgeorge\s*dickel\b/i,
    /\bnelson'?s?\s*green\s*brier\b/i, /\buncle\s*nearest\b/i
  ],
  'Texas': [
    /\btexas\s*(whiskey|bourbon|distill|spirit)/i, /\btito'?s\b/i,
    /\bbalcones\b/i, /\bgarrison\s*brothers?\b/i, /\btreaty\s*oak\b/i,
    /\bwitherspoon\b/i, /\branger\s*creek\b/i
  ],
  'Colorado': [
    /\bcolorado\s*(whiskey|distill|spirit)/i, /\bstranahans?\b/i,
    /\bbreckenridge\s*distill/i, /\blaws\s*whiskey\b/i
  ],
  'California': [
    /\bcalifornia\s*wine\b/i, /\bnapa\s*valley\b/i, /\bsonoma\b/i,
    /\bpaso\s*robles\b/i, /\bsanta\s*barbara\b/i, /\blodi\b/i,
    /\bcalifornia\s*(distill|spirit|whiskey)/i, /\bst\.?\s*george\s*spirits\b/i
  ],
  'Oregon': [
    /\boregon\s*(wine|pinot|distill)/i, /\bwillamette\b/i,
    /\bdundee\b/i
  ],
  'New York': [
    /\bnew\s*york\s*(wine|distill|whiskey|spirit)/i, /\bfinger\s*lakes\b/i,
    /\bhudson\s*valley\s*(wine|distill)/i, /\bhudson\s*whiskey\b/i,
    /\blong\s*island\s*wine\b/i
  ],
  'Indiana': [
    /\bindiana\s*(whiskey|distill)/i, /\bmgp\b/i,
    /\blawrenceburg\b/i
  ],
  'Virginia': [
    /\bvirginia\s*(wine|distill|whiskey|spirit)/i
  ],
  'Washington': [
    /\bwashington\s*(state)?\s*(wine|distill)/i, /\bwalla\s*walla\b/i,
    /\bcolumbia\s*valley\s*wine\b/i, /\bwoodinville\s*whiskey\b/i
  ],
  'Hawaii': [
    /\bhawaii\s*(rum|distill|spirit)/i, /\bkoloa\s*rum\b/i,
    /\bko\s*hana\b/i
  ],

  // Europe
  'Scotland': [
    /\bscotland\b/i, /\bscotch\b/i, /\bhighland\s*(whisky|single\s*malt|distill)/i,
    /\bspeyside\b/i, /\blowland\s*whisky\b/i, /\bcampbeltown\b/i,
    /\bglenfiddich\b/i, /\bglenlivet\b/i, /\bmacallan\b/i,
    /\bjohnnie\s*walker\b/i, /\bchivas\b/i, /\bdewar'?s\b/i,
    /\bbalvenie\b/i, /\bdalmore\b/i, /\boban\b/i, /\btalisk?er\b/i,
    /\bhighland\s*park\b/i, /\bglendronach\b/i, /\bsingle\s*malt\b/i
  ],
  'Scottish Isles': [
    /\bislay\b/i, /\blaphroaig\b/i, /\bardbeg\b/i, /\blagavulin\b/i,
    /\bbowmore\b/i, /\bbruichladdich\b/i, /\bbunnahabhain\b/i,
    /\bcaol\s*ila\b/i, /\bkilchoman\b/i, /\bskye\b/i,
    /\bjura\b/i, /\bmull\b/i, /\borkney\b/i
  ],
  'Ireland': [
    /\bireland\b/i, /\birish\s*(whiskey|whisky|cream)/i,
    /\bjameson\b/i, /\bbushmills?\b/i, /\bredbreast\b/i,
    /\bgreen\s*spot\b/i, /\byellow\s*spot\b/i, /\bmidleton\b/i,
    /\bteeling\b/i, /\btullamore\b/i, /\bpowers?\s*whiskey\b/i,
    /\bconnemara\b/i, /\bdingle\s*distill/i
  ],
  'France': [
    /\bfrance\b/i, /\bfrench\s*wine\b/i, /\bbordeaux\b/i,
    /\bburgundy\b/i, /\bbourgogne\b/i, /\bchampagne\b/i,
    /\bcognac\b/i, /\barmagnac\b/i, /\bhennessy\b/i, /\bremy\s*martin\b/i,
    /\bcourvoisier\b/i, /\brhone\b/i, /\bloire\b/i,
    /\balsace\b/i, /\bprovence\b/i, /\blanguedoc\b/i,
    /\bbeaujolais\b/i, /\bchablis\b/i, /\bsancerre\b/i,
    /\bst\.?\s*emilion\b/i, /\bpauillac\b/i, /\bmargaux\b/i,
    /\bpomerol\b/i, /\bmaison\b/i, /\bdomaine\b/i
  ],
  'Italy': [
    /\bital(y|ian)\s*(wine|grappa|amaro|distill)/i, /\btuscany\b/i,
    /\bpiedmont\b/i, /\bpiemonte\b/i, /\bchianti\b/i,
    /\bbarolo\b/i, /\bbrunel+o\b/i, /\bprosecco\b/i,
    /\bamarone\b/i, /\bgrappa\b/i, /\blimoncello\b/i,
    /\bamaro\b/i, /\bcampari\b/i, /\baperoli?\b/i,
    /\bveneto\b/i, /\bsicily\b/i, /\bsardinia\b/i
  ],
  'Spain': [
    /\bspain\b/i, /\bspanish\s*wine\b/i, /\brioja\b/i,
    /\bsherry\b/i, /\bcava\b/i, /\bribera\s*del\s*duero\b/i,
    /\bpriorat\b/i, /\bgalicia\b/i, /\btempranillo\b/i
  ],
  'Germany': [
    /\bgerman(y)?\s*(wine|riesling)/i, /\bmosel\b/i,
    /\brheingau\b/i, /\bpfalz\b/i
  ],
  'England': [
    /\benglish\s*(sparkling|wine|distill|gin)/i, /\bsipsmith\b/i,
    /\bchase\s*distill/i
  ],

  // Mexico (by state)
  'Jalisco': [
    /\bjalisco\b/i, /\btequila\b/i, /\braicilla\b/i,
    /\bpatron\b/i, /\bjose\s*cuervo\b/i, /\bdon\s*julio\b/i,
    /\bcasamigos\b/i, /\bfortaleza\b/i, /\btesoro\b/i,
    /\bel\s*tesoro\b/i, /\btapatio\b/i, /\bherradura\b/i,
    /\b1800\s*tequila\b/i, /\bclase\s*azul\b/i, /\bespolon\b/i
  ],
  'Oaxaca': [
    /\boaxaca\b/i, /\bmezcal\b/i, /\bdel\s*maguey\b/i,
    /\bmontelobos\b/i, /\bilegal\b/i, /\btobala\b/i,
    /\bespadin\b/i
  ],
  'Chihuahua': [
    /\bchihuahua\b/i, /\bsotol\b/i
  ],
  'Sonora': [
    /\bsonora\b/i, /\bbacanora\b/i
  ],
  'Durango': [
    /\bdurango\s*(mezcal|spirit|distill)/i
  ],

  // Caribbean (by island/country)
  'Cuba': [
    /\bcuba\b/i, /\bcuban\s*rum\b/i, /\bhavana\s*club\b/i
  ],
  'Jamaica': [
    /\bjamaica\b/i, /\bjamaican\s*rum\b/i, /\bappleton\b/i,
    /\bwray\s*(&|and)\s*nephew\b/i, /\bhampden\b/i, /\bworthy\s*park\b/i
  ],
  'Barbados': [
    /\bbarbados\b/i, /\bbajan\s*rum\b/i, /\bmount\s*gay\b/i,
    /\bfoursquare\b/i, /\bdoorlys?\b/i
  ],
  'Martinique': [
    /\bmartinique\b/i, /\brhum\s*agricole\b/i, /\bclement\b/i,
    /\bneisson\b/i, /\bjm\s*rhum\b/i, /\btrois\s*rivi[eè]res\b/i
  ],
  'Puerto Rico': [
    /\bpuerto\s*rico\b/i, /\bbacardi\b/i, /\bdon\s*q\b/i
  ],
  'Trinidad': [
    /\btrinidad\b/i, /\bangostura\b/i
  ],
  'Dominican Republic': [
    /\bdominican\b/i, /\bbrugal\b/i, /\bbermudez\b/i
  ],
  'Haiti': [
    /\bhaiti(an)?\s*(rum|clairin)/i, /\bclairin\b/i, /\bbarbancourt\b/i
  ],
  'Guadeloupe': [
    /\bguadeloupe\b/i, /\bdamoiseau\b/i
  ],

  // Other Americas
  'Canada': [
    /\bcanad(a|ian)\s*(whisky|whiskey|wine|icewine|spirit)/i,
    /\bcrown\s*royal\b/i, /\bcanadian\s*club\b/i,
    /\bniagara\s*wine\b/i, /\bokanagan\b/i, /\bicewine\b/i
  ],
  'Argentina': [
    /\bargentin(a|e|ian)\s*(wine|malbec)/i, /\bmalbec\b/i,
    /\bmendoza\b/i
  ],
  'Chile': [
    /\bchile(an)?\s*(wine|pisco|spirit)/i, /\bchilean\s*pisco\b/i,
    /\bmaipo\b/i, /\bcolchagua\b/i, /\bcasablanca\s*valley\b/i
  ],
  'Brazil': [
    /\bbrazil(ian)?\s*(wine|cacha[çc]a|spirit|rum)/i, /\bcacha[çc]a\b/i
  ],
  'Peru': [
    /\bperu(vian)?\s*(pisco|spirit)/i, /\bperuvian\s*pisco\b/i
  ],

  // Asia-Pacific
  'Japan': [
    /\bjapan(ese)?\s*(whisky|whiskey|sake|spirit|gin)/i,
    /\bsuntory\b/i, /\bnikka\b/i, /\byamazaki\b/i,
    /\bhibiki\b/i, /\bhakushu\b/i, /\bsake\b/i,
    /\broku\s*gin\b/i, /\bichiro\b/i
  ],
  'Australia': [
    /\baustrali(a|an)\s*(wine|whisky|distill|spirit|gin)/i,
    /\bbarossa\b/i, /\bhunter\s*valley\b/i, /\bmclaren\s*vale\b/i,
    /\byarra\s*valley\b/i, /\bmargaret\s*river\b/i,
    /\bstarward\b/i, /\bsullivans?\s*cove\b/i, /\bfour\s*pillars\b/i
  ],
  'New Zealand': [
    /\bnew\s*zealand\s*(wine|sauvignon|pinot)/i, /\bkiwi\s*wine\b/i,
    /\bmarlborough\b/i, /\bhawkes?\s*bay\b/i, /\bcentral\s*otago\b/i,
    /\bwaipara\b/i, /\bwairarapa\b/i
  ],
  'Hungary': [
    /\bhungar(y|ian)\s*(wine|tokaj)/i, /\btokaj\b/i, /\btokaji\b/i,
    /\beger\b/i, /\bbull'?s\s*blood\b/i
  ],
  'Georgia': [
    /\bgeorgia(n)?\s*(wine|qvevri|kvevri|amber\s*wine)/i,
    /\bqvevri\b/i, /\bkvevri\b/i, /\bkakheti\b/i,
    /\bsaperavi\b/i, /\brkatsiteli\b/i
  ]
};

/**
 * Detect regions from a text string (typically title + channel name).
 * Returns an array of unique region strings.
 */
function detectRegions(text) {
  if (!text) return [];
  const regions = [];
  for (const [region, patterns] of Object.entries(REGION_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        regions.push(region);
        break; // one match per region is enough
      }
    }
  }
  return regions;
}

module.exports = { REGION_KEYWORDS, detectRegions };
