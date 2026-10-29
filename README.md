# 🌍 World Explorer

A fast, offline-first React app to explore every country on Earth — with **live weather for each country**. Built for a competition: polished dark UI, instant search, and **zero API keys** required to run.

![React](https://img.shields.io/badge/React-18-61DAFB) ![Vite](https://img.shields.io/badge/Vite-5-646CFF)

## ✨ Features

- **250 countries** bundled locally — browse, search and filter instantly, even offline.
- **Live weather** for every country (current + 3-day forecast) via Open-Meteo — free, no API key.
- **Instant search** by country name, official name, or capital.
- **Filter by region** and **sort** by name, population, or area.
- **Detail panel** with flag, capital, region, population, area, languages, currency, and a Google Maps link.
- **Responsive dark theme** that looks great on any screen.

## 🚀 Quick start

```bash
npm install
npm run dev      # open http://localhost:5173
```

Production build:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build
```

No `.env` file, no API keys, no signup. It just runs.

## 🏗️ Architecture

- **Bundled country data** (`src/countries.json`, ~89 KB): built from the
  [mledoze/countries](https://github.com/mledoze/countries) dataset (CC0 / public domain),
  with **population merged from the World Bank API**. Because the data ships with the app,
  browsing/searching never depends on a third-party service staying online.
- **Flags** served by [flagcdn.com](https://flagcdn.com) (free, CORS-enabled).
- **Live weather** from [Open-Meteo](https://open-meteo.com) (free, keyless, CORS-enabled),
  using each country's bundled coordinates — no separate geocoding call, fewer failure points.
  If the network blocks the request, the UI degrades gracefully instead of hanging.

### Regenerating the data

The dataset was generated once and committed, so the app is self-contained. To rebuild it
from the sources, see the field mapping in `src/api.js` and `src/weather.js`.

## 🧩 Project structure

```
world-explorer/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx               # React entry point
    ├── App.jsx                # Search / filter / sort state, layout
    ├── api.js                 # Bundled countries + flag/map URL helpers
    ├── weather.js             # Open-Meteo fetch + WMO weather-code mapping
    ├── countries.json         # 250 countries (bundled, sorted by name)
    ├── index.css              # Dark theme, responsive grid, slide-over panel
    └── components/
        ├── Header.jsx
        ├── Controls.jsx       # Search box, region filter, sort
        ├── CountryGrid.jsx    # Card grid of countries
        └── CountryDetail.jsx  # Slide-over panel + live weather
```

## 🗣️ Talking points (for the judges)

1. **No keys, no signup** — it runs the moment you clone it.
2. **Offline-first core** — country data is bundled, so the app is instant and resilient.
3. **Live data where it matters** — real, up-to-date weather on top of a stable local base.
4. **Graceful degradation** — network failures show a friendly message, never a crash.
5. **Clean, modern UI** — responsive dark theme, accessible, keyboard support (Esc closes).

## 📄 Data licenses

- Country data: [mledoze/countries](https://github.com/mledoze/countries) — CC0 1.0 (public domain).
- Population: [World Bank Open Data](https://data.worldbank.org) — CC BY 4.0.
- Weather: [Open-Meteo](https://open-meteo.com) — free for non-commercial use.
