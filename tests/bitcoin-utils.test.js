const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSparklineData,
  calculateDailyChange,
  calculateExchangeBalanceSummary,
  calculateSatsPerDollar,
  getChangeDirection,
  normalizeCandles,
  normalizeExchangeBalances,
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

test("exchange balances normalize and sort by BTC balance", () => {
  const result = normalizeExchangeBalances([
    { exchangeName: "Kraken", balance: "12000", change24hPercent: "-0.5" },
    { exchange_name: "Binance", total_balance: "100000", change_7d: "1.2" },
    { exchange: "Broken", balance: "not-a-number" },
  ]);

  assert.deepEqual(
    result.map((entry) => entry.name),
    ["Binance", "Kraken"],
  );
  assert.equal(result[0].balanceBtc, 100000);
  assert.equal(result[0].change7dPercent, 1.2);
  assert.equal(result[1].change24hPercent, -0.5);
});

test("exchange balance summary totals normalized exchange rows", () => {
  const result = calculateExchangeBalanceSummary([
    { name: "A", balanceBtc: 10 },
    { name: "B", balance_btc: "25.5" },
  ]);

  assert.equal(result.exchangeCount, 2);
  assert.equal(result.totalBtc, 35.5);
});
