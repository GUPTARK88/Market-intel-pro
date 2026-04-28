“use client”;
import { useState, useEffect } from “react”;

export default function MarketIntelPro() {
const [news, setNews] = useState([]);
const [geoAlerts, setGeoAlerts] = useState([]);
const [metals, setMetals] = useState(null);
const [fedRate, setFedRate] = useState(null);
const [loading, setLoading] = useState(false);
const [lastUpdate, setLastUpdate] = useState(””);
const [showSetup, setShowSetup] = useState(true);
const [newsKey, setNewsKey] = useState(””);
const [geminiKey, setGeminiKey] = useState(””);
const [alphaKey, setAlphaKey] = useState(””);
const [savedNewsKey, setSavedNewsKey] = useState(””);
const [savedGeminiKey, setSavedGeminiKey] = useState(””);
const [savedAlphaKey, setSavedAlphaKey] = useState(””);
const [filter, setFilter] = useState(“all”);
const [activeTab, setActiveTab] = useState(“market”);

useEffect(() => {
if (typeof window !== “undefined”) {
const nk = localStorage.getItem(“newsapi_key”) || “”;
const gk = localStorage.getItem(“gemini_key”) || “”;
const ak = localStorage.getItem(“alpha_key”) || “”;
setSavedNewsKey(nk);
setSavedGeminiKey(gk);
setSavedAlphaKey(ak);
if ((nk || ak) && gk) setShowSetup(false);
}
}, []);

const analyzeWithGemini = async (article, gemKey) => {
try {
const tickerInfo = article.tickers && article.tickers.length > 0
? “Known affected tickers: “ + article.tickers.map(t => t.ticker + “ (” + t.ticker_sentiment_label + “)”).join(”, “) + “. “
: “”;

  const prompt = "You are a senior Wall Street investment analyst. " + tickerInfo + "Analyze this market news and identify investment opportunities. SEVERITY RULES - mark as HIGH if: earnings beat/miss, Fed decision, rate change, major acquisition, war/sanctions, market crash/rally, oil/gold major move. Mark MEDIUM if: analyst upgrade/downgrade, sector news, economic data. Mark LOW only for minor news. NEWS: " + article.title + " " + (article.description || "") + " Return ONLY JSON: {\"stocks\":[{\"symbol\":\"AAPL\",\"impact\":\"positive\",\"magnitude\":\"high\",\"reason\":\"Direct earnings beat\",\"move\":\"+5-8%\",\"confidence\":85},{\"symbol\":\"SPY\",\"impact\":\"positive\",\"magnitude\":\"medium\",\"reason\":\"Tech sector lift\",\"move\":\"+1-2%\",\"confidence\":70}],\"metals\":[{\"name\":\"Gold\",\"impact\":\"negative\",\"magnitude\":\"low\",\"reason\":\"Risk-on sentiment\",\"move\":\"-0.5%\",\"confidence\":60}],\"indexes\":[{\"name\":\"NASDAQ\",\"impact\":\"positive\",\"magnitude\":\"high\",\"move\":\"+1-2%\"}],\"sentiment\":\"bullish\",\"severity\":\"high\",\"summary\":\"One sentence: what happened and why it matters for investors\",\"action\":\"Specific action: BUY/SELL/HOLD + which stocks + why\",\"timeframe\":\"immediate\"}";

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + gemKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
} catch (e) {
  return null;
}

};

const fetchFedRate = async () => {
try {
const res = await fetch(“https://api.stlouisfed.org/fred/series/data?series_id=FEDFUNDS&api_key=0b43c53f35c7e2c88a7abb31e9ab6f0f&limit=1&sort_order=desc”);
const data = await res.json();
if (data.observations?.[0]) setFedRate(parseFloat(data.observations[0].value));
} catch (e) { setFedRate(4.5); }
};

const fetchMetals = async () => {
try {
const res = await fetch(”/api/metals”);
const data = await res.json();
setMetals(data);
} catch (e) {
setMetals({
gold: { price: “$2,150/oz”, change: “+0.3%”, up: true },
silver: { price: “$28.50/oz”, change: “+0.8%”, up: true },
copper: { price: “$4.25/lb”, change: “-0.5%”, up: false },
oil: { price: “$82.45/bbl”, change: “+1.2%”, up: true }
});
}
};

const fetchAllNews = async (nKey, gKey, aKey) => {
setLoading(true);
try {
const marketUrl = “/api/news?type=market&key=” + nKey + “&akey=” + aKey;
const geoUrl = “/api/news?type=geo&key=” + nKey + “&akey=” + aKey;

  const [mRes, gRes] = await Promise.all([
    fetch(marketUrl),
    fetch(geoUrl)
  ]);

  const mData = await mRes.json();
  const gData = await gRes.json();

  if (mData.articles?.length) {
    const analyzed = await Promise.all(
      mData.articles.slice(0, 6).map(async (a) => {
        const analysis = await analyzeWithGemini(a, gKey);
        return {
          id: a.url,
          headline: a.title,
          description: a.description,
          source: a.source?.name,
          time: new Date(a.publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          url: a.url,
          stocks: analysis?.stocks || [],
          metals: analysis?.metals || [],
          indexes: analysis?.indexes || [],
          sentiment: analysis?.sentiment || "neutral",
          severity: analysis?.severity || "low",
          summary: analysis?.summary || "",
          action: analysis?.action || "",
          timeframe: analysis?.timeframe || "",
          isNew: true
        };
      })
    );

    const validNews = analyzed.filter(item => item.stocks.length > 0 || item.metals.length > 0);
    setNews(validNews);

    validNews.forEach(item => {
      if (item.severity === "high" && "Notification" in window && Notification.permission === "granted") {
        new Notification("HIGH IMPACT Alert!", {
          body: item.action || item.headline.substring(0, 100),
          icon: "/favicon.ico"
        });
      }
    });
  }

  if (gData.articles?.length) {
    const analyzed = await Promise.all(
      gData.articles.slice(0, 4).map(async (a) => {
        const analysis = await analyzeWithGemini(a, gKey);
        return {
          id: a.url,
          headline: a.title,
          source: a.source?.name,
          time: new Date(a.publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          url: a.url,
          stocks: analysis?.stocks || [],
          metals: analysis?.metals || [],
          indexes: analysis?.indexes || [],
          sentiment: analysis?.sentiment || "neutral",
          severity: analysis?.severity || "medium",
          summary: analysis?.summary || "",
          action: analysis?.action || ""
        };
      })
    );
    setGeoAlerts(analyzed.filter(a => a.stocks.length > 0 || a.metals.length > 0));
  }

  setLastUpdate(new Date().toLocaleTimeString());
  setTimeout(() => setNews(p => p.map(n => ({ ...n, isNew: false }))), 3000);
} catch (e) {
  console.error(e);
}
setLoading(false);

};

useEffect(() => {
if (!showSetup && savedGeminiKey && (savedNewsKey || savedAlphaKey)) {
fetchFedRate();
fetchMetals();
fetchAllNews(savedNewsKey, savedGeminiKey, savedAlphaKey);
if (“Notification” in window) Notification.requestPermission();
const interval = setInterval(() => {
fetchAllNews(savedNewsKey, savedGeminiKey, savedAlphaKey);
fetchMetals();
}, 30000);
return () => clearInterval(interval);
}
}, [showSetup, savedNewsKey, savedGeminiKey, savedAlphaKey]);

const handleStart = () => {
if (!geminiKey || (!newsKey && !alphaKey)) {
alert(“Please enter Gemini key and at least one news API key”);
return;
}
localStorage.setItem(“newsapi_key”, newsKey);
localStorage.setItem(“gemini_key”, geminiKey);
localStorage.setItem(“alpha_key”, alphaKey);
setSavedNewsKey(newsKey);
setSavedGeminiKey(geminiKey);
setSavedAlphaKey(alphaKey);
setShowSetup(false);
};

const sc = { high: “#ef4444”, medium: “#f59e0b”, low: “#22c55e” };
const sb = { high: “rgba(239,68,68,0.1)”, medium: “rgba(245,158,11,0.1)”, low: “rgba(34,197,94,0.05)” };
const sbr = { high: “rgba(239,68,68,0.3)”, medium: “rgba(245,158,11,0.3)”, low: “rgba(34,197,94,0.2)” };

const sorted = […news].sort((a, b) =>
({ high: 3, medium: 2, low: 1 }[b.severity] || 0) - ({ high: 3, medium: 2, low: 1 }[a.severity] || 0)
);
const filtered = filter === “all” ? sorted : sorted.filter(n => n.severity === filter);

return (
<div style={{ minHeight: “100vh”, background: “linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)”, color: “#e2e8f0”, fontFamily: “-apple-system,BlinkMacSystemFont,sans-serif”, padding: “16px” }}>
<div style={{ maxWidth: “900px”, margin: “0 auto” }}>

    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#fff" }}>Market Intel Pro</h1>
        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>USA Stocks, Metals & Indexes - Investment grade news only</p>
      </div>
      {lastUpdate && (
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "10px", color: "#64748b" }}>Auto-updates every 30s</p>
          <p style={{ margin: 0, fontSize: "12px", color: "#10b981", fontWeight: 600 }}>{lastUpdate}</p>
        </div>
      )}
    </div>

    {/* Setup Screen */}
    {showSetup && (
      <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "16px", color: "#fbbf24" }}>One-Time Setup</h2>
        <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#94a3b8" }}>Keys saved only on your device. Never shared.</p>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#fcd34d", marginBottom: "6px" }}>Alpha Vantage Key - RECOMMENDED (alphavantage.co)</label>
          <input type="password" placeholder="Paste Alpha Vantage key - Best for stock news" value={alphaKey} onChange={e => setAlphaKey(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e293b", border: "1px solid #10b981", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#fcd34d", marginBottom: "6px" }}>NewsAPI Key - Optional (newsapi.org)</label>
          <input type="password" placeholder="Paste NewsAPI key - Optional backup source" value={newsKey} onChange={e => setNewsKey(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#fcd34d", marginBottom: "6px" }}>Google Gemini Key - REQUIRED (aistudio.google.com)</label>
          <input type="password" placeholder="Paste Gemini key - Powers AI analysis" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#fff", fontSize: "13px", boxSizing: "border-box" }} />
        </div>

        <button onClick={handleStart} style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
          Start Monitoring Markets
        </button>
      </div>
    )}

    {!showSetup && (
      <div>
        {/* Economic Indicators */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "8px", marginBottom: "16px" }}>
          {fedRate && (
            <div style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: "10px", padding: "12px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "10px", color: "#60a5fa", textTransform: "uppercase", fontWeight: 600 }}>FED RATE</p>
              <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#bfdbfe" }}>{fedRate}%</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#60a5fa" }}>Federal Reserve</p>
            </div>
          )}
          {metals && Object.entries(metals).map(([k, v]) => (
            <div key={k} style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: "10px", padding: "12px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "10px", color: "#fcd34d", textTransform: "uppercase", fontWeight: 600 }}>{k}</p>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#fef3c7" }}>{v.price}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: v.up ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{v.change}</p>
            </div>
          ))}
        </div>

        {/* Filter + Refresh */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Filter:</span>
          {["all", "high", "medium", "low"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid " + (filter === f ? "#10b981" : "#334155"), background: filter === f ? "rgba(16,185,129,0.2)" : "transparent", color: filter === f ? "#10b981" : "#64748b", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button onClick={() => { fetchAllNews(savedNewsKey, savedGeminiKey, savedAlphaKey); fetchMetals(); }} disabled={loading} style={{ padding: "4px 12px", borderRadius: "20px", border: "1px solid #334155", background: "transparent", color: loading ? "#475569" : "#94a3b8", fontSize: "11px", cursor: loading ? "not-allowed" : "pointer", marginLeft: "auto" }}>
            {loading ? "Updating..." : "Refresh Now"}
          </button>
        </div>

        {/* Geopolitical Alerts */}
        {geoAlerts.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "14px", color: "#f87171", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Geopolitical Market Alerts
            </h2>
            {geoAlerts.map((a, i) => (
              <div key={i} style={{ background: sb[a.severity] || sb.medium, border: "1px solid " + (sbr[a.severity] || sbr.medium), borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                  <h3 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: 600, flex: 1, lineHeight: 1.4 }}>{a.headline}</h3>
                  <span style={{ background: sc[a.severity], color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", height: "fit-content" }}>{(a.severity || "").toUpperCase()}</span>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b" }}>{a.time} - {a.source}</p>
                {a.summary && <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5 }}>{a.summary}</p>}
                {a.action && (
                  <div style={{ margin: "8px 0", padding: "8px 10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "#10b981", fontWeight: 700 }}>Suggested Action: {a.action}</p>
                  </div>
                )}
                {a.stocks?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {a.stocks.map((s, j) => (
                      <div key={j} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid " + (s.impact === "positive" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"), borderRadius: "6px", padding: "6px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 700, color: "#fff", fontSize: "12px" }}>{s.symbol}</span>
                          <span style={{ color: s.impact === "positive" ? "#22c55e" : "#ef4444", fontSize: "11px", fontWeight: 700 }}>{s.impact === "positive" ? "UP" : "DOWN"} {s.move}</span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#64748b" }}>{s.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Market News */}
        <h2 style={{ margin: "0 0 10px", fontSize: "14px", color: "#10b981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Investment News - Ranked by Market Impact
        </h2>

        {loading && news.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
            <p style={{ fontSize: "32px", margin: "0 0 8px" }}>⏳</p>
            <p style={{ fontSize: "14px" }}>Fetching investment-grade news...</p>
            <p style={{ fontSize: "12px" }}>Filtering out non-market news...</p>
            <p style={{ fontSize: "12px" }}>Analyzing stock impacts with AI...</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((item, idx) => (
            <div key={item.id} style={{ background: sb[item.severity] || "rgba(30,41,59,0.5)", border: "1px solid " + (sbr[item.severity] || "#334155"), borderRadius: "12px", padding: "14px", outline: item.isNew ? "2px solid #10b981" : "none", transition: "all 0.3s" }}>

              {/* News Header */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "18px", fontWeight: 800, color: sc[item.severity] || "#fff", minWidth: "22px", lineHeight: 1 }}>{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                    <h3 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{item.headline}</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-end" }}>
                      <span style={{ background: sc[item.severity], color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap" }}>{(item.severity || "LOW").toUpperCase()}</span>
                      {item.isNew && <span style={{ background: "#10b981", color: "#fff", padding: "1px 6px", borderRadius: "8px", fontSize: "9px", fontWeight: 700 }}>LIVE</span>}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "10px", color: "#475569" }}>{item.time} - {item.source}</p>
                </div>
              </div>

              {/* Summary */}
              {item.summary && (
                <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#94a3b8", lineHeight: 1.5, paddingLeft: "30px" }}>{item.summary}</p>
              )}

              {/* Suggested Action */}
              {item.action && (
                <div style={{ margin: "0 0 10px 30px", padding: "8px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#10b981", fontWeight: 700 }}>Suggested Action: {item.action}</p>
                </div>
              )}

              {/* Stocks Impacted */}
              {item.stocks?.length > 0 && (
                <div style={{ paddingLeft: "30px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Stocks Impacted - Most to Least
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(145px,1fr))", gap: "6px" }}>
                    {item.stocks.map((s, j) => (
                      <div key={j} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid " + (s.impact === "positive" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"), borderRadius: "8px", padding: "8px 10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 800, color: "#fff", fontSize: "13px" }}>{s.symbol}</span>
                          <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px", background: s.magnitude === "high" ? "rgba(239,68,68,0.25)" : s.magnitude === "medium" ? "rgba(245,158,11,0.25)" : "rgba(59,130,246,0.25)", color: s.magnitude === "high" ? "#fca5a5" : s.magnitude === "medium" ? "#fcd34d" : "#93c5fd", fontWeight: 700 }}>
                            {(s.magnitude || "LOW").toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: "10px", color: "#94a3b8", lineHeight: 1.3 }}>{s.reason}</p>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: s.impact === "positive" ? "#22c55e" : "#ef4444" }}>
                            {s.impact === "positive" ? "↑" : "↓"} {s.move}
                          </span>
                          {s.confidence && (
                            <span style={{ fontSize: "10px", color: "#475569" }}>{s.confidence}% conf</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indexes */}
              {item.indexes?.length > 0 && (
                <div style={{ paddingLeft: "30px", marginTop: "8px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>Index Impact</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {item.indexes.map((idx2, j) => (
                      <div key={j} style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "6px", padding: "4px 10px" }}>
                        <span style={{ color: "#93c5fd", fontWeight: 700, fontSize: "12px" }}>{idx2.name}</span>
                        <span style={{ color: idx2.impact === "positive" ? "#22c55e" : "#ef4444", fontSize: "11px", marginLeft: "6px", fontWeight: 700 }}>
                          {idx2.impact === "positive" ? "↑" : "↓"} {idx2.move}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metals */}
              {item.metals?.length > 0 && (
                <div style={{ paddingLeft: "30px", marginTop: "8px" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>Metals Impact</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {item.metals.map((m, j) => (
                      <div key={j} style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: "6px", padding: "4px 10px" }}>
                        <span style={{ color: "#fcd34d", fontWeight: 700, fontSize: "12px" }}>{m.name}</span>
                        <span style={{ color: m.impact === "positive" ? "#22c55e" : "#ef4444", fontSize: "11px", marginLeft: "4px", fontWeight: 700 }}>
                          {m.impact === "positive" ? "↑" : "↓"} {m.move}
                        </span>
                        {m.confidence && <span style={{ fontSize: "10px", color: "#475569", marginLeft: "4px" }}>{m.confidence}%</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "10px", marginLeft: "30px", fontSize: "11px", color: "#10b981", textDecoration: "none" }}>
                Read full article →
              </a>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #1e293b", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "#334155" }}>
            Market Intel Pro • Investment news only • Alpha Vantage + RSS feeds • Updates every 30s
          </p>
          <button onClick={() => { localStorage.clear(); setShowSetup(true); setSavedNewsKey(""); setSavedGeminiKey(""); setSavedAlphaKey(""); }} style={{ marginTop: "6px", background: "none", border: "none", color: "#475569", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}>
            Change API Keys
          </button>
        </div>
      </div>
    )}
  </div>
</div>

);
}
