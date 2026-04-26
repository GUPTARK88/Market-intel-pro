export async function GET() {
  try {
    const res = await fetch(
      "https://api.stlouisfed.org/fred/series/observations?series_id=DCOILWTICO&api_key=0b43c53f35c7e2c88a7abb31e9ab6f0f&limit=1&sort_order=desc&file_type=json",
      { next: { revalidate: 300 } }
    );
    const oilData = await res.json();
    const oilPrice = oilData.observations?.[0]?.value || "82.45";

    const goldRes = await fetch(
      "https://api.stlouisfed.org/fred/series/observations?series_id=GOLDAMGBD228NLBM&api_key=0b43c53f35c7e2c88a7abb31e9ab6f0f&limit=2&sort_order=desc&file_type=json",
      { next: { revalidate: 300 } }
    );
    const goldData = await goldRes.json();
    const goldObs = goldData.observations || [];
    const goldPrice = parseFloat(goldObs[0]?.value || 2150);
    const goldPrev = parseFloat(goldObs[1]?.value || 2150);
    const goldChange = goldPrev ? ((goldPrice - goldPrev) / goldPrev * 100).toFixed(2) : "0.00";

    const silverRes = await fetch(
      "https://api.stlouisfed.org/fred/series/observations?series_id=SLVPRUSD&api_key=0b43c53f35c7e2c88a7abb31e9ab6f0f&limit=2&sort_order=desc&file_type=json",
      { next: { revalidate: 300 } }
    );
    const silverData = await silverRes.json();
    const silverObs = silverData.observations || [];
    const silverPrice = parseFloat(silverObs[0]?.value || 28.50);
    const silverPrev = parseFloat(silverObs[1]?.value || 28.50);
    const silverChange = silverPrev ? ((silverPrice - silverPrev) / silverPrev * 100).toFixed(2) : "0.00";

    return Response.json({
      gold: {
        price: "$" + goldPrice.toFixed(2) + "/oz",
        change: (goldChange >= 0 ? "+" : "") + goldChange + "%",
        up: parseFloat(goldChange) >= 0,
        raw: goldPrice
      },
      silver: {
        price: "$" + silverPrice.toFixed(2) + "/oz",
        change: (silverChange >= 0 ? "+" : "") + silverChange + "%",
        up: parseFloat(silverChange) >= 0,
        raw: silverPrice
      },
      copper: {
        price: "$4.25/lb",
        change: "-0.5%",
        up: false,
        raw: 4.25
      },
      oil: {
        price: "$" + parseFloat(oilPrice).toFixed(2) + "/bbl",
        change: "+1.2%",
        up: true,
        raw: parseFloat(oilPrice)
      }
    });
  } catch (error) {
    return Response.json({
      gold: { price: "$2,150/oz", change: "+0.3%", up: true, raw: 2150 },
      silver: { price: "$28.50/oz", change: "+0.8%", up: true, raw: 28.50 },
      copper: { price: "$4.25/lb", change: "-0.5%", up: false, raw: 4.25 },
      oil: { price: "$82.45/bbl", change: "+1.2%", up: true, raw: 82.45 }
    });
  }
}
