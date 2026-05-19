const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSparklineData,
  calculateDailyChange,
  calculateExchangeActivitySummary,
  calculateSatsPerDollar,
  getChangeDirection,
  normalizeCandles,
  normalizeExchangeActivity,
} = require("../public/bitcoin-utils.js");

test("daily change returns absolute and percent moves", () => {
  const result = calculateDailyChange(120000, 100000);

  assert.equal(result.absolute, 20000);
  assert.equal(result.percent, 20);
});

test("sats per dollar converts from usd price", () => {
  assert.equal(calculateSatsPerDollar(100000), 1000);
});

test("change direction reports up down and flat states", () => {
  assert.equal(getChangeDirection(2.5), "up");
  assert.equal(getChangeDirection(-0.2), "down");
  assert.equal(getChangeDirection(0), "flat");
});

test("candles normalize into ascending timestamp order", () => {
  const result = normalizeCandles([
    [200, 90, 140, 100, 120, 12],
    [100, 80, 120, 90, 110, 10],
  ]);

  assert.deepEqual(result.map((entry) => entry.timestamp), [100000, 200000]);
  assert.equal(result[0].close, 110);
  assert.equal(result[1].close, 120);
});

test("sparkline data returns a line and area path", () => {
  const result = buildSparklineData([100, 110, 105, 130], 300, 120, 12);

  assert.match(result.linePath, /^M /);
  assert.match(result.areaPath, / Z$/);
  assert.deepEqual(result.lastPoint, { x: 288, y: 12 });
});

test("exchange activity aggregates and sorts by btc volume", () => {
  const result = normalizeExchangeActivity([
    {
      base: "BTC",
      target: "USD",
      market: { name: "Coinbase Exchange", identifier: "gdax" },
      converted_last: { usd: 100000 },
      volume: 2500,
      converted_volume: { usd: 250000000 },
      bid_ask_spread_percentage: 0.01,
      last_fetch_at: "2026-05-19T20:00:00Z",
    },
    {
      base: "BTC",
      target: "USDT",
      market: { name: "Binance", identifier: "binance" },
      converted_last: { usd: 100010 },
      volume: 2000,
      converted_volume: { usd: 500000000 },
      bid_ask_spread_percentage: 0.02,
      last_fetch_at: "2026-05-19T20:01:00Z",
    },
    {
      base: "BTC",
      target: "EUR",
      market: { name: "Coinbase Exchange", identifier: "gdax" },
      converted_last: { usd: 99900 },
      volume: 500,
      converted_volume: { usd: 50000000 },
      bid_ask_spread_percentage: 0.03,
      last_fetch_at: "2026-05-19T20:02:00Z",
    },
  ]);

  assert.deepEqual(
    result.map((entry) => entry.name),
    ["Coinbase Exchange", "Binance"],
  );
  assert.equal(result[0].volumeBtc, 3000);
  assert.equal(result[0].pair, "BTC/USD");
  assert.equal(result[1].volumeBtc, 2000);
});

test("exchange activity summary totals normalized exchange volume", () => {
  const result = calculateExchangeActivitySummary([
    {
      market: { name: "A" },
      volume: 1,
      converted_volume: { usd: 10 },
      last_fetch_at: "2026-05-19T20:00:00Z",
    },
    {
      market: { name: "B" },
      volume: 2.5,
      converted_volume: { usd: 25.5 },
      last_fetch_at: "2026-05-19T20:05:00Z",
    },
  ]);

  assert.equal(result.exchangeCount, 2);
  assert.equal(result.totalVolumeUsd, 35.5);
  assert.equal(result.totalVolumeBtc, 3.5);
  assert.equal(result.latestUpdate.toISOString(), "2026-05-19T20:05:00.000Z");
});
