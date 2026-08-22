<p align="center">
  <img src="https://github.com/TrackGeek.png" height="100px">
</p>

<h1 align="center">
  <samp>Api</samp>
</h1>

<h4 align="center">
  <samp>API for a unified media tracking platform, with progress, reviews, statistics, and social features.</samp>
</h4>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-99e3a0?style=for-the-badge&logo=nestjs&logoColor=004b38">
  <img src="https://img.shields.io/badge/TypeScript-99e3a0?style=for-the-badge&logo=typescript&logoColor=004b38">
  <img src="https://img.shields.io/badge/Prisma-99e3a0?style=for-the-badge&logo=prisma&logoColor=004b38">
  <img src="https://img.shields.io/badge/PostgreSQL-99e3a0?style=for-the-badge&logo=postgresql&logoColor=004b38">
  <img src="https://img.shields.io/badge/Redis-99e3a0?style=for-the-badge&logo=redis&logoColor=004b38">
  <br>
  <img src="https://img.shields.io/badge/BullMQ-99e3a0?style=for-the-badge&logo=bull&logoColor=004b38">
  <img src="https://img.shields.io/badge/Docker-99e3a0?style=for-the-badge&logo=docker&logoColor=004b38">
  <img src="https://img.shields.io/badge/Swagger-99e3a0?style=for-the-badge&logo=swagger&logoColor=004b38">
  <img src="https://img.shields.io/badge/Stripe-99e3a0?style=for-the-badge&logo=stripe&logoColor=004b38">
  <a href="https://translate.trackgeek.net"><img src="https://img.shields.io/badge/Crowdin-99e3a0?style=for-the-badge&logo=crowdin&logoColor=004b38"></a>
</p>

## <samp>About</samp>

<samp>

TrackGeek API is a NestJS-based backend that powers a unified media tracking platform. Users can track their progress across six different media types — **Anime**, **Manga**, **TV Shows**, **Movies**, **Games**, and **Books** — while interacting with a social community through reviews, comments, reactions, and activity feeds.

The API integrates with external media databases (Tenrai, TMDB, IGDB, Hardcover) to provide rich metadata and uses background job processing for async tasks like email delivery and feed event aggregation.

</samp>

## <samp>Features</samp>

<samp>

**Media Tracking**
- Track progress across 6 media types: Anime, Manga, TV Shows, Movies, Games, and Books;
- Episode-level tracking for Anime and TV Shows (per season/episode);
- Progress statuses: Watching, Playing, Reading, Completed, Paused, Dropped, Planning;
- Detailed review system with media-specific rating criteria (e.g., animation/sound for anime, gameplay/graphics for games);
- Screenshot uploads for game reviews.

**Social Features**
- Follow/unfollow users;
- Comments on media and user profiles;
- Emoji reactions on comments and feed events;
- Activity feed with event aggregation (new follows, favorites, reviews, progress updates);
- Custom lists for organizing media collections;
- Favorites system.

**User Management**
- OAuth authentication with 10 social providers (Google, GitHub, Discord, Twitch, Kick, Twitter, Slack, Microsoft, Notion, Spotify);
- Magic link and password-based authentication;
- Customizable profiles (avatar, banner, color, bio, language, timezone);
- Medal/achievement system;
- Tiered subscription plans (Tracker, Archivist, ArchiveMaster).

**Payments**
- Stripe integration for subscriptions and one-time payments;
- Webhook handling for payment lifecycle events;
- Transactional email notifications for payment success, failure, and cancellation.

**Infrastructure**
- Background job processing with BullMQ (email delivery, feed event aggregation);
- Redis caching for performance optimization;
- Rate limiting with configurable read/write throttlers;
- Internationalization (i18n) support;
- File uploads via ImgBB integration;
- Swagger/OpenAPI documentation with Scalar API Reference.

</samp>

## <samp>Tech Stack</samp>

<samp>

| Category         | Technology                                    |
|------------------|-----------------------------------------------|
| Framework        | NestJS 11                                     |
| Language         | TypeScript 5.7                                |
| ORM              | Prisma 7                                      |
| Database         | PostgreSQL 18                                 |
| Cache / Queue    | Redis 6, BullMQ                               |
| Authentication   | Better Auth (OAuth2, Magic Link, Credentials) |
| Payments         | Stripe                                        |
| Email            | Resend + Handlebars templates                 |
| API Docs         | Swagger/OpenAPI + Scalar                      |
| Linting          | Biome                                         |
| Testing          | Vitest (unit), Playwright (e2e), k6 (load)    |
| Containerization | Docker Compose                                |

</samp>

## <samp>External Integrations</samp>

<samp>

| Service                            | Purpose                      |
|------------------------------------|------------------------------|
| [Anilist](https://anilist.co)      | Manga metadata               |
| [Tenrai](https://tenrai.org)       | Anime metadata (MyAnimeList) |
| [TMDB](https://www.themoviedb.org) | TV Shows and Movies metadata |
| [IGDB](https://www.igdb.com)       | Video Games metadata         |
| [Hardcover](https://hardcover.app) | Books metadata               |
| [ImgBB](https://imgbb.com)         | Image hosting for uploads    |
| [Stripe](https://stripe.com)       | Payment processing           |
| [Resend](https://resend.com)       | Transactional email delivery |

</samp>

## <samp>Project Structure</samp>

<samp>

```
src/
├── main.ts                          # Application bootstrap
├── app.module.ts                    # Root module
├── modules/
│   ├── admin/                       # Admin operations
│   ├── anime/                       # Anime tracking, reviews, episodes
│   ├── auth/                        # Authentication (Better Auth)
│   ├── book/                        # Book tracking and reviews
│   ├── comment/                     # Comments system
│   ├── favorite/                    # Favorites management
│   ├── feed-event/                  # Activity feed and aggregation
│   ├── game/                        # Game tracking, reviews, screenshots
│   ├── list/                        # Custom lists
│   ├── manga/                       # Manga tracking and reviews
│   ├── movie/                       # Movie tracking and reviews
│   ├── payment/                     # Stripe payments and webhooks
│   ├── profile/                     # User profile customization
│   ├── reaction/                    # Emoji reactions
│   ├── tv-show/                     # TV Show tracking, reviews, episodes
│   └── user/                        # User management
└── shared/
    ├── constants/                   # Queue and job name constants
    ├── decorators/                  # Custom decorators
    ├── exceptions/                  # Custom exceptions
    ├── filters/                     # HTTP exception filter
    ├── guards/                      # Throttler guard
    ├── interceptors/                # Metrics interceptor
    ├── utils/                       # Utility functions
    ├── validators/                  # Custom validators
    └── infra/
        ├── cache/                   # Redis cache module
        ├── cron/                    # Scheduled tasks
        ├── database/                # Prisma database service
        ├── docs/                    # Swagger/Scalar setup
        ├── email/                   # Resend email service + templates
        ├── health/                  # Health check endpoints
        ├── i18n/                    # Internationalization
        ├── integrations/            # External API clients (Tenrai, TMDB, IGDB, Hardcover)
        ├── queue/                   # BullMQ queue setup and processors
        └── upload/                  # File upload service (ImgBB)
```

</samp>

## <samp>Run Locally</samp>

<samp>

**Prerequisites:** Bun, Docker, and Docker Compose.

Clone the project

```bash
git clone https://github.com/TrackGeek/api.git
```

Go to the project directory

```bash
cd api
```

Copy the environment file and fill in the required variables

```bash
cp .env.example .env
```

Install dependencies

```bash
bun install
```

Start PostgreSQL and Redis containers

```bash
docker compose up -d
```

Run database migrations, generate the Prisma client, and seed data

```bash
bun db:migrate
bun db:generate
bun db:seed
```

Start the development server

```bash
bun dev
```

The API will be available at `http://localhost:40287` with documentation at `http://localhost:40287/docs`.

</samp>

## <samp>Testing Stripe Webhooks</samp>

<samp>

To test Stripe locally you need the [Stripe CLI](https://docs.stripe.com/stripe-cli) installed.

With the development server running, use the `listen` command to forward Stripe events to the local webhook endpoint:

```bash
bun stripe:webhook
# equivalent to: stripe listen --forward-to localhost:40287/stripe/webhook
```

The CLI prints a webhook signing secret (`whsec_...`) — set it as `STRIPE_WEBHOOK_SECRET` in your `.env`.

This is only for local development. In production, configure the webhook endpoint through the [Stripe Dashboard](https://dashboard.stripe.com/webhooks).

</samp>

## <samp>Scripts</samp>

<samp>

| Script                | Description                                  |
|-----------------------|----------------------------------------------|
| `bun dev`             | Start development server with hot reload     |
| `bun run build`       | Build for production                         |
| `bun start`           | Start production server                      |
| `bun db:migrate`      | Run database migrations                      |
| `bun db:generate`     | Generate Prisma client                       |
| `bun db:seed`         | Seed the database                            |
| `bun stripe:webhook`  | Forward Stripe events to the local webhook   |
| `bun test:unit`       | Run unit tests (Vitest)                      |
| `bun test:unit:watch` | Run unit tests in watch mode                 |
| `bun test:unit:ui`    | Run unit tests with the Vitest UI            |
| `bun test:unit:cov`   | Run unit tests with coverage                 |
| `bun test:e2e`        | Run end-to-end tests (Playwright)            |
| `bun test:e2e:ui`     | Run end-to-end tests with the Playwright UI  |
| `bun test:e2e:debug`  | Run end-to-end tests in debug mode           |
| `bun test:load`       | Run load tests (k6)                          |
| `bun lint`            | Run Biome linter                             |
| `bun lint:fix`        | Run Biome linter and apply fixes             |
| `bun check`           | Run Biome checks                             |
| `bun check:fix`       | Run Biome checks and apply fixes             |
| `bun format`          | Check formatting with Biome                  |
| `bun format:fix`      | Format code with Biome                       |
| `bun types`           | Type check with TypeScript                   |

</samp>

## <samp>Environment Variables</samp>

<samp>

| Variable                     | Description                                      |
|------------------------------|--------------------------------------------------|
| `PORT`                       | Server port (default: `40287`)                   |
| `NODE_ENV`                   | Runtime environment (`development`/`production`) |
| `DATABASE_URL`               | PostgreSQL connection string                     |
| `REDIS_URL`                  | Redis connection string                          |
| `BETTER_AUTH_URL`            | Auth base URL                                    |
| `BETTER_AUTH_SECRET`         | Auth secret key                                  |
| `BETTER_AUTH_LOG_LEVEL`      | Auth log level (default: `info`)                 |
| `WEB_URL`                    | Frontend URL for CORS                            |
| `GOOGLE_CLIENT_ID/SECRET`    | Google OAuth credentials                         |
| `DISCORD_CLIENT_ID/SECRET`   | Discord OAuth credentials                        |
| `GITHUB_CLIENT_ID/SECRET`    | GitHub OAuth credentials                         |
| `TWITCH_CLIENT_ID/SECRET`    | Twitch OAuth credentials                         |
| `KICK_CLIENT_ID/SECRET`      | Kick OAuth credentials                           |
| `TWITTER_CLIENT_ID/SECRET`   | Twitter OAuth credentials                        |
| `SLACK_CLIENT_ID/SECRET`     | Slack OAuth credentials                          |
| `MICROSOFT_CLIENT_ID/SECRET` | Microsoft OAuth credentials                      |
| `NOTION_CLIENT_ID/SECRET`    | Notion OAuth credentials                         |
| `SPOTIFY_CLIENT_ID/SECRET`   | Spotify OAuth credentials                        |
| `RESEND_API_KEY`             | Resend API key for emails                        |
| `RESEND_FROM`                | Sender email address                             |
| `STRIPE_SECRET_KEY`          | Stripe secret key for payments                   |
| `STRIPE_WEBHOOK_SECRET`      | Stripe webhook signing secret                    |
| `IMGBB_API_KEY`              | ImgBB API key for image uploads                  |
| `HARDCOVER_API_KEY`          | Hardcover API key for books                      |
| `TMDB_API_KEY`               | TMDB API key for movies/TV shows                 |
| `IGDB_CLIENT_ID/SECRET`      | IGDB credentials for games                       |

</samp>

## <samp>Contributing</samp>

<samp>

Contributions are always welcome!

See `CONTRIBUTING.md` for ways to get started.

Please adhere to this project's `code of conduct`.

</samp>

