export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "market";
  const alphaKey = searchParams.get("akey");

  if (!alphaKey) {
    return Response.json({ articles: [] });
  }

  const topicMap = {
    market: "earnings,ipo,mergers_and_acquisitions,financial_markets,economy_macro",
    geo: "economy_macro,financial_markets"
  };

  const topic = topicMap[type] || topicMap.market;
  const url = "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=" + topic + "&sort=LATEST&limit=8&apikey=" + alphaKey;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.feed) {
    return Response.json({ articles: [] });
  }

  const articles = data.feed.map(function(item) {
    return {
      title: item.title,
      description: item.summary,
      url: item.url,
      publishedAt: item.time_published,
      source: { name: item.source },
      tickers: item.ticker_sentiment || []
    };
  });

  return Response.json({ articles: articles });
}
