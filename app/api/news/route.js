export async function GET(request) {
const { searchParams } = new URL(request.url);
const type = searchParams.get(“type”) || “market”;
const newsKey = searchParams.get(“key”);
const alphaKey = searchParams.get(“akey”);

try {
let articles = [];


// Alpha Vantage - Stock Market News
if (alphaKey) {
  const topics = {
    market: "earnings,ipo,mergers_and_acquisitions,financial_markets,economy_macro,finance",
    geo: "economy_macro,financial_markets,finance",
    metals: "financial_markets,economy_macro"
  };

  const avRes = await fetch(
    "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=" + (topics[type] || topics.market) + "&sort=LATEST&limit=10&apikey=" + alphaKey,
    { next: { revalidate: 30 } }
  );
  const avData = await avRes.json();

  if (avData.feed && avData.feed.length > 0) {
    const avArticles = avData.feed.map(item => ({
      title: item.title,
      description: item.summary,
      url: item.url,
      publishedAt: item.time_published,
      source: { name: item.source },
      tickers: item.ticker_sentiment || [],
      overallSentiment: item.overall_sentiment_label,
      sentimentScore: item.overall_sentiment_score
    }));
    articles = [...articles, ...avArticles];
  }
}

// RSS Feeds - Financial News Only
const rssFeeds = {
  market: [
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC,^DJI,^IXIC&region=US&lang=en-US",
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "https://feeds.marketwatch.com/marketwatch/topstories/",
    "https://feeds.reuters.com/reuters/businessNews"
  ],
  geo: [
    "https://feeds.reuters.com/reuters/worldNews",
    "https://www.cnbc.com/id/100727362/device/rss/rss.html"
  ],
  metals: [
    "https://feeds.marketwatch.com/marketwatch/marketpulse/",
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=GLD,SLV,USO,COPX&region=US&lang=en-US"
  ]
};

const feeds = rssFeeds[type] || rssFeeds.market;

for (const feedUrl of feeds.slice(0, 3)) {
  try {
    const rssRes = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl) + "&api_key=public&count=5",
      { next: { revalidate: 60 } }
    );
    const rssData = await rssRes.json();

    if (rssData.items && rssData.items.length > 0) {
      const rssArticles = rssData.items.map(item => ({
        title: item.title,
        description: item.description?.replace(/<[^>]*>/g, "").substring(0, 200),
        url: item.link,
        publishedAt: item.pubDate,
        source: { name: rssData.feed?.title || "Financial News" },
        tickers: [],
        overallSentiment: "neutral"
      }));
      articles = [...articles, ...rssArticles];
    }
  } catch (rssError) {
    console.log("RSS feed error:", feedUrl);
  }
}

// Remove duplicates
const seen = new Set();
articles = articles.filter(a => {
  if (seen.has(a.title)) return false;
  seen.add(a.title);
  return true;
});

// Filter investment relevant only
const investmentKeywords = [
  "earnings", "revenue", "profit", "loss", "beat", "miss", "guidance",
  "fed", "federal reserve", "interest rate", "inflation", "gdp", "jobs",
  "stock", "shares", "nasdaq", "s&p", "dow", "market", "rally", "crash",
  "gold", "silver", "oil", "copper", "platinum", "commodity",
  "merger", "acquisition", "ipo", "buyback", "dividend",
  "recession", "growth", "economy", "trade", "tariff", "sanction",
  "opec", "iran", "china", "treasury", "yield", "bond",
  "tesla", "apple", "microsoft", "amazon", "google", "meta", "nvidia",
  "etf", "spy", "qqq", "index", "sector", "analyst", "upgrade", "downgrade",
  "bankruptcy", "layoff", "hire", "ceo", "executive"
];

articles = articles.filter(article => {
  const text = (article.title + " " + (article.description || "")).toLowerCase();
  return investmentKeywords.some(keyword => text.includes(keyword));
});

// Sort by date and limit
articles = articles
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .slice(0, 8);

return Response.json({ articles, status: "ok", total: articles.length });
```

} catch (error) {
return Response.json({ error: “Failed to fetch news”, articles: [] }, { status: 500 });
}
}