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

## Exchange Balance Feed

The exchange balance section reads `public/data/exchange-balances.json`.

To enable live BTC exchange reserve data:

1. Create or sign in to a CoinGlass account.
2. Get a CoinGlass API key with access to `/api/exchange/balance/list`.
3. In GitHub, open this repo's `Settings` -> `Secrets and variables` -> `Actions`.
4. Add a repository secret named `CG_API_KEY`.
5. Run the `Update Exchange Balances` workflow once, or wait for the hourly schedule.

The API key stays in GitHub Actions and is never exposed in the public website.
