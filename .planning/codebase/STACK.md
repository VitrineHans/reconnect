# Tech Stack

## Languages and Runtimes

- **TypeScript** (v5.9.2) — primary language for type safety
- **JavaScript** — runtime through Node.js and React Native
- **React Native** (0.81.5) — cross-platform mobile runtime
- **SQL** (PostgreSQL 17) — database queries and migrations

## Frameworks and Libraries

### Mobile Frontend
Located in `/Users/hanswagener/reconnect/mobile/package.json`

**Core Framework:**
- `react` (19.1.0) — UI library
- `react-native` (0.81.5) — cross-platform mobile framework
- `expo` (~54.0.33) — managed development environment for React Native

**Routing & Navigation:**
- `expo-router` (~6.0.23) — file-based routing for Expo apps

**Mobile-Specific Features:**
- `expo-camera` (~17.0.10) — camera access for video recording
- `expo-av` (~16.0.8) — audio/video playback
- `expo-status-bar` (~3.0.9) — status bar styling

**Storage & Authentication:**
- `@supabase/supabase-js` (^2.101.1) — Supabase SDK for auth and database
- `@react-native-async-storage/async-storage` (2.2.0) — persistent local storage
- `react-native-url-polyfill` (^3.0.0) — URL API polyfill for React Native

### Backend & Database
- **Supabase** — managed PostgreSQL database, authentication, real-time subscriptions, storage
- **PostgreSQL** (v17) — relational database for all data models
- **Deno** (v2) — JavaScript runtime for edge functions

## Build Tools and Configuration

### Expo Configuration
- `app.json` at `/Users/hanswagener/reconnect/mobile/app.json` — Expo app configuration
- Plugins: `expo-router`, `expo-camera`
- Platforms: iOS, Android, Web (via Expo)
- React 19 New Architecture enabled (`newArchEnabled: true`)

### TypeScript Configuration
- Base: `expo/tsconfig.base` at `/Users/hanswagener/reconnect/mobile/tsconfig.json`
- Strict mode enabled

### Database Configuration
- **Supabase CLI** — local development environment
- Config: `/Users/hanswagener/reconnect/supabase/config.toml`
- Database Port: 54322 (local)
- API Port: 54321 (local)
- Studio Port: 54323 (local)
- Deno Version: 2 (for edge functions)
- PostgreSQL Major Version: 17

### Database Migrations
- Migration location: `/Users/hanswagener/reconnect/supabase/migrations/`
- Initial schema: `20260404000000_init.sql`

## Dev Dependencies

From `/Users/hanswagener/reconnect/mobile/package.json`:

- `@types/react` (~19.1.0) — React type definitions
- `typescript` (~5.9.2) — TypeScript compiler

## Project Structure

```
/Users/hanswagener/reconnect/
├── mobile/                      # React Native Expo app
│   ├── app/                     # Expo Router file-based routes
│   │   ├── (auth)/             # Authentication group
│   │   ├── (tabs)/             # Main app group with bottom tabs
│   │   └── _layout.tsx         # Root layout with session management
│   ├── components/             # Reusable React Native components
│   ├── hooks/                  # Custom React hooks (useSession)
│   ├── lib/                    # Utilities (supabase client)
│   ├── constants/              # App constants
│   ├── assets/                 # Images, fonts, icons
│   ├── package.json            # Dependencies
│   ├── app.json                # Expo configuration
│   └── tsconfig.json           # TypeScript configuration
└── supabase/                   # Backend & database
    ├── config.toml             # Supabase CLI configuration
    └── migrations/             # Database schema migrations
```

## Configuration Files

| File | Purpose |
|------|---------|
| `mobile/package.json` | Node.js dependencies and scripts |
| `mobile/app.json` | Expo app metadata and native configuration |
| `mobile/tsconfig.json` | TypeScript compiler options |
| `mobile/.env.example` | Environment variable template |
| `supabase/config.toml` | Supabase local dev environment configuration |

## Entry Points

- **Mobile App**: `mobile/index.ts` (Expo entry point)
- **Root Component**: `mobile/App.tsx` (legacy) / `mobile/app/_layout.tsx` (current with Router)
- **Database**: PostgreSQL at localhost:54322 (local dev)
- **API**: Supabase REST API at localhost:54321 (local dev)
