# AGENTS.md

## Key Commands

```bash
bun dev               # Start dev server (port 40287)
bun db:generate       # Generate Prisma client
bun db:seed           # Seed database
bun db:migrate        # Run database migrations
bun db:migrate:deploy # Deploy database migrations
bun test:unit         # Run unit tests (Vitest)
bun test:e2e          # Run e2e tests (Playwright)
bun lint              # Biome lint
bun check             # Biome check + lint
bun format:fix        # Format with Biome
bun types             # TypeScript check
```

## Critical Details

- **Port**: 40287 (not 3000)
- **Package manager**: Bun
- **ORM**: Prisma 7 - always run `db:generate` after schema changes
- **Linter**: Biome (not ESLint/Prettier) - 120 char line width, double quotes
- **Better Auth schema drift**: auth models (`User`, `Session`, `Account`, `Verification`, `TwoFactor`) are hand-written in `schema.prisma`. After bumping `better-auth`, run `bunx @better-auth/cli generate` and diff the output against `schema.prisma` — plugin schema changes (e.g. the 2FA lockout fields added in 1.6.x) otherwise only surface as `PrismaClientValidationError` at runtime.

## Required Order

1. `db:run` (migrate → generate → seed) before `dev` first time
2. `db:generate` after any `schema.prisma` change
3. `lint → types → test:unit` before committing

## Architecture

- NestJS 11 with modular structure (`src/modules/*`)
- Better Auth for OAuth (10 providers)
- BullMQ + Redis for background jobs
- External APIs: Tenrai (anime/manga), TMDB (TV/movies), IGDB (games), Hardcover (books)