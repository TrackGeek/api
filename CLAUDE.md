# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Use `bun`, never `npm`.

## Commands

- Dev server: `bun run dev` (NestJS watch, `NODE_ENV=development`). Docs served at `/docs` (Scalar) only in development.
- Build: `bun run build` — Start prod: `bun run start`.
- Typecheck: `bun run types` (`tsc --noEmit`).
- Lint/format: `bun run check` (Biome lint+format), `bun run check:fix` to autofix. `lint` / `format` variants exist too.
- Unit tests: `bun run test:unit` (Vitest). Watch: `test:unit:watch`. Coverage: `test:unit:cov`.
- Single test file: `bun run test:unit --  test/unit/xp/xp.service.spec.ts`. Single test: add `-t "name"`.
- E2E: `bun run test:e2e` (Playwright, in `test/e2e/`). Load: `bun run test:load` (k6).
- DB: `bun run db:generate` (Prisma client), `db:migrate` (dev migration), `db:migrate:deploy` (prod), `db:seed`.
- Stripe webhooks locally: `bun run stripe:webhook`.

## Conventions

- Commits/PRs: Angular convention. Regex-enforced types: `feat|fix|style|refactor|perf|test|workflow|ci|chore|types|wip`, optional `(scope)`, subject ≤72 chars. See `.github/COMMIT_CONVENTION.md`.
- Don't write comments. If tempted, rename the variable/function instead. Delete unnecessary comments you find. Only exception: comments needed to silence typecheck/lint errors.
- Biome config (`biome.json`): 2-space indent, 120 line width, double quotes. `noExplicitAny` and `noNonNullAssertion` are OFF; unused imports are a warning. `prisma/generated` is ignored.
- Path aliases: `@/*` → `src/*`, `@prisma/generated/*` → `prisma/generated/*` (mirrored in `tsconfig.json` and `vitest.config.ts`).

## Architecture

NestJS + Prisma (Postgres via `@prisma/adapter-pg`) + Redis/BullMQ. Bootstrap in `src/main.ts`.

- **Modules** (`src/modules/*`): one folder per domain (anime, book, game, manga, movie, tv-show, user, profile, activity, comment, reaction, notification, favorite, list, payment, xp, mission, coin, cosmetic, catchup, discord, person, company). Each has `controller/`, `service/`, `dto/`, `<name>.module.ts`. Media domains typically split into separate services/controllers per concern (e.g. `anime.service`, `anime-review.service`, `anime-progress.service`, `anime-episode-watch.service`). Register new modules in `src/app.module.ts`.
- **Shared infra** (`src/shared/infra/*`): `database` (`DatabaseService extends PrismaClient`, with `offsetPagination`/`cursorPagination` helpers), `cache` (Redis), `queue` (BullMQ queues + processors), `email` (Resend + Handlebars templates), `integrations` (external APIs), `upload`, `health`, `docs`. Many are `@Global()`.
- **Shared cross-cutting** (`src/shared/*`): `constants` (error codes, xp, mission, cache/queue keys), `guards`, `decorators`, `validators`, `filters`, `utils`, `media-filter`, `media-release`.

### External integrations (`src/shared/infra/integrations`)

`IntegrationsModule` is `@Global`. Services: `TMDBService` (movies/tv), `IGDBService` (games), `AnilistService` + `TenraiService` (anime/manga), `HardcoverService` (books), `IMGBBService` (image hosting), plus `IntegrationsService`. Media detail is fetched from these, cached, and persisted to Prisma; `refresh*` endpoints re-pull from the source.

### Auth

`better-auth` via `@thallesp/nestjs-better-auth`. Global auth guard is disabled — protect routes explicitly with `@UseGuards(AuthGuard)`. Session/user is on `request.session.user`. Role checks: `@Roles(...)` decorator + `RolesGuard` reading `session.user.role` (`UserRole` enum). Stripe drives `UserTier` / payments.

### Errors

Throw `AppException(ERROR_CODES.X)` (`src/shared/exceptions`, codes in `src/shared/constants/error-codes.ts`, each `{ code, status }`). Global `HttpExceptionFilter` (registered in `main.ts`) normalizes responses, maps Prisma errors (P2002/P2003 → conflict, P2025 → not found), and passes terminus health results through untouched.

### Async work

BullMQ queues (`ACTIVITY_QUEUE`, `NOTIFICATION_QUEUE`, `EMAIL_QUEUE`, `CATCHUP_QUEUE`, `XP_QUEUE`) enqueued via `QueueService`, handled by processors in `src/shared/infra/queue/processors`. Default job options: 4 attempts, 5-min fixed backoff. Side effects like XP, coins, missions, activity feed, notifications, and emails run through queues rather than inline.

### Validation & throttling

Global `ValidationPipe` (`whitelist`, `transform`, `422` on failure). DTOs use `class-validator`/`class-transformer` and `@nestjs/swagger` decorators. Global `HttpThrottlerGuard` with two named throttlers: `read` (500/min) and `write` (250/min).

## Testing

Unit tests in `test/unit/` (`*.spec.ts`), setup in `test/unit/setup.ts` silences the Nest `Logger`. Services are tested with mocked `DatabaseService`/dependencies. `test/http/trackgeek-api.http` is a manual request collection kept in sync with controllers (see the `http-test-syncer` agent). Do not test via curl/fetch/bash.
