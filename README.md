C# ConflictScope

> **Open Global Conflict Intelligence Dashboard**
>
> A production-grade OSINT platform that monitors global conflicts in real-time using free public data sources, NLP event extraction, and interactive geospatial visualization.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ConflictScope                           │
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  RSS Feeds   │───▶│  Bun Backend     │───▶│  PostgreSQL  │  │
│  │              │    │  (Elysia.js)     │    │  (Drizzle)   │  │
│  │ Reuters      │    │                  │    │              │  │
│  │ BBC          │    │ • NLP Pipeline   │    │ • events     │  │
│  │ Al Jazeera   │    │ • Geocoding      │    │ • sources    │  │
│  │ GDELT        │    │ • Confidence     │    │ • infra      │  │
│  └──────────────┘    │ • Scheduler      │    └──────────────┘  │
│                      └────────┬─────────┘                      │
│                               │ REST API                        │
│                               ▼                                 │
│                      ┌──────────────────┐                       │
│                      │  Next.js 14      │                       │
│                      │  (App Router)    │                       │
│                      │                  │                       │
│                      │ • Leaflet Map    │                       │
│                      │ • Heatmaps       │                       │
│                      │ • Clustering     │                       │
│                      │ • Timeline       │                       │
│                      │ • Chart.js Stats │                       │
│                      └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature                      | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| **Interactive World Map**    | Dark-themed Leaflet map with OSM/CARTO tiles      |
| **Conflict Event Markers**   | Color-coded by type with animated pulse effect    |
| **Marker Clustering**        | Automatic cluster grouping at zoom levels         |
| **Conflict Heatmap**         | Density-based heat visualization                  |
| **Strategic Infrastructure** | Airports, power plants, oil refineries overlaid   |
| **NLP Event Extraction**     | compromise.js extracts locations + event types    |
| **Geocoding**                | OSM Nominatim converts place names to coordinates |
| **Confidence Scoring**       | Low / Medium / High based on source corroboration |
| **Timeline Slider**          | Dual-handle range selector for temporal filtering |
| **Filter Panel**             | Filter by country, event type, confidence level   |
| **Live Event Feed**          | Real-time sidebar feed of recent events           |
| **Conflict Statistics**      | Chart.js dashboards — donut, bar, and line charts |
| **Auto-Refresh**             | Frontend polls API every 60 seconds               |
| **10-Minute Pipeline**       | Scheduler checks RSS feeds every 10 minutes       |

---

## Data Sources (All Free)

| Source                  | Type                | Notes                                 |
| ----------------------- | ------------------- | ------------------------------------- |
| Reuters World News      | RSS Feed            | `feeds.reuters.com/Reuters/worldNews` |
| BBC World News          | RSS Feed            | `feeds.bbci.co.uk/news/world/rss.xml` |
| Al Jazeera              | RSS Feed            | `aljazeera.com/xml/rss/all.xml`       |
| GDELT Project           | RSS Feed            | Global event database, free API       |
| OpenStreetMap Nominatim | Geocoding API       | Free, no API key required             |
| OpenStreetMap Overpass  | Infrastructure data | Free query API                        |

---

## Event Types

| Type                    | Color    | Keywords                                |
| ----------------------- | -------- | --------------------------------------- |
| `airstrike`             | Red      | airstrike, air raid, aerial bombardment |
| `missile_strike`        | Orange   | missile, rocket attack, ballistic       |
| `explosion`             | Yellow   | explosion, blast, IED, bomb             |
| `drone_strike`          | Purple   | drone strike, UAV, Shahed               |
| `infrastructure_attack` | Amber    | power grid, pipeline attack             |
| `armed_conflict`        | Dark Red | battle, shelling, artillery, offensive  |

---

## Project Structure

```
conflictscope/
├── backend/                    # Bun + Elysia.js API
│   ├── db/
│   │   ├── schema.ts           # Drizzle ORM table definitions
│   │   ├── index.ts            # DB connection
│   │   └── migrations/         # Auto-generated migrations
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── server/
│   │   │   ├── app.ts          # Elysia app factory
│   │   │   └── routes/
│   │   │       ├── events.ts   # GET /events, GET /events/:id
│   │   │       ├── infrastructure.ts  # GET /infrastructure
│   │   │       └── stats.ts    # GET /stats, GET /stats/:country
│   │   └── services/
│   │       ├── rss/
│   │       │   └── feed-fetcher.ts    # RSS ingestion
│   │       ├── nlp/
│   │       │   └── event-extractor.ts # NLP pipeline
│   │       ├── geocoding/
│   │       │   └── nominatim.ts       # OSM geocoding
│   │       ├── verification/
│   │       │   └── confidence.ts      # Confidence scoring
│   │       ├── infrastructure/
│   │       │   └── osm-seeder.ts      # OSM Overpass seeder
│   │       └── workers/
│   │           ├── pipeline.ts        # Main processing pipeline
│   │           └── scheduler.ts       # 10-min cron trigger
│   ├── scripts/
│   │   └── seed-infrastructure.ts
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── render.yaml
│
├── frontend/                   # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Main dashboard page
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   └── MapView.tsx             # Leaflet map
│   │   │   ├── timeline/
│   │   │   │   └── TimelineSlider.tsx      # Dual-handle slider
│   │   │   └── dashboard/
│   │   │       ├── FilterPanel.tsx          # Country/type/confidence filters
│   │   │       ├── EventDetailsPanel.tsx    # Event detail sidebar
│   │   │       ├── InfrastructureLayerToggle.tsx
│   │   │       ├── ConflictStatsPanel.tsx   # Chart.js dashboards
│   │   │       └── LiveEventFeed.tsx        # Live event list
│   │   ├── lib/
│   │   │   ├── api.ts          # Typed API client
│   │   │   └── hooks.ts        # SWR data hooks
│   │   ├── types/
│   │   │   └── index.ts        # All TypeScript types
│   │   └── styles/
│   │       └── globals.css     # Tailwind + Leaflet overrides
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml          # Full local stack
├── vercel.json                 # Vercel deployment
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Node.js](https://nodejs.org) >= 20
- [PostgreSQL](https://postgresql.org) >= 14 (or Docker)

### 1. Clone & Setup

```bash
git clone https://github.com/yourname/conflictscope.git
cd conflictscope
```

### 2. Start Database

Using Docker:

```bash
docker run -d \
  --name conflictscope-db \
  -e POSTGRES_DB=conflictscope \
  -e POSTGRES_PASSWORD=conflictscope_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env
# Edit .env and set DATABASE_URL

# Install dependencies
bun install

# Run database migrations
bun run db:push

# (Optional) Seed infrastructure data from OpenStreetMap
bun run seed:infrastructure

# Start the server
bun run dev
```

The API will be available at `http://localhost:3001`.

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env.local.example .env.local

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

### 5. Full Stack with Docker Compose

```bash
# From the project root
docker compose up --build
```

| Service      | URL                          |
| ------------ | ---------------------------- |
| Frontend     | http://localhost:3000        |
| Backend API  | http://localhost:3001        |
| Health Check | http://localhost:3001/health |

---

## API Reference

### Events

```
GET /api/v1/events
```

Query parameters:

| Param        | Type     | Description                           |
| ------------ | -------- | ------------------------------------- |
| `country`    | string   | Filter by country name                |
| `type`       | string   | Filter by event type                  |
| `confidence` | string   | `low`, `medium`, `high`               |
| `from`       | ISO date | Start of time range                   |
| `to`         | ISO date | End of time range                     |
| `limit`      | number   | Max results (default: 200, max: 1000) |
| `offset`     | number   | Pagination offset                     |

```
GET /api/v1/events/:id
```

Returns event with all corroborating sources.

### Infrastructure

```
GET /api/v1/infrastructure?type=airport&country=Ukraine
```

### Statistics

```
GET /api/v1/stats
GET /api/v1/stats/:country
```

---

## Deployment

### Frontend → Vercel (Free Tier)

1. Connect your repo to Vercel
2. Set root directory to `frontend`
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`
4. Deploy

### Backend → Render (Free Tier)

1. Connect your repo to Render
2. Create a new **Web Service** → select `backend/` directory
3. Set environment:
   - `DATABASE_URL` → your Neon/Supabase connection string
   - `FRONTEND_URL` → your Vercel URL
4. Deploy using the provided `render.yaml`

### Database → Neon or Supabase (Free Tier)

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)
2. Copy the connection string
3. Run migrations: `bun run db:push`

---

## Configuration

### Backend Environment Variables

| Variable              | Default       | Description                  |
| --------------------- | ------------- | ---------------------------- |
| `DATABASE_URL`        | required      | PostgreSQL connection string |
| `PORT`                | `3001`        | Server port                  |
| `NODE_ENV`            | `development` | Environment                  |
| `FEED_CHECK_INTERVAL` | `600000`      | Feed polling interval (ms)   |
| `NOMINATIM_BASE_URL`  | OSM URL       | Geocoding API base URL       |
| `FRONTEND_URL`        | `*`           | CORS allowed origin          |

### Frontend Environment Variables

| Variable              | Default                 | Description     |
| --------------------- | ----------------------- | --------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |

---

## NLP Pipeline Details

The pipeline processes each article through these stages:

```
1. Fetch RSS feeds (Reuters, BBC, Al Jazeera, GDELT)
       ↓
2. Strip HTML, normalize text
       ↓
3. War keyword matching (40+ keywords across 6 event types)
       ↓ (skip non-conflict articles)
4. compromise.js NER → extract Place names
       ↓
5. Country detection (known conflict region matching)
       ↓ (skip if no country found)
6. OSM Nominatim geocoding → lat/lon
       ↓ (skip if geocoding fails)
7. Confidence scoring (1 source=low, 2=medium, 3+=high)
       ↓
8. Store in PostgreSQL (deduplication by article URL)
```

---

## Confidence Scoring

| Sources                            | Score  | Meaning                  |
| ---------------------------------- | ------ | ------------------------ |
| 1 source (untrusted)               | Low    | Single unverified report |
| 1 source (trusted: Reuters/BBC/AJ) | Medium | Single trusted report    |
| 2 sources                          | Medium | Corroborated             |
| 3+ sources                         | High   | Multi-source verified    |

---

## Technology Stack

| Layer             | Technology                     |
| ----------------- | ------------------------------ |
| Backend Runtime   | Bun 1.1+                       |
| Backend Framework | Elysia.js                      |
| Database          | PostgreSQL 16                  |
| ORM               | Drizzle ORM                    |
| NLP               | compromise.js, natural         |
| Geocoding         | OpenStreetMap Nominatim (free) |
| Map Engine        | Leaflet.js                     |
| Map Tiles         | OpenStreetMap / CARTO Dark     |
| Heatmap           | Leaflet.heat plugin            |
| Clustering        | Leaflet.markercluster          |
| Frontend          | Next.js 14 (App Router)        |
| Styling           | TailwindCSS                    |
| Charts            | Chart.js + react-chartjs-2     |
| Data Fetching     | SWR                            |
| Deployment (API)  | Render (free tier)             |
| Deployment (Web)  | Vercel (free tier)             |
| Deployment (DB)   | Neon / Supabase (free tier)    |

---

## License

MIT — free to use, modify, and deploy for research and educational purposes.

> **Disclaimer:** ConflictScope relies on publicly available open-source intelligence. Data accuracy depends on source quality and NLP extraction. Always cross-reference with primary sources before drawing conclusions.
