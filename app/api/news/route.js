export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "market";
  const finnhubKey = searchParams.get("fkey");
  const marketauxKey = searchParams.get("mkey");

  let articles = [];

  try {
    // SOURCE 1: Marketaux - Today's news with stock symbols
    if (marketauxKey) {
      try {
        const symbols = type === "geo"
          ? ""
          : "AAPL,MSFT,GOOGL,AMZN,TSLA,META,NVDA,JPM,BAC,GS,XOM,CVX,GLD,SPY,QQQ";

        const mUrl = symbols
          ? "https://api.marketaux.com/v1/news/all?symbols=" + symbols + "&filter_entities=true&language=en&sort=published_at&sort_order=desc&limit=6&api_token=" + marketauxKey
          : "https://api.marketaux.com/v1/news/all?filter_entities=true&language=en&categories=general,politics&sort=published_at&limit=4&api_token=" + marketauxKey;

        const mRes = await fetch(mUrl, { next: { revalidate: 60 } });
        const mData = await mRes.json();

        if (mData.data && mData.data.length > 0) {
          const mArticles = mData.data.map(function(item) {
            const tickers = item.entities
              ? item.entities.filter(function(e) { return e.type === "equity"; }).map(function(e) {
                  return { ticker: e.symbol, ticker_sentiment_label: e.sentiment > 0 ? "Bullish" : e.sentiment < 0 ? "Bearish" : "Neutral" };
                })
              : [];

            return {
              title: item.title,
              description: item.description || item.snippet || "",
              url: item.url,
              publishedAt: item.published_at,
              source: { name: item.source || "Financial News" },
              tickers: tickers
            };
          });
          articles = articles.concat(mArticles);
        }
      } catch (e) {
        console.log("Marketaux error:", e.message);
      }
    }

    // SOURCE 2: Finnhub - Real-time market news
    if (finnhubKey) {
      try {
        const category = type === "geo" ? "general" : "general";
        const fUrl = "https://finnhub.io/api/v1/news?category=" + category + "&token=" + finnhubKey;

        const fRes = await fetch(fUrl, { next: { revalidate: 60 } });
        const fData = await fRes.json();

        if (Array.isArray(fData) && fData.length > 0) {
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

          const fArticles = fData
            .filter(function(item) {
              return (item.datetime * 1000) > oneDayAgo;
            })
            .slice(0, 5)
            .map(function(item) {
              return {
                title: item.headline,
                description: item.summary || "",
                url: item.url,
                publishedAt: new Date(item.datetime * 1000).toISOString(),
                source: { name: item.source || "Finnhub" },
                tickers: item.related ? [{ ticker: item.related, ticker_sentiment_label: "Neutral" }] : []
              };
            });

          articles = articles.concat(fArticles);
        }
      } catch (e) {
        console.log("Finnhub error:", e.message);
      }
    }

    // Remove duplicates by title
    const seen = new Set();
    articles = articles.filter(function(a) {
      if (!a.title || seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    });

    // Filter last 6 hours only
const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
articles = articles.filter(function(a) {
  var pubDate = new Date(a.publishedAt).getTime();
  return pubDate > sixHoursAgo;
});

// Sort by date newest first
articles.sort(function(a, b) {
  return new Date(b.publishedAt) - new Date(a.publishedAt);
});

    return Response.json({ articles: articles, total: articles.length });

  } catch (error) {
    return Response.json({ articles: [], error: error.message }, { status: 500 });
  }
}
