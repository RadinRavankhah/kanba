# PostgreSQL Support for Kanba

Kanba uses PostgreSQL as its database backend. Database access goes through a provider interface (`lib/db`), so other databases can be added later. This guide will help you set up and use PostgreSQL with Kanba.

## Quick Start

### Option 1: Using Docker (Recommended)

1. **Start PostgreSQL with Docker:**
   ```bash
   npm run postgres:start
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and set:
   ```env
   DATABASE_PROVIDER=postgresql
   DATABASE_URL=postgresql://postgres:password@localhost:5432/kanba_db
   ```

3. **Setup database:**
   ```bash
   npm run postgres:setup
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### Option 2: Local PostgreSQL Installation

1. **Install PostgreSQL:**
   - **macOS:** `brew install postgresql`
   - **Ubuntu/Debian:** `sudo apt install postgresql postgresql-contrib`
   - **Windows:** Download from [postgresql.org](https://www.postgresql.org/download/windows/)

2. **Create database:**
   ```bash
   createdb kanba_db
   ```

3. **Configure environment:**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and set:
   ```env
   DATABASE_PROVIDER=postgresql
   DATABASE_URL=postgresql://username:password@localhost:5432/kanba_db
   ```

4. **Setup database:**
   ```bash
   npm run postgres:setup
   ```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+ (or Docker)
- Git

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Prisma CLI:**
   ```bash
   npm install -g prisma
   ```

## Configuration

### Environment Variables

Copy `env.example` to `.env.local` and configure:

```env
# Database Configuration
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://username:password@localhost:5432/kanba_db
DIRECT_URL=postgresql://username:password@localhost:5432/kanba_db

# Auth
JWT_SECRET=your_jwt_secret
```

### Connection String Examples

```env
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/kanba_db

# Docker PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/kanba_db

# Railway PostgreSQL
DATABASE_URL=postgresql://username:password@host:port/database
```

## Database Setup

### Automatic Setup

Run the setup script:
```bash
npm run postgres:setup
```

This will:
- Generate Prisma client
- Push schema to database
- Run migrations
- Seed database (if available)

### Manual Setup

1. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

2. **Push schema to database:**
   ```bash
   npm run db:push
   ```

3. **Run migrations (if any):**
   ```bash
   npm run db:migrate
   ```

## Docker Commands

```bash
# Start PostgreSQL
npm run postgres:start

# Stop PostgreSQL
npm run postgres:stop

# Reset PostgreSQL (delete all data)
npm run postgres:reset

# View logs
docker-compose -f docker-compose.postgres.yml logs -f
```

## Development Tools

### Prisma Studio

View and edit your database through a web interface:
```bash
npm run db:studio
```

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create and run migration
npm run db:migrate

# Reset database
npm run db:push --force-reset
```

## Database Providers

Database access is defined by the `DataProvider` interface in `lib/db/store.ts`. The PostgreSQL provider lives in `lib/db/providers/postgres.ts` and is selected by `DATABASE_PROVIDER` in `lib/db/index.ts`.

To add another database:

1. Implement `DataProvider` under `lib/db/providers/`.
2. Register it in the `createProvider` switch in `lib/db/index.ts`.
3. Set `DATABASE_PROVIDER` to the new name.

## Database Schema

The PostgreSQL schema includes:

- **profiles** - User profiles and authentication
- **projects** - Kanban projects
- **columns** - Project columns
- **tasks** - Tasks within columns
- **project_members** - Team collaboration
- **task_comments** - Task comments
- **activity_logs** - Activity tracking
- **notifications** - User notifications
- **bookmarks** - User bookmarks
- **stripe_* tables** - Stripe integration

## Troubleshooting

### Common Issues

1. **"Cannot find module '@prisma/client'"**
   ```bash
   npm install
   npm run db:generate
   ```

2. **"Connection refused"**
   - Check if PostgreSQL is running
   - Verify connection string
   - Check firewall settings

3. **"Database does not exist"**
   ```bash
   createdb kanba_db
   ```

4. **"Permission denied"**
   - Check PostgreSQL user permissions
   - Verify connection string credentials

### Reset Database

```bash
# Using Docker
npm run postgres:reset

# Using local PostgreSQL
dropdb kanba_db
createdb kanba_db
npm run db:push
```

### View Database Logs

```bash
# Docker logs
docker-compose -f docker-compose.postgres.yml logs postgres

# PostgreSQL logs (local installation)
tail -f /var/log/postgresql/postgresql-*.log
```

## Production Deployment

### Railway

1. **Create Railway project**
2. **Add PostgreSQL service**
3. **Set environment variables:**
   ```env
   DATABASE_PROVIDER=postgresql
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

### Vercel

1. **Add PostgreSQL addon**
2. **Set environment variables in Vercel dashboard**
3. **Deploy with PostgreSQL connection**

### Self-hosted

1. **Install PostgreSQL on server**
2. **Create database and user**
3. **Set environment variables**
4. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Docker PostgreSQL](https://hub.docker.com/_/postgres)

## Contributing

When contributing to database support:

1. **Add new methods to the `DataProvider` interface**
2. **Implement them in every provider under `lib/db/providers/`**
3. **Update this documentation**

## License

This PostgreSQL support follows the same license as the main Kanba project. 