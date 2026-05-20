# BTC Analytics

Static Bitcoin analytics dashboard deployed with GitHub Pages.

## Live Data

The site runs fully in the browser and uses free public sources only:

- Kraken, Coinbase, Bitstamp, Gemini, CoinGecko, and Blockchain.info for BTC price fallbacks.
- mempool.space for block height, fees, mempool data, address lookup, and recent transactions.
- alternative.me for the Fear and Greed Index.
- Public exchange endpoints for live BTC volume and price activity.

No API keys, backend server, or always-on Mac are required.

## Important Exchange Balance Note

Exact exchange wallet balances require proprietary wallet labeling from paid providers. This no-key version does not fake those numbers. It tracks live exchange activity, BTC volume, price, and an explicitly labeled liquid-supply estimate using free public APIs.

## Local Preview

```bash
python3 -m http.server 4173 -d public
```

Then open `http://localhost:4173`.

## Deploy

GitHub Pages deploys the static `public/` folder through `.github/workflows/deploy-pages.yml`.
