# api

```bash
# copy .env
cp .env.example .env

# install deps
npm install

# start postgres database
docker compose up -d

# run migrations
npx prisma migrate dev

# generate prisma files
npx prisma generate

# start api
npm run dev
```