# Deferred Features

The following features were deferred from the Week 2 auth migration (Supabase Auth → custom JWT auth):

## OAuth (Google / GitHub)

Dropped for the MVP. Email/password authentication only. OAuth providers can be added later by implementing OAuth redirect handlers and callback routes.

## Email Verification

Not implemented in MVP. Users can log in immediately after registration without verifying their email address.

## Password Reset / Forgot Password

Not implemented in MVP. There is no flow to reset a forgotten password. Users would need database-level intervention to regain access.

## Refresh Token Rotation

JWTs are stored in localStorage with a 7-day expiry. No refresh token rotation is implemented. After expiry, users must log in again.

## HTTP-Only Cookie Storage

JWTs are stored in localStorage rather than HTTP-only cookies for simplicity. This carries XSS risk; consider migrating to cookies + middleware in the future.
