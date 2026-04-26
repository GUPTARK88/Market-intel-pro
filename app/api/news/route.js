export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "market";
  const apiKey = searchParams.get("key");

  const queries = {
    market: "earnings OR \"beat estimates\" OR \"missed estimates\" OR \"Federal Reserve\" OR \"interest rate\" OR \"rate decision\" OR \"inflation\" OR \"GDP\" OR \"jobs report\" OR \"stock rally\" OR \"market crash\" OR \"revenue\" OR \"profit\" OR \"guidance\" OR \"acquisition\" OR \"merger\" OR \"IPO\" OR \"bankruptcy\" OR \"dividend\" OR \"stock split\"",
    geo: "\"oil supply\" OR \"OPEC\" OR \"iran sanctions\" OR \"china gold\" OR \"trade war\" OR \"trade tariff\" OR \"gold reserves\" OR \"currency crisis\" OR \"sanctions\" OR \"geopolitical\" OR \"supply chain\" OR \"energy crisis\"",
    metals: "\"gold price\" OR \"silver price\" OR \"copper price\" OR \"oil price\" OR \"crude oil\" OR \"precious metals\" OR \"commodity prices\" OR \"gold rally\" OR \"oil rally\""
  };

  const sources = {
    market: "bloomberg,reuters,the-wall-street-journal,financial-times,cnbc,marketwatch,business-insider",
    geo: "reuters,bloomberg,the-wall-street-journal,cnbc,bbc-news",
    metals: "reuters,bloomberg,cnbc,marketwatch,financial-times"
  };

  const query = queries[type] || queries.market;
  const source = sources[type] || sources.market;
  const pageSize = type === "geo" ? 4 : 6;

  try {
    const res = await fetch(
      "https://newsapi.org/v2/everything?q=" + encodeURIComponent(query) + "&sortBy=publishedAt&language=en&pageSize=" + pageSize + "&apiKey=" + apiKey,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
