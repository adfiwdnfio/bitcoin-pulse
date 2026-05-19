(function bitcoinTrackerUtilsModule(globalScope) {
  function formatCurrency(value, maximumFractionDigits = 2) {
    if (!Number.isFinite(value)) {
      return "$--";
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits,
    }).format(value);
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    return `${value.toFixed(2)}%`;
  }

  function formatCompactNumber(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatDecimal(value, maximumFractionDigits = 2) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits,
    }).format(value);
  }

  function formatInteger(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  function calculateDailyChange(currentPrice, openPrice) {
    if (!Number.isFinite(currentPrice) || !Number.isFinite(openPrice) || openPrice === 0) {
      return { absolute: null, percent: null };
    }

    const absolute = currentPrice - openPrice;
    return {
      absolute,
      percent: (absolute / openPrice) * 100,
    };
  }

  function calculateSatsPerDollar(bitcoinPrice) {
    if (!Number.isFinite(bitcoinPrice) || bitcoinPrice <= 0) {
      return null;
    }

    return 100000000 / bitcoinPrice;
  }

  function getChangeDirection(value) {
    if (!Number.isFinite(value) || value === 0) {
      return "flat";
    }

    return value > 0 ? "up" : "down";
  }

  function normalizeCandles(candles) {
    if (!Array.isArray(candles)) {
      return [];
    }

    return candles
      .map((entry) => ({
        timestamp: Number(entry[0]) * 1000,
        low: Number(entry[1]),
        high: Number(entry[2]),
        open: Number(entry[3]),
        close: Number(entry[4]),
        volume: Number(entry[5]),
      }))
      .filter((entry) => Object.values(entry).every(Number.isFinite))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  function buildSparklineData(points, width, height, padding = 24) {
    const safePoints = Array.isArray(points) ? points.filter(Number.isFinite) : [];

    if (safePoints.length === 0) {
      return {
        linePath: "",
        areaPath: "",
        lastPoint: { x: 0, y: 0 },
      };
    }

    const min = Math.min(...safePoints);
    const max = Math.max(...safePoints);
    const range = max - min || 1;
    const innerWidth = Math.max(width - padding * 2, 1);
    const innerHeight = Math.max(height - padding * 2, 1);

    const chartPoints = safePoints.map((value, index) => {
      const x = padding + (index / Math.max(safePoints.length - 1, 1)) * innerWidth;
      const y = padding + ((max - value) / range) * innerHeight;
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    });

    const linePath = chartPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const lastPoint = chartPoints[chartPoints.length - 1];
    const firstPoint = chartPoints[0];
    const baseline = height - padding;
    const areaPath = `${linePath} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;

    return {
      linePath,
      areaPath,
      lastPoint,
    };
  }

  function formatRelativeTime(date, now = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
      return "just now";
    }

    const diffMs = now.valueOf() - date.valueOf();
    const seconds = Math.max(0, Math.round(diffMs / 1000));

    if (seconds < 5) {
      return "just now";
    }

    if (seconds < 60) {
      return `${seconds}s ago`;
    }

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.round(minutes / 60);
    return `${hours}h ago`;
  }

  const api = {
    buildSparklineData,
    calculateDailyChange,
    calculateSatsPerDollar,
    formatCompactNumber,
    formatCurrency,
    formatDecimal,
    formatInteger,
    formatPercent,
    formatRelativeTime,
    getChangeDirection,
    normalizeCandles,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.BitcoinTrackerUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
