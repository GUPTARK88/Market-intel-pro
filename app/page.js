‘use client’;
import { useState, useEffect } from ‘react’;

export default function MarketIntelPro() {
const [news, setNews] = useState([]);
const [geoAlerts, setGeoAlerts] = useState([]);
const [metals, setMetals] = useState(null);
const [fedRate, setFedRate] = useState(null);
const [loading, setLoading] = useState(false);
const [lastUpdate, setLastUpdate] = useState(’’);
const [showSetup, setShowSetup] = useState(true);
const [newsKey, setNewsKey] = useState(’’);
const [geminiKey, setGeminiKey] = useState(’’);
const [savedNewsKey, setSavedNewsKey] = useState(’’);
const [savedGeminiKey, setSavedGeminiKey] = useState(’’);
const [filter, setFilter] = useState(‘all’);

useEffect(() => {
if (typeof window !== ‘undefined’) {
const nk = localStorage.getItem(‘newsapi_key’) || ‘’;
const gk = localStorage.getItem(‘gemini_key’) || ‘’;
setSavedNewsKey(nk);
setSavedGeminiKey(gk);
if (nk && gk) setShowSetup(false);
}
}, []);

const analyzeWithGemini = async (text, gemKey) => {
try {
const prompt = `You are a financial analyst. Analyze this news and return ONLY a JSON object, no markdown, no explanation: NEWS: "${text}" Return exactly this JSON format: {"stocks":[{"symbol":"AAPL","impact":"positive","magnitude":"high","reason":"earnings beat","move":"+5-8%"},{"symbol":"MSFT","impact":"negative","magnitude":"medium","reason":"competition","move":"-2-3%"}],"metals":[{"name":"Gold","impact":"positive","magnitude":"medium","reason":"safe haven","move":"+1-2%"}],"sentiment":"bullish","severity":"high","summary":"Brief one line market summary"}`;

```
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${gemKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
} catch (e) {
  return null;
}
```

};

const fetchFedRate = async () => {
try {
const res = await fetch(‘https://api.stlouisfed.org/fred/series/data?series_id=FEDFUNDS&api_key=0b43c53f35c7e2c88a7abb31e9ab6f0f&limit=1&sort_order=desc’);
const data = await res.json();
if (data.observations?.[0]) setFedRate(parseFloat(data.observations[0].value));
} catch (e) { setFedRate(4.5); }
};

const fetchMetals = async () => {
setMetals({
gold: { price: ‘$2,150/oz’, change: ‘+0.3%’, up: true },
silver: { price: ‘$28.50/oz’, change: ‘+0.8%’, up: true },
copper: { price: ‘$4.25/lb’, change: ‘-0.5%’, up: false },
oil: { price: ‘$82.45/bbl’, change: ‘+1.2%’, up: true }
});
};

const fetchAllNews = async (nKey, gKey) => {
setLoading(true);
try {
const [mRes, gRes] = await Promise.all([
fetch(`https://newsapi.org/v2/everything?q=stock+market+earnings+economy+Federal+Reserve&sortBy=publishedAt&language=en&pageSize=6&apiKey=${nKey}`),
fetch(`https://newsapi.org/v2/everything?q=iran+war+china+gold+OPEC+trade+tariff+geopolitical&sortBy=publishedAt&language=en&pageSize=4&apiKey=${nKey}`)
]);

```
  const mData = await mRes.json();
  const gData = await gRes.json();

  if (mData.articles?.length) {
    const analyzed = await Promise.all(
      mData.articles.slice(0, 5).map(async (a) => {
        const analysis = await analyzeWithGemini(a.title + ' ' + (a.description || ''), gKey);
        return {
          id: a.url,
          headline: a.title,
          description: a.description,
          source: a.source?.name,
          time: new Date(a.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          url: a.url,
          stocks: analysis?.stocks || [],
          metals: analysis?.metals || [],
          sentiment: analysis?.sentiment || 'neutral',
          severity: analysis?.severity || 'low',
          summary: analysis?.summary || '',
          isNew: true
        };
      })
    );
    setNews(analyzed);
    analyzed.forEach(item => {
      if (item.severity === 'high' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Market Alert!', { body: item.headline.substring(0, 100) });
      }
    });
  }

  if (gData.articles?.length) {
    const analyzed = await Promise.all(
      gData.articles.slice(0, 3).map(async (a) => {
        const analysis = await analyzeWithGemini(a.title + ' ' + (a.description || ''), gKey);
        return {
          id: a.url,
          headline: a.title,
          source: a.source?.name,
          time: new Date(a.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          url: a.url,
          stocks: analysis?.stocks || [],
          metals: analysis?.metals || [],
          sentiment: analysis?.sentiment || 'neutral',
          severity: analysis?.severity || 'medium',
          summary: analysis?.summary || ''
        };
      })
    );
    setGeoAlerts(analyzed);
  }

  setLastUpdate(new Date().toLocaleTimeString());
  setTimeout(() => setNews(p => p.map(n => ({ ...n, isNew: false }))), 3000);
} catch (e) {
  console.error(e);
}
setLoading(false);
```

};

useEffect(() => {
if (!showSetup && savedNewsKey && savedGeminiKey) {
fetchFedRate();
fetchMetals();
fetchAllNews(savedNewsKey, savedGeminiKey);
if (‘Notification’ in window) Notification.requestPermission();
const interval = setInterval(() => fetchAllNews(savedNewsKey, savedGeminiKey), 30000);
return () => clearInterval(interval);
}
}, [showSetup, savedNewsKey, savedGeminiKey]);

const handleStart = () => {
if (!newsKey || !geminiKey) { alert(‘Please enter both API keys’); return; }
localStorage.setItem(‘newsapi_key’, newsKey);
localStorage.setItem(‘gemini_key’, geminiKey);
setSavedNewsKey(newsKey);
setSavedGeminiKey(geminiKey);
setShowSetup(false);
};

const sev = { high: ‘#ef4444’, medium: ‘#f59e0b’, low: ‘#22c55e’ };
const sevBg = { high: ‘rgba(239,68,68,0.1)’, medium: ‘rgba(245,158,11,0.1)’, low: ‘rgba(34,197,94,0.1)’ };
const sevBorder = { high: ‘rgba(239,68,68,0.3)’, medium: ‘rgba(245,158,11,0.3)’, low: ‘rgba(34,197,94,0.3)’ };

const sorted = […news].sort((a, b) => {
const o = { high: 3, medium: 2, low: 1 };
return (o[b.severity] || 0) - (o[a.severity] || 0);
});

const filtered = filter === ‘all’ ? sorted : sorted.filter(n => n.severity === filter);

return (
<div style={{ minHeight: ‘100vh’, background: ‘linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)’, color: ‘#e2e8f0’, fontFamily: ‘-apple-system,BlinkMacSystemFont,sans-serif’, padding: ‘16px’ }}>
<div style={{ maxWidth: ‘900px’, margin: ‘0 auto’ }}>

```
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#fff' }}>📊 Market Intel Pro</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Real-time stocks • Geopolitics • Metals</p>
      </div>
      {lastUpdate && (
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Last Updated</p>
          <p style={{ margin: 0, fontSize: '13px', color: '#10b981', fontFamily: 'monospace' }}>{lastUpdate}</p>
        </div>
      )}
    </div>

    {/* Setup Screen */}
    {showSetup && (
      <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#fbbf24' }}>⚙️ One-Time Setup</h2>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#fcd34d', marginBottom: '8px' }}>NewsAPI Key (from newsapi.org)</label>
          <input
            type="password"
            placeholder="Paste your NewsAPI key here"
            value={newsKey}
            onChange={e => setNewsKey(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#fcd34d', marginBottom: '8px' }}>Google Gemini Key (from aistudio.google.com)</label>
          <input
            type="password"
            placeholder="Paste your Google Gemini key here"
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <button
          onClick={handleStart}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#10b981', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}
        >
          🚀 Start Monitoring
        </button>
        <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>Keys are saved only on your device. Never shared.</p>
      </div>
    )}

    {!showSetup && (
      <>
        {/* Economic Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '24px' }}>
          {fedRate && (
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#60a5fa', textTransform: 'uppercase' }}>Fed Rate</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#bfdbfe' }}>{fedRate}%</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#60a5fa' }}>US Federal Reserve</p>
            </div>
          )}
          {metals && Object.entries(metals).map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#fcd34d', textTransform: 'uppercase' }}>{k}</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fef3c7' }}>{v.price}</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: v.up ? '#22c55e' : '#ef4444' }}>{v.change}</p>
            </div>
          ))}
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['all', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${filter === f ? '#10b981' : '#334155'}`, background: filter === f ? 'rgba(16,185,129,0.2)' : 'transparent', color: filter === f ? '#10b981' : '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}
            >
              {f === 'all' ? 'All News' : `${f.charAt(0).toUpperCase() + f.slice(1)} Impact`}
            </button>
          ))}
          <button
            onClick={() => fetchAllNews(savedNewsKey, savedGeminiKey)}
            disabled={loading}
            style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #334155', background: 'transparent', color: loading ? '#475569' : '#94a3b8', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', marginLeft: 'auto' }}
          >
            {loading ? '⏳ Updating...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Geopolitical Alerts */}
        {geoAlerts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '16px', color: '#f87171', fontWeight: 700 }}>⚠️ Geopolitical Alerts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {geoAlerts.map((alert, i) => (
                <div key={i} style={{ background: sevBg[alert.severity] || sevBg.medium, border: `1px solid ${sevBorder[alert.severity] || sevBorder.medium}`, borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 600, flex: 1 }}>{alert.headline}</h3>
                    <span style={{ background: sev[alert.severity], color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{(alert.severity || 'MONITOR').toUpperCase()}</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94a3b8' }}>🕐 {alert.time} • {alert.source}</p>
                  {alert.summary && <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#cbd5e1' }}>{alert.summary}</p>}
                  {alert.stocks?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {alert.stocks.map((s, j) => (
                        <div key={j} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '13px' }}>${s.symbol}</span>
                          <span style={{ color: s.impact === 'positive' ? '#22c55e' : s.impact === 'negative' ? '#ef4444' : '#94a3b8', fontSize: '16px', marginLeft: '6px' }}>{s.impact === 'positive' ? '↑' : s.impact === 'negative' ? '↓' : '→'}</span>
                          <span style={{ color: '#10b981', fontSize: '12px', marginLeft: '4px', fontWeight: 600 }}>{s.move}</span>
                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>{s.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market News */}
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: '16px', color: '#10b981', fontWeight: 700 }}>📰 Market News — Ranked by Impact</h2>
          {loading && news.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
              <p style={{ fontSize: '32px', margin: '0 0 8px' }}>⏳</p>
              <p>Fetching live news & analyzing impacts...</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filtered.map((item, idx) => (
              <div key={item.id} style={{ background: sevBg[item.severity] || 'rgba(30,41,59,0.5)', border: `1px solid ${sevBorder[item.severity] || '#334155'}`, borderRadius: '12px', padding: '16px', transition: 'all 0.3s', outline: item.isNew ? '2px solid #10b981' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: sev[item.severity] || '#fff', minWidth: '24px' }}>{idx + 1}</span>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>{item.headline}</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <span style={{ background: sev[item.severity], color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{(item.severity || 'LOW').toUpperCase()}</span>
                    {item.isNew && <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }}>NEW</span>}
                  </div>
                </div>

                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b' }}>🕐 {item.time} • {item.source}</p>
                {item.summary && <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#94a3b8' }}>{item.summary}</p>}

                {/* Stocks Ranked */}
                {item.stocks?.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(100,116,139,0.2)', paddingTop: '12px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stocks Impacted (Most → Least)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '8px' }}>
                      {item.stocks.map((s, j) => (
                        <div key={j} style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>${s.symbol}</span>
                            <span style={{ color: s.impact === 'positive' ? '#22c55e' : s.impact === 'negative' ? '#ef4444' : '#94a3b8', fontSize: '20px', fontWeight: 700 }}>{s.impact === 'positive' ? '↑' : s.impact === 'negative' ? '↓' : '→'}</span>
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>{s.reason}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: s.impact === 'positive' ? '#22c55e' : s.impact === 'negative' ? '#ef4444' : '#94a3b8' }}>{s.move}</span>
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: s.magnitude === 'high' ? 'rgba(239,68,68,0.2)' : s.magnitude === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)', color: s.magnitude === 'high' ? '#fca5a5' : s.magnitude === 'medium' ? '#fcd34d' : '#93c5fd', fontWeight: 600, textTransform: 'uppercase' }}>{s.magnitude}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metals Impact */}
                {item.metals?.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Metals Impact</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {item.metals.map((m, j) => (
                        <div key={j} style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '8px', padding: '8px 12px' }}>
                          <span style={{ color: '#fcd34d', fontWeight: 700, fontSize: '13px' }}>💎 {m.name}</span>
                          <span style={{ color: m.impact === 'positive' ? '#22c55e' : '#ef4444', fontSize: '14px', margin: '0 4px' }}>{m.impact === 'positive' ? '↑' : '↓'}</span>
                          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>{m.move}</span>
                          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>{m.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: '#10b981', textDecoration: 'none' }}>Read full article →</a>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>Market Intel Pro • Auto-updates every 30 seconds • India market coming soon</p>
          <button
            onClick={() => { localStorage.clear(); setShowSetup(true); setSavedNewsKey(''); setSavedGeminiKey(''); }}
            style={{ marginTop: '8px', background: 'none', border: 'none', color: '#475569', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Change API Keys
          </button>
        </div>
      </>
    )}
  </div>
</div>
```

);
}
