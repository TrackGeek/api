<p align="center">
  <img src="https://github.com/TrackGeek.png" height="100px">
</p>

<h1 align="center">
  <samp>Api</samp>
</h1>

<h4 align="center">
  <samp>API for a unified media tracking platform, with progress, statistics, and social authentication.</samp>
</h4>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-000000?style=for-the-badge&logo=nestjs&logoColor=E0234E">
  <img src="https://img.shields.io/badge/TypeScript-000000?style=for-the-badge&logo=typescript&logoColor=3178C6">
  <img src="https://img.shields.io/badge/Prisma-000000?style=for-the-badge&logo=prisma&logoColor=ffffff">
  <img src="https://img.shields.io/badge/PostgreSQL-000000?style=for-the-badge&logo=postgresql&logoColor=4169E1">
  <img src="https://img.shields.io/badge/Redis-000000?style=for-the-badge&logo=redis&logoColor=DC382D">
  <br>
  <img src="https://img.shields.io/badge/Docker-000000?style=for-the-badge&logo=docker&logoColor=2496ED">
  <img src="https://img.shields.io/badge/Swagger-000000?style=for-the-badge&logo=swagger&logoColor=85EA2D">
  <img src="https://img.shields.io/badge/License%20GPL%203.0-000000?style=for-the-badge&logo=gnu&logoColor=ffffff">
  <a href="https://crowdin.com/project/trackgeek"><img src="https://img.shields.io/badge/Crowdin-000000?style=for-the-badge&logo=crowdin&logoColor=ffffff"></a>
</p>

## <samp>Features</samp>

<samp>

- RESTful API with Swagger/OpenAPI documentation;
- Track games, anime, movies, TV shows, books, and manga with advanced progress system;
- Custom lists management;
- User profiles with customization (avatars, banners, colors, timezone);
- Social features (followers/following system);
- Comments and reactions system;
- Feed events for activity tracking;
- Favorites system;
- Authentication with social providers (Google, GitHub, Discord, etc);
- File upload system;
- Email notifications with Resend;
- Background job processing with BullMQ;
- Redis caching for performance optimization;
- Full validation and error handling;
- Integration with external media APIs.

</samp>

## <samp>Tech Stack</samp>

<samp>

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Better Auth
- JWT
- Swagger/OpenAPI
- Resend
- Biome
- Jest

</samp>

## <samp>Run Locally</samp>

<samp>

Clone the project

```bash
git clone https://github.com/TrackGeek/api.git
```

Fill the .env with the variables from .env.example

```bash
cp .env.example .env
```

Go to the project directory

```bash
cd api
```

Install dependencies

```bash
npm install
```

Start containers

```bash
docker compose up -d
```

Run database commands

```bash
npm run prisma:migrate
npm run prisma:generate
```

Start the server

```bash
npm run dev
```

</samp>

## <samp>Contributing</samp>

<samp>

Contributions are always welcome!

See `CONTRIBUTING.md` for ways to get started.

Please adhere to this project's `code of conduct`.

</samp>

