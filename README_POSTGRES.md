## Database Support

Kanba talks to the database through a small provider interface (`lib/db`). The active provider is chosen with `DATABASE_PROVIDER`; `postgresql` is the only provider implemented today.

### Configuration

```bash
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://username:password@localhost:5432/kanba_db
DIRECT_URL=postgresql://username:password@localhost:5432/kanba_db
```

### PostgreSQL Setup

1. **Start PostgreSQL:**
   ```bash
   npm run postgres:start  # Docker
   # or install PostgreSQL locally
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env.local
   # Set DATABASE_PROVIDER=postgresql and DATABASE_URL
   ```

3. **Setup database:**
   ```bash
   npm run postgres:setup
   ```

4. **Start development:**
   ```bash
   npm run dev
   ```

**Full PostgreSQL guide:** [POSTGRES_SETUP.md](./POSTGRES_SETUP.md)

### Switching Databases

All data access goes through the `DataProvider` interface in `lib/db/store.ts`. To add another database:

1. Create a new provider under `lib/db/providers/` implementing `DataProvider`.
2. Register it in `lib/db/index.ts`.
3. Set `DATABASE_PROVIDER` to its name.

No page or component needs to change.

### Database Features

- **Provider interface** decouples features from the database
- **Server-only access** through `/api/data/[method]`, so credentials never reach the browser
- **Docker support** for easy local development
- **Prisma ORM** for PostgreSQL
- **Team collaboration** and **Stripe integration** supported

### Why PostgreSQL?

- **Local development** without external dependencies
- **Self-hosted deployments** with full control
- **Better performance** for complex queries
- **Advanced features** like full-text search
- **Cost-effective** for high-traffic applications
