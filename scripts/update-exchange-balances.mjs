import { mkdir, writeFile } from "node:fs/promises";

const OUTPUT_PATH = new URL("../public/data/exchange-balances.json", import.meta.url);
const API_URL = "https://open-api-v4.coinglass.com/api/exchange/balance/list?symbol=BTC";
const apiKey = process.env.CG_API_KEY;

function unavailableSnapshot(message) {
  return {
    status: "not_configured",
    source: "CoinGlass",
    symbol: "BTC",
    updatedAt: new Date().toISOString(),
    message,
    exchanges: [],
  };
}

function firstValue(entry, keys) {
  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null && entry[key] !== "") {
      return entry[key];
    }
  }

  return null;
}

function normalizeExchange(entry) {
  return {
    name: firstValue(entry, ["name", "exchangeName", "exchange_name", "exchange", "exchange_name_en"]),
    balanceBtc: firstValue(entry, ["balance", "balanceBtc", "balance_btc", "totalBalance", "total_balance"]),
    balanceUsd: firstValue(entry, ["balance_usd", "balanceUsd", "valueUsd", "value_usd", "usdValue"]),
    change24hPercent: firstValue(entry, [
      "change24hPercent",
      "change_24h_percent",
      "changePercent24h",
      "changeRate24h",
      "change_24h",
      "change1d",
    ]),
    change7dPercent: firstValue(entry, [
      "change7dPercent",
      "change_7d_percent",
      "changePercent7d",
      "changeRate7d",
      "change_7d",
      "change7d",
    ]),
    change30dPercent: firstValue(entry, [
      "change30dPercent",
      "change_30d_percent",
      "changePercent30d",
      "changeRate30d",
      "change_30d",
      "change30d",
    ]),
  };
}

async function fetchSnapshot() {
  if (!apiKey) {
    return unavailableSnapshot("Add a CG_API_KEY repository secret to enable live exchange balance updates.");
  }

  const response = await fetch(API_URL, {
    headers: {
      Accept: "application/json",
      "CG-API-KEY": apiKey,
    },
  });

  if (!response.ok) {
    return unavailableSnapshot(`CoinGlass request failed with HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const rawExchanges = Array.isArray(payload.data) ? payload.data : [];

  return {
    status: "ok",
    source: "CoinGlass",
    symbol: "BTC",
    updatedAt: new Date().toISOString(),
    message: payload.msg || "success",
    exchanges: rawExchanges.map(normalizeExchange),
  };
}

const snapshot = await fetchSnapshot();
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
