# Local API Routes Deployment Guide

## Overview
This application uses local Next.js API routes for Stripe integration. This makes deployment simpler and allows you to use standard .env files for configuration.

## Environment Variables Setup

### 1. Create .env.local file
Copy `.env.example` to `.env.local` and fill in your actual values:

```bash
cp .env.example .env.local
```

### 2. Required Environment Variables

#### Database Configuration
- `DATABASE_PROVIDER` - Active data provider (`postgresql`)
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct PostgreSQL connection string (for migrations)
- `JWT_SECRET` - Secret used to sign auth tokens

#### Stripe Configuration
- `STRIPE_SECRET_KEY` - Your Stripe secret key (server-side only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

#### Site Configuration
- `NEXT_PUBLIC_SITE_URL` - Your site URL (for production)
- `NEXTAUTH_URL` - Your site URL (same as above)
- `NEXTAUTH_SECRET` - A random secret for NextAuth

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables in `.env.local`

3. Run the development server:
```bash
npm run dev
```

4. Test Stripe webhooks locally using Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

## Production Deployment

### Netlify Deployment

1. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`

2. **Environment Variables:**
   Add all the environment variables from your `.env.local` file to Netlify's environment variables section.

3. **Stripe Webhook Setup:**
   - Create a webhook endpoint in your Stripe dashboard
   - Point it to: `https://your-domain.netlify.app/api/stripe/webhook`
   - Select the following events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### Vercel Deployment

1. **Deploy to Vercel:**
```bash
npx vercel
```

2. **Environment Variables:**
   Add all environment variables through Vercel dashboard or CLI

3. **Stripe Webhook Setup:**
   - Point webhook to: `https://your-domain.vercel.app/api/stripe/webhook`

## API Endpoints

The application now uses these local API routes:

- `POST /api/stripe/checkout` - Creates Stripe checkout sessions
- `POST /api/stripe/webhook` - Handles Stripe webhook events

## Benefits of Local API Routes

1. **Simpler Deployment** - No need to deploy separate edge functions
2. **Environment Variables** - Standard .env file support
3. **Better Debugging** - Easier to debug locally
4. **Framework Integration** - Better integration with Next.js
5. **No Vendor Lock-in** - Can deploy to any platform that supports Next.js

## Troubleshooting

1. **Webhook Issues:**
   - Ensure `STRIPE_WEBHOOK_SECRET` matches your Stripe webhook endpoint
   - Check webhook logs in Stripe dashboard
   - Verify webhook URL is correct

2. **Environment Variables:**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify PostgreSQL credentials and connection string

3. **CORS Issues:**
   - API routes include proper CORS headers
   - Ensure your domain is whitelisted if needed

## Security Notes

- Never expose `STRIPE_SECRET_KEY`, `DATABASE_URL`, or `JWT_SECRET` to the client
- Use `NEXT_PUBLIC_` prefix only for client-side variables
- Regularly rotate your webhook secrets
- Monitor webhook delivery in Stripe dashboard