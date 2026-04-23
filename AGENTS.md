# AGENTS.md

## Key Commands

```bash
bun dev          # Start dev server (port 40287)
bun db:run       # Migrate + generate Prisma client + seed
bun test:unit    # Run unit tests (Vitest)
bun test:e2e     # Run e2e tests (Playwright)
bun lint         # Biome lint
bun check        # Biome check + lint
bun format:fix   # Format with Biome
bun types        # TypeScript check
```

## Critical Details

- **Port**: 40287 (not 3000)
- **Package manager**: Bun
- **ORM**: Prisma 7 - always run `prisma:generate` after schema changes
- **Linter**: Biome (not ESLint/Prettier) - 120 char line width, double quotes

## Required Order

1. `db:run` (migrate → generate → seed) before `dev` first time
2. `prisma:generate` after any `schema.prisma` change
3. `lint → types → test:unit` before committing

## Architecture

- NestJS 11 with modular structure (`src/modules/*`)
- Better Auth for OAuth (10 providers)
- BullMQ + Redis for background jobs
- External APIs: Jikan (anime/manga), TMDB (TV/movies), IGDB (games), Hardcover (books)