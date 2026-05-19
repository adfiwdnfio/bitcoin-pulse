# Bitcoin Pulse

Static bitcoin tracker with live `BTC-USD` updates, a 24-hour sparkline, and market stats pulled directly from Coinbase in the browser.

## Run locally

From the project root:

```bash
python3 -m http.server 4173 -d public
```

Then open `http://localhost:4173`.

## Deploy without keeping your Mac on

This app is fully static. There is no backend to keep running.

Deploy the `public/` folder to any static host, for example:

- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages

Once it is deployed, the host serves the HTML/CSS/JS and each visitor's browser connects to the live bitcoin APIs directly. Your Mac does not need to stay on.

## GitHub Pages

This repo includes a GitHub Pages workflow in `.github/workflows/deploy-pages.yml`.

To publish:

1. Create a new GitHub repository.
2. Upload this project to that repo and push to the `main` branch.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Wait for the `Deploy GitHub Pages` workflow to finish.

Your live URL will be:

```text
https://<your-github-username>.github.io/<repo-name>/
```

## Exchange Activity Feed

The exchange activity section uses CoinGecko's keyless public API from the browser:

```text
https://api.coingecko.com/api/v3/coins/bitcoin/tickers
```

It shows major BTC markets by exchange, including top pair, latest price, 24-hour volume, and spread. No API key, GitHub secret, or paid data plan is required.
