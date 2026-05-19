(function bitcoinTrackerApp(globalScope) {
  const utils = globalScope.BitcoinTrackerUtils;

  if (!utils) {
    throw new Error("BitcoinTrackerUtils is required before main.js loads.");
  }

  const PRODUCT_ID = "BTC-USD";
  const API_BASE = `https://api.exchange.coinbase.com/products/${PRODUCT_ID}`;
  const FEED_URL = "wss://ws-feed.exchange.coinbase.com";
  const EXCHANGE_TICKERS_URL =
    "https://api.coingecko.com/api/v3/coins/bitcoin/tickers?order=volume_desc&include_exchange_logo=false";
  const EXCHANGE_TICKER_PAGES = 3;
  const CHART_WIDTH = 720;
  const CHART_HEIGHT = 280;
  const CHART_PADDING = 24;

  const elements = {
    currentPrice: document.getElementById("current-price"),
    priceChange: document.getElementById("price-change"),
    priceEquivalent: document.getElementById("price-equivalent"),
    lastUpdated: document.getElementById("last-updated"),
    satsPerDollar: document.getElementById("sats-per-dollar"),
    dailyRange: document.getElementById("daily-range"),
    lastTradeSize: document.getElementById("last-trade-size"),
    liveStatus: document.getElementById("live-status"),
    liveStatusLabel: document.getElementById("live-status-label"),
    feedState: document.getElementById("feed-state"),
    momentumState: document.getElementById("momentum-state"),
    rangePosition: document.getElementById("range-position"),
    openComparison: document.getElementById("open-comparison"),
    distanceToHigh: document.getElementById("distance-to-high"),
    distanceToLow: document.getElementById("distance-to-low"),
    volume30d: document.getElementById("volume-30d"),
    chartHigh: document.getElementById("chart-high"),
    chartLow: document.getElementById("chart-low"),
    trendBias: document.getElementById("trend-bias"),
    statHigh: document.getElementById("stat-high"),
    statLow: document.getElementById("stat-low"),
    statVolume: document.getElementById("stat-volume"),
    statOpen: document.getElementById("stat-open"),
    exchangeBalanceStatus: document.getElementById("exchange-balance-status"),
    exchangeBalanceTotal: document.getElementById("exchange-balance-total"),
    exchangeCount: document.getElementById("exchange-count"),
    exchangeBalanceUpdated: document.getElementById("exchange-balance-updated"),
    exchangeBalancesBody: document.getElementById("exchange-balances-body"),
    sparklinePath: document.getElementById("sparkline-path"),
    sparklineArea: document.getElementById("sparkline-area"),
    sparklineDot: document.getElementById("sparkline-dot"),
  };

  const state = {
    currentPrice: null,
    open24h: null,
    high24h: null,
    low24h: null,
    volume24h: null,
    volume30d: null,
    lastTradeSize: null,
    candles: [],
    exchangeActivity: null,
    lastUpdatedAt: null,
    reconnectDelayMs: 1000,
    reconnectTimer: null,
    socket: null,
  };

  function numberOrNull(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.json();
  }

  async function refreshStats() {
    const stats = await fetchJson(`${API_BASE}/stats`);

    state.open24h = numberOrNull(stats.open);
    state.high24h = numberOrNull(stats.high);
    state.low24h = numberOrNull(stats.low);
    state.volume24h = numberOrNull(stats.volume);
    state.volume30d = numberOrNull(stats.volume_30day);

    if (state.currentPrice === null) {
      state.currentPrice = numberOrNull(stats.last);
    }
  }

  async function refreshCandles() {
    const candles = await fetchJson(`${API_BASE}/candles?granularity=3600`);
    state.candles = utils.normalizeCandles(candles).slice(-24);
  }

  async function refreshExchangeActivity() {
    const pages = await Promise.all(
      Array.from({ length: EXCHANGE_TICKER_PAGES }, (_, pageIndex) =>
        fetchJson(`${EXCHANGE_TICKERS_URL}&page=${pageIndex + 1}`),
      ),
    );
    const tickers = pages.flatMap((page) => page.tickers || []);

    state.exchangeActivity = {
      source: "CoinGecko",
      updatedAt: new Date().toISOString(),
      exchanges: utils.normalizeExchangeActivity(tickers),
    };
    renderExchangeActivity();
  }

  function setStatus(label, tone) {
    elements.liveStatusLabel.textContent = label;
    elements.liveStatus.dataset.tone = tone;
    elements.feedState.textContent = label;
  }

  function updateStateFromTicker(message) {
    state.currentPrice = numberOrNull(message.price) ?? state.currentPrice;
    state.open24h = numberOrNull(message.open_24h) ?? state.open24h;
    state.high24h = numberOrNull(message.high_24h) ?? state.high24h;
    state.low24h = numberOrNull(message.low_24h) ?? state.low24h;
    state.volume24h = numberOrNull(message.volume_24h) ?? state.volume24h;
    state.volume30d = numberOrNull(message.volume_30d) ?? state.volume30d;
    state.lastTradeSize = numberOrNull(message.last_size) ?? state.lastTradeSize;
    state.lastUpdatedAt = message.time ? new Date(message.time) : new Date();
  }

  function getRangePositionLabel(price, low, high) {
    if (![price, low, high].every(Number.isFinite) || high <= low) {
      return "Waiting for range";
    }

    const ratio = (price - low) / (high - low);

    if (ratio >= 0.8) {
      return "Near session high";
    }

    if (ratio <= 0.2) {
      return "Near session low";
    }

    return "Inside the range";
  }

  function getMomentumLabel(changePercent) {
    if (!Number.isFinite(changePercent)) {
      return "Waiting for direction";
    }

    if (changePercent > 1.5) {
      return "Strong upside";
    }

    if (changePercent > 0) {
      return "Grinding higher";
    }

    if (changePercent < -1.5) {
      return "Heavy downside";
    }

    if (changePercent < 0) {
      return "Softening";
    }

    return "Flat tape";
  }

  function renderPrice() {
    if (!Number.isFinite(state.currentPrice)) {
      return;
    }

    elements.currentPrice.textContent = utils.formatCurrency(state.currentPrice);
    elements.priceEquivalent.textContent = `1 BTC = ${utils.formatCurrency(state.currentPrice, 0)} USD`;
    elements.satsPerDollar.textContent = utils.formatInteger(utils.calculateSatsPerDollar(state.currentPrice));
    elements.lastTradeSize.textContent = Number.isFinite(state.lastTradeSize)
      ? `${utils.formatDecimal(state.lastTradeSize, 5)} BTC`
      : "Waiting for trade";

    if (Number.isFinite(state.high24h) && Number.isFinite(state.low24h)) {
      elements.dailyRange.textContent = `${utils.formatCurrency(state.low24h, 0)} to ${utils.formatCurrency(state.high24h, 0)}`;
    }

    if (state.lastUpdatedAt instanceof Date && !Number.isNaN(state.lastUpdatedAt.valueOf())) {
      elements.lastUpdated.textContent = `Updated ${utils.formatRelativeTime(state.lastUpdatedAt)}`;
    }

    const change = utils.calculateDailyChange(state.currentPrice, state.open24h);
    elements.priceChange.textContent = Number.isFinite(change.percent)
      ? `${change.percent >= 0 ? "+" : ""}${utils.formatPercent(change.percent)}`
      : "--";
    elements.priceChange.dataset.direction = utils.getChangeDirection(change.percent);

    elements.momentumState.textContent = getMomentumLabel(change.percent);
    elements.openComparison.textContent = Number.isFinite(change.absolute)
      ? `${change.absolute >= 0 ? "+" : ""}${utils.formatCurrency(change.absolute, 0)}`
      : "--";
  }

  function renderStats() {
    elements.chartHigh.textContent = utils.formatCurrency(state.high24h);
    elements.chartLow.textContent = utils.formatCurrency(state.low24h);
    elements.statHigh.textContent = utils.formatCurrency(state.high24h);
    elements.statLow.textContent = utils.formatCurrency(state.low24h);
    elements.statOpen.textContent = utils.formatCurrency(state.open24h);
    elements.statVolume.textContent = Number.isFinite(state.volume24h)
      ? `${utils.formatCompactNumber(state.volume24h)} BTC`
      : "--";
    elements.volume30d.textContent = Number.isFinite(state.volume30d)
      ? `${utils.formatCompactNumber(state.volume30d)} BTC`
      : "--";
    elements.rangePosition.textContent = getRangePositionLabel(
      state.currentPrice,
      state.low24h,
      state.high24h,
    );

    if (Number.isFinite(state.currentPrice) && Number.isFinite(state.high24h)) {
      elements.distanceToHigh.textContent = utils.formatCurrency(
        Math.max(state.high24h - state.currentPrice, 0),
        0,
      );
    }

    if (Number.isFinite(state.currentPrice) && Number.isFinite(state.low24h)) {
      elements.distanceToLow.textContent = utils.formatCurrency(
        Math.max(state.currentPrice - state.low24h, 0),
        0,
      );
    }
  }

  function renderChart() {
    if (!state.candles.length) {
      elements.sparklinePath.setAttribute("d", "");
      elements.sparklineArea.setAttribute("d", "");
      elements.sparklineDot.setAttribute("r", "0");
      elements.trendBias.textContent = "Waiting";
      return;
    }

    const closes = state.candles.map((entry) => entry.close);
    if (Number.isFinite(state.currentPrice)) {
      closes[closes.length - 1] = state.currentPrice;
    }

    const chart = utils.buildSparklineData(closes, CHART_WIDTH, CHART_HEIGHT, CHART_PADDING);

    elements.sparklinePath.setAttribute("d", chart.linePath);
    elements.sparklineArea.setAttribute("d", chart.areaPath);
    elements.sparklineDot.setAttribute("cx", String(chart.lastPoint.x));
    elements.sparklineDot.setAttribute("cy", String(chart.lastPoint.y));
    elements.sparklineDot.setAttribute("r", "8");
    elements.trendBias.textContent = closes[closes.length - 1] >= closes[0] ? "Bullish slope" : "Pullback";
  }

  function escapeHtml(value) {
    const wrapper = document.createElement("span");
    wrapper.textContent = String(value);
    return wrapper.innerHTML;
  }

  function renderExchangeActivity() {
    const snapshot = state.exchangeActivity;

    if (!snapshot || snapshot.error) {
      elements.exchangeBalanceStatus.textContent = snapshot?.message || "Loading CoinGecko exchange coin balances";
      elements.exchangeBalanceTotal.textContent = "-- BTC";
      elements.exchangeCount.textContent = "--";
      elements.exchangeBalanceUpdated.textContent = "--";
      elements.exchangeBalancesBody.innerHTML =
        '<tr><td class="exchange-empty" colspan="5">Exchange market feed is not available right now.</td></tr>';
      return;
    }

    const summary = utils.calculateExchangeActivitySummary(snapshot.exchanges);
    elements.exchangeBalanceStatus.textContent = `Source: ${snapshot.source}`;
    elements.exchangeBalanceTotal.textContent = Number.isFinite(summary.totalVolumeBtc)
      ? `${utils.formatCompactNumber(summary.totalVolumeBtc)} BTC`
      : "-- BTC";
    elements.exchangeCount.textContent = utils.formatInteger(summary.exchangeCount);
    elements.exchangeBalanceUpdated.textContent = summary.latestUpdate
      ? utils.formatRelativeTime(summary.latestUpdate)
      : "--";

    if (!snapshot.exchanges.length) {
      elements.exchangeBalancesBody.innerHTML =
        '<tr><td class="exchange-empty" colspan="5">No exchange market data returned.</td></tr>';
      return;
    }

    elements.exchangeBalancesBody.innerHTML = snapshot.exchanges
      .slice(0, 8)
      .map((exchange) => {
        return `<tr>
          <td><span class="exchange-name">${escapeHtml(exchange.name)}</span></td>
          <td>${escapeHtml(exchange.pair)}</td>
          <td>${utils.formatCurrency(exchange.priceUsd)}</td>
          <td>${Number.isFinite(exchange.volumeBtc) ? `${utils.formatCompactNumber(exchange.volumeBtc)} BTC` : "--"}</td>
          <td>${utils.formatPercent(exchange.spreadPercent)}</td>
        </tr>`;
      })
      .join("");
  }

  function render() {
    renderPrice();
    renderStats();
    renderChart();
    renderExchangeActivity();
  }

  function scheduleReconnect() {
    if (state.reconnectTimer) {
      window.clearTimeout(state.reconnectTimer);
    }

    state.reconnectTimer = window.setTimeout(() => {
      state.reconnectTimer = null;
      connectFeed();
    }, state.reconnectDelayMs);

    state.reconnectDelayMs = Math.min(state.reconnectDelayMs * 2, 30000);
  }

  function connectFeed() {
    if (state.socket) {
      state.socket.onopen = null;
      state.socket.onmessage = null;
      state.socket.onerror = null;
      state.socket.onclose = null;
      state.socket.close();
    }

    const socket = new WebSocket(FEED_URL);
    state.socket = socket;

    setStatus("Connecting to live feed", "loading");

    socket.onopen = () => {
      state.reconnectDelayMs = 1000;
      setStatus("Live feed connected", "live");

      socket.send(
        JSON.stringify({
          type: "subscribe",
          product_ids: [PRODUCT_ID],
          channels: ["ticker"],
        }),
      );
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type !== "ticker") {
        return;
      }

      updateStateFromTicker(message);
      render();
    };

    socket.onclose = () => {
      if (state.socket !== socket) {
        return;
      }

      setStatus("Reconnecting to live feed", "loading");
      scheduleReconnect();
    };

    socket.onerror = () => {
      if (state.socket !== socket) {
        return;
      }

      setStatus("Live feed error", "error");
      socket.close();
    };
  }

  async function hydrate() {
    try {
      await Promise.all([refreshStats(), refreshCandles()]);
      state.lastUpdatedAt = new Date();
      render();
      setStatus("Snapshot loaded", "loading");
    } catch (error) {
      console.error(error);
      setStatus("Could not load market snapshot", "error");
    }
  }

  hydrate();
  refreshExchangeActivity().catch((error) => {
    console.error(error);
    state.exchangeActivity = {
      error: true,
      message: "Could not load CoinGecko exchange coin balances",
      source: "CoinGecko",
      exchanges: [],
    };
    renderExchangeActivity();
  });
  connectFeed();
  window.setInterval(async () => {
    try {
      await refreshStats();
      render();
    } catch (error) {
      console.error(error);
    }
  }, 60000);
  window.setInterval(async () => {
    try {
      await refreshCandles();
      renderChart();
    } catch (error) {
      console.error(error);
    }
  }, 60000);
  window.setInterval(async () => {
    try {
      await refreshExchangeActivity();
    } catch (error) {
      console.error(error);
    }
  }, 60000);
  window.setInterval(() => {
    if (state.lastUpdatedAt) {
      renderPrice();
    }
  }, 1000);
})(typeof globalThis !== "undefined" ? globalThis : window);
