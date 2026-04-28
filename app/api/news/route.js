export async function GET(request) {
const { searchParams } = new URL(request.url);
const type = searchParams.get(“type”) || “market”;
const alphaKey = searchParams.get(“akey”);

try {
if (alphaKey) {
const topicMap = {
market: “earnings,ipo,mergers_and_acquisitions,financial_markets,economy_macro”,
geo: “economy_macro,financial_markets”,
metals: “financial_markets,economy_macro”
};

  const topic = topicMap[type] || topicMap.market;
  const url = "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=" + topic + "&sort=LATEST&limit=10&apikey=" + alphaKey;

  const response = await fetch(url, { next: { revalidate: 30 } });
  const data = await response.json();

  if (data.feed && data.feed.length > 0) {
    const articles = data.feed.map(function(item) {
      return {
        title: item.title,
        description: item.summary,
        url: item.url,
        publishedAt: item.time_published,
        source: { name: item.source },
        tickers: item.ticker_sentiment || [],
        overallSentiment: item.overall_sentiment_label
      };
    });

    return Response.json({ articles: articles, status: "ok" });
  }
}

return Response.json({ articles: [], status: "no_key" });

} catch (error) {
return Response.json({ articles: [], error: “fetch_failed” }, { status: 500 });
}
}