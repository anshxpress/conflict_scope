<div align="center">

# CONFLICTSCOPE

### Open-Source Global Conflict Intelligence Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-1.3-f9f1e1?logo=bun&logoColor=black)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Real-time OSINT monitoring of armed conflicts worldwide - powered by 18 RSS feeds, GDELT, NLP event extraction, and interactive geospatial visualization.**

[Live Demo](#) &bull; [Quick Start](#-quick-start) &bull; [API Reference](#-api-reference) &bull; [Tech Stack](#-technology-stack)

</div>

---

## Why ConflictScope?

Wars don't wait for the morning news. Supply lines get cut. Markets react. Civilians move. By the time legacy outlets publish a roundup, the situation on the ground has already changed.

**ConflictScope** is a purpose-built intelligence dashboard that:

- Ingests articles from **18 global news feeds + GDELT** every 10 minutes
- Runs a **3-gate NLP filter** to discard entertainment, lifestyle, and duplicate content
- Extracts **conflict events** with geolocation, event typing, and confidence scoring
- Renders everything on a **dark-themed interactive world map** with heatmaps, clustering, and infrastructure overlays
- Shows **country risk profiles** with political leaders, billionaires, and commodity war-impact alerts

No API keys required. No paid services. Entirely self-hostable.

---

## Screenshots

> Deploy locally and explore - the dashboard comes alive with real conflict data within the first 10-minute pipeline cycle.

---

## Features

### Intelligence & Data

| Feature                 | Description                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **18 RSS Feeds**        | Reuters, BBC, Al Jazeera, Guardian, AP, CNN International, NYT, France 24 (x3), DW, Sky News, NPR, UN News, ReliefWeb, Middle East Eye, The Hindu, SCMP             |
| **GDELT Integration**   | DOC 2.0 API aggregator - queries conflict keywords, filters English-only + trusted domains                                                                          |
| **3-Gate NLP Filter**   | Gate 1: Entertainment disqualifier (~95 blockers). Gate 2: Keyword threshold with word-boundary matching. Gate 3: Geopolitical anchor or conflict region validation |
| **Confidence Scoring**  | Low / Medium / High based on source trust level + multi-source corroboration                                                                                        |
| **Geocoding**           | OSM Nominatim converts extracted place names to coordinates (no API key)                                                                                            |
| **45 Conflict Regions** | Curated watchlist for geopolitical anchor validation                                                                                                                |
| **10-Minute Pipeline**  | Automated scheduler fetches, extracts, geocodes, and stores events continuously                                                                                     |

### Visualization & UI

| Feature                    | Description                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Interactive World Map**  | Dark CARTO tiles, smooth fractional zoom (0.25 steps), animated pulse markers                                                            |
| **Event Markers**          | Color-coded by type - airstrikes (red), missile strikes (orange), drone strikes (purple), explosions (yellow), armed conflict (dark red) |
| **Marker Clustering**      | Automatic grouping with cluster counts at lower zoom levels                                                                              |
| **Conflict Heatmap**       | Density-based heat layer toggle for hotspot identification                                                                               |
| **Infrastructure Overlay** | Airports, power plants, oil refineries, military bases from OpenStreetMap                                                                |
| **Choropleth Risk Map**    | Countries colored by threat level (red / orange / green) based on event density                                                          |
| **Dual-Thumb Timeline**    | 30-day window, preset buttons (24h/7d/14d/30d), date pickers, density sparkline                                                          |
| **Live Event Feed**        | Real-time sidebar with country flags, relative timestamps, event type badges                                                             |
| **Statistics Dashboard**   | Donut, bar, and line charts (Chart.js) - events by type, country, and trend                                                              |

### Country Intelligence

| Feature                    | Description                                                                                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Country Risk Panel**     | Click any country on the map to see risk level, 14d/30d event counts, recent events                                                                                                                                                          |
| **Political Leaders**      | Top 10 political figures per country - heads of state, defense ministers, military chiefs, opposition leaders                                                                                                                                |
| **Wealthiest Individuals** | Billionaires by country with net worth and industry sector                                                                                                                                                                                   |
| **27 Country Profiles**    | Ukraine, Russia, Israel, Palestine, Syria, Iran, India, China, USA, UK, Turkey, Pakistan, Saudi Arabia, Sudan, Myanmar, North Korea, South Korea, France, Germany, Japan, Ethiopia, Nigeria, Lebanon, Iraq, Yemen, Somalia, DRC, Afghanistan |

### War-Impact Commodity Alerts

| Feature                       | Description                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **Notification Bell**         | Navbar alert icon showing commodity price movements driven by conflict          |
| **Gold / Silver / Crude Oil** | Price direction, percentage change, and conflict-impact context                 |
| **Coming Soon**               | Live commodity ticker, custom alert thresholds, supply chain disruption tracker |

---

## Architecture

```
                    ┌─────────────────────────────────────────────────┐
                    │              ConflictScope Platform             │
                    │                                                 │
  ┌──────────┐     │  ┌────────────────────────────────────────────┐ │
  │ 18 RSS   │────▶│  │           Bun Backend (Elysia.js)         │ │
  │ Feeds    │     │  │                                            │ │
  ├──────────┤     │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │ │
  │ GDELT    │────▶│  │  │ 3-Gate   │ │ OSM      │ │Confidence │ │ │
  │ DOC 2.0  │     │  │  │ NLP      │ │ Nominatim│ │ Scoring   │ │ │
  └──────────┘     │  │  │ Filter   │ │ Geocoder │ │ Engine    │ │ │
                    │  │  └────┬─────┘ └────┬─────┘ └─────┬─────┘ │ │
                    │  │       └────────────┴─────────────┘       │ │
                    │  │                    │                       │ │     ┌──────────┐
                    │  │              Store events ───────────────│─│────▶│PostgreSQL│
                    │  │                    │                       │ │     │(Neon DB) │
                    │  │              REST API /api/v1              │ │     └──────────┘
                    │  └──────────┬─────────────────────────────────┘ │
                    │             │                                    │
                    │             ▼                                    │
                    │  ┌────────────────────────────────────────────┐ │
                    │  │          Next.js 14 Frontend               │ │
                    │  │                                            │ │
                    │  │  Leaflet Map  │  Timeline  │  Statistics  │ │
                    │  │  Heatmaps     │  Filters   │  Chart.js    │ │
                    │  │  Clustering   │  Feed      │  Risk Panel  │ │
                    │  │  Choropleth   │  Leaders   │  Commodities │ │
                    │  └────────────────────────────────────────────┘ │
                    └─────────────────────────────────────────────────┘
```

---

## Data Sources

All data sources are **free and require no API keys**.

| Source                  | Type      | Coverage                                                 |
| ----------------------- | --------- | -------------------------------------------------------- |
| **Reuters**             | RSS       | Global breaking news                                     |
| **BBC World**           | RSS       | International affairs                                    |
| **Al Jazeera**          | RSS       | Middle East, Africa, Asia                                |
| **Associated Press**    | RSS       | Wire service, global                                     |
| **CNN International**   | RSS       | Global conflicts                                         |
| **New York Times**      | RSS       | International desk                                       |
| **The Guardian**        | RSS       | World news                                               |
| **DW (Deutsche Welle)** | RSS       | European & global affairs                                |
| **Sky News World**      | RSS       | Breaking international                                   |
| **NPR World**           | RSS       | Analysis & reporting                                     |
| **France 24**           | RSS (x3)  | Africa, Middle East, Americas                            |
| **UN News**             | RSS       | UN operations, peacekeeping                              |
| **ReliefWeb**           | RSS       | Humanitarian updates                                     |
| **Middle East Eye**     | RSS       | MENA region focus                                        |
| **The Hindu**           | RSS       | South Asia                                               |
| **SCMP**                | RSS       | Asia-Pacific                                             |
| **GDELT DOC 2.0**       | API       | Global event aggregation (English, trusted domains only) |
| **OSM Nominatim**       | Geocoding | Place name to coordinates                                |
| **OSM Overpass**        | Query API | Infrastructure data (airports, power plants, refineries) |

---

## Event Classification

| Type                    | Marker Color | Example Keywords                                  |
| ----------------------- | ------------ | ------------------------------------------------- |
| `airstrike`             | Red          | airstrike, air raid, aerial bombardment           |
| `missile_strike`        | Orange       | missile launch, rocket attack, ballistic          |
| `drone_strike`          | Purple       | drone strike, UAV attack, Shahed                  |
| `explosion`             | Yellow       | explosion, IED, car bomb, blast                   |
| `armed_conflict`        | Dark Red     | shelling, artillery, ground offensive, firefight  |
| `infrastructure_attack` | Amber        | power grid hit, pipeline attack, bridge destroyed |

---

## NLP Pipeline

Every 10 minutes, the pipeline processes incoming articles through a rigorous extraction chain:

```
RSS Feeds + GDELT (parallel fetch via Promise.all)
        │
        ▼
   Strip HTML, normalize text, remove BOM artifacts
        │
        ▼
   ┌─── GATE 1: Entertainment Disqualifier ───┐
   │  ~95 blockers: "bollywood", "wedding",   │
   │  "heartwarming", "recipe", "horoscope",  │
   │  "celebrity", "box office", etc.          │
   └────────────── pass ──────────────────────┘
        │
        ▼
   ┌─── GATE 2: Conflict Keyword Threshold ───┐
   │  Multi-word phrases + word-boundary       │
   │  matching for weak standalone words.      │
   │  Requires >= 2 body hits OR >= 1 title.   │
   └────────────── pass ──────────────────────┘
        │
        ▼
   ┌─── GATE 3: Geopolitical Anchor ──────────┐
   │  Must reference a known conflict region   │
   │  (45 countries/territories) OR contain    │
   │  geopolitical entity via NER.             │
   └────────────── pass ──────────────────────┘
        │
        ▼
   compromise.js NER → extract place names
        │
        ▼
   OSM Nominatim geocoding → lat/lon (rate-limited)
        │
        ▼
   Confidence scoring (source trust + corroboration)
        │
        ▼
   PostgreSQL (deduplicated by article URL)
```

---

## Confidence Scoring

| Condition                                 | Level      | Meaning                     |
| ----------------------------------------- | ---------- | --------------------------- |
| 1 untrusted source                        | **Low**    | Single unverified report    |
| 1 trusted source (Reuters, BBC, AP, etc.) | **Medium** | Reliable but uncorroborated |
| 2 sources                                 | **Medium** | Cross-referenced            |
| 3+ sources                                | **High**   | Multi-source verified       |

Trusted sources include all 18 named feeds plus 11 GDELT domain prefixes (reuters.com, apnews.com, bbc.com, etc.).

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Node.js](https://nodejs.org) >= 20
- [PostgreSQL](https://postgresql.org) >= 14 (or use [Neon](https://neon.tech) free tier)

### 1. Clone

```bash
git clone https://github.com/anshxpress/conflict_scope.git
cd conflict_scope/conflictscope
```

### 2. Database

**Option A - Docker:**

```bash
docker run -d \
  --name conflictscope-db \
  -e POSTGRES_DB=conflictscope \
  -e POSTGRES_PASSWORD=conflictscope_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

**Option B - Neon (free hosted):**

1. Create a database at [neon.tech](https://neon.tech)
2. Copy the connection string

### 3. Backend

```bash
cd backend
cp .env.example .env          # Set your DATABASE_URL
bun install
bun run db:push               # Apply schema to database
bun run seed:infrastructure   # (Optional) Load airports, power plants, refineries
bun run dev                   # Starts on http://localhost:3001
```

### 4. Frontend

```bash
cd frontend
bun install
bun run dev                   # Starts on http://localhost:3000
```

### 5. Docker Compose (Full Stack)

```bash
docker compose up --build
```

| Service   | URL                          |
| --------- | ---------------------------- |
| Dashboard | http://localhost:3000        |
| API       | http://localhost:3001        |
| Health    | http://localhost:3001/health |

> The pipeline runs its first cycle immediately on startup. Within 10 minutes you'll have live conflict data on the map.

---

## API Reference

Base URL: `/api/v1`

### GET `/events`

Fetch conflict events with filtering and pagination.

| Parameter    | Type     | Description                           |
| ------------ | -------- | ------------------------------------- |
| `country`    | string   | Filter by country name                |
| `type`       | string   | Filter by event type                  |
| `confidence` | string   | `low`, `medium`, `high`               |
| `from`       | ISO 8601 | Start of time range                   |
| `to`         | ISO 8601 | End of time range                     |
| `limit`      | number   | Max results (default: 200, max: 1000) |
| `offset`     | number   | Pagination offset                     |

### GET `/events/:id`

Single event with all corroborating sources.

### GET `/infrastructure`

| Parameter | Type   | Description                                               |
| --------- | ------ | --------------------------------------------------------- |
| `type`    | string | `airport`, `power_plant`, `oil_refinery`, `military_base` |
| `country` | string | Filter by country                                         |

### GET `/stats`

Global statistics: total events, breakdown by type, country, and monthly trends.

### GET `/stats/:country`

Country-specific statistics with monthly trend data.

### GET `/risk-map`

Returns country-level risk assessment (`red` / `orange` / `green`) based on event density over 14/30 day windows.

### GET `/risk-map/:country`

Detailed risk breakdown for a single country including recent events list.

---

## Configuration

### Backend Environment

| Variable              | Default       | Description                      |
| --------------------- | ------------- | -------------------------------- |
| `DATABASE_URL`        | _required_    | PostgreSQL connection string     |
| `PORT`                | `3001`        | API server port                  |
| `NODE_ENV`            | `development` | Environment mode                 |
| `FEED_CHECK_INTERVAL` | `600000`      | Pipeline interval in ms (10 min) |
| `NOMINATIM_BASE_URL`  | OSM default   | Geocoding API base               |
| `FRONTEND_URL`        | `*`           | CORS allowed origin              |

### Frontend Environment

| Variable              | Default                 | Description     |
| --------------------- | ----------------------- | --------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |

---

## Deployment

### Frontend - Vercel (Free)

1. Connect repo to [Vercel](https://vercel.com)
2. Root directory: `frontend`
3. Set `NEXT_PUBLIC_API_URL` to your backend URL
4. Deploy

### Backend - Render (Free)

1. Create a new Web Service at [render.com](https://render.com)
2. Connect your repo and set Root Directory to `backend`
3. Render will use `backend/render.yaml` and `Dockerfile`
4. Set environment variables: `DATABASE_URL`, `FRONTEND_URL`, `PORT=3001`

### Database - Neon (Free)

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech)
2. Copy connection string to backend's `DATABASE_URL`
3. Run `bun run db:push`

---

## Project Structure

```
conflictscope/
├── backend/                         # Bun + Elysia.js REST API
│   ├── db/
│   │   ├── schema.ts                # Drizzle ORM table definitions
│   │   └── index.ts                 # DB connection (pooled, hardened)
│   ├── src/
│   │   ├── index.ts                 # Entry point + global error handlers
│   │   ├── server/
│   │   │   ├── app.ts               # Elysia app factory
│   │   │   └── routes/
│   │   │       ├── events.ts        # Event CRUD + filtering
│   │   │       ├── infrastructure.ts
│   │   │       ├── stats.ts         # Statistics + country breakdown
│   │   │       └── risk-map.ts      # Choropleth risk assessment
│   │   └── services/
│   │       ├── rss/feed-fetcher.ts          # 18 RSS feeds + GDELT aggregator
│   │       ├── nlp/event-extractor.ts       # 3-gate NLP pipeline
│   │       ├── geocoding/nominatim.ts       # OSM geocoding
│   │       ├── verification/confidence.ts   # Source trust + scoring
│   │       ├── infrastructure/osm-seeder.ts # Overpass API seeder
│   │       └── workers/
│   │           ├── pipeline.ts              # RSS + GDELT parallel fetch → process → store
│   │           └── scheduler.ts             # 10-minute interval trigger
│   ├── scripts/
│   │   ├── seed-events.ts
│   │   └── seed-infrastructure.ts
│   ├── Dockerfile
│   ├── render.yaml              # Render deployment (legacy)
│   └── package.json
│
├── frontend/                        # Next.js 14 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx             # Main dashboard
│   │   ├── components/
│   │   │   ├── map/MapView.tsx              # Leaflet + heatmap + clusters + choropleth
│   │   │   ├── timeline/TimelineSlider.tsx  # Dual-thumb with sparkline
│   │   │   ├── SmoothScroll.tsx             # Lenis smooth scrolling wrapper
│   │   │   └── dashboard/
│   │   │       ├── FilterPanel.tsx
│   │   │       ├── EventDetailsPanel.tsx
│   │   │       ├── InfrastructureLayerToggle.tsx
│   │   │       ├── ConflictStatsPanel.tsx
│   │   │       ├── LiveEventFeed.tsx
│   │   │       ├── CountryRiskPanel.tsx     # Risk + leaders + billionaires
│   │   │       └── NotificationBell.tsx     # Commodity war-impact alerts
│   │   ├── lib/
│   │   │   ├── api.ts               # Typed API client
│   │   │   ├── hooks.ts             # SWR data fetching hooks
│   │   │   ├── countryFlags.ts      # 130+ country flag emoji mapping
│   │   │   └── countryLeaders.ts    # 27 country political + billionaire profiles
│   │   ├── types/index.ts           # All TypeScript interfaces + constants
│   │   └── styles/globals.css
│   ├── public/data/countries.geojson
│   ├── Dockerfile
│   └── tailwind.config.js
│
├── docker-compose.yml
├── vercel.json
└── README.md
```

---

## Technology Stack

| Layer             | Technology                 | Purpose                                    |
| ----------------- | -------------------------- | ------------------------------------------ |
| **Runtime**       | Bun 1.3                    | Backend JavaScript runtime                 |
| **API Framework** | Elysia.js                  | Type-safe HTTP server                      |
| **Database**      | PostgreSQL 16              | Event + infrastructure storage             |
| **ORM**           | Drizzle ORM                | Type-safe schema + queries                 |
| **NLP**           | compromise.js + natural    | Named Entity Recognition + text processing |
| **Geocoding**     | OSM Nominatim              | Free place name to lat/lon                 |
| **Frontend**      | Next.js 14 (App Router)    | React server/client components             |
| **Map**           | Leaflet.js                 | Interactive map with CARTO dark tiles      |
| **Heatmap**       | leaflet.heat               | Density visualization                      |
| **Clustering**    | leaflet.markercluster      | Event marker grouping                      |
| **Charts**        | Chart.js + react-chartjs-2 | Statistical dashboards                     |
| **Styling**       | TailwindCSS                | Utility-first dark theme                   |
| **Smooth Scroll** | Lenis                      | Sub-pixel smooth scrolling on panels       |
| **Data Fetching** | SWR                        | Stale-while-revalidate with auto-refresh   |
| **Deployment**    | Vercel + Render + Neon     | Free / hobby tier                          |

---

## Stability & Resilience

The backend is hardened for continuous unattended operation:

- **Global error handlers** - `uncaughtException` and `unhandledRejection` are caught and logged without crashing the process
- **Graceful shutdown** - SIGINT/SIGTERM handlers stop the scheduler and close the server cleanly
- **DB connection pool** - `max: 10`, `idle_timeout: 20s`, `connect_timeout: 15s`, `max_lifetime: 300s`
- **Rate-limited geocoding** - Respects Nominatim's usage policy with delays between requests
- **Deduplication** - Events are deduplicated by article URL to prevent duplicate markers

---

## Roadmap

- [ ] Live commodity price ticker (gold, silver, crude oil) via free APIs
- [ ] Custom alert thresholds for price spike notifications
- [ ] Supply chain disruption tracker
- [ ] Refugee movement corridor visualization
- [ ] Satellite imagery overlay for damage assessment
- [ ] Telegram/Signal channel ingestion
- [ ] Historical conflict timeline playback
- [ ] Multi-language NLP support (Arabic, Ukrainian, Russian)

---

## Contributing

Contributions are welcome. Please open an issue first to discuss significant changes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

MIT - free to use, modify, and deploy for research, journalism, and educational purposes.

---

<div align="center">

**Built for those who need to know what's happening - before it makes the headlines.**

> **Disclaimer:** ConflictScope is an open-source intelligence tool that relies on publicly available data. Accuracy depends on source quality and NLP extraction fidelity. Always cross-reference with primary sources and official reports before making decisions based on this data. This tool is intended for research, journalism, and humanitarian awareness - not for military operational use.

</div>
