export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "market";
  const apiKey = searchParams.get("key");

  const queries = {
    market: "stock+market+earnings+economy+Federal+Reserve",
    geo: "iran+war+china+gold+OPEC+trade+tariff"
  };

  const query = queries[type] || queries.market;
  const pageSize = type === "geo" ? 3 : 5;

  try {
    const res = await fetch(
      "https://newsapi.org/v2/everything?q=" + query + "&sortBy=publishedAt&language=en&pageSize=" + pageSize + "&apiKey=" + apiKey,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
