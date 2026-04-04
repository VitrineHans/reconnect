# External Integrations

## External APIs and Services

### Supabase
- **Purpose**: Backend-as-a-Service for authentication, database, real-time subscriptions, and object storage
- **Integration Location**: 
  - Client initialization: `/Users/hanswagener/reconnect/mobile/lib/supabase.ts`
  - Usage hook: `/Users/hanswagener/reconnect/mobile/hooks/useSession.ts`
  - Auth state management: `/Users/hanswagener/reconnect/mobile/app/_layout.tsx`
- **Features Used**:
  - Authentication (email/password, session management)
  - Real-time subscriptions via `onAuthStateChange`
  - PostgreSQL database queries
  - Session persistence via AsyncStorage
  - Signed URLs for video storage (configured in schema)

### Expo Services
- **Expo Push Notifications** (planned, per CLAUDE.md)
  - For streak reminders and friend activity notifications
  - Configuration: Not yet implemented in current codebase
- **Expo Camera** (`expo-camera` ~17.0.10)
  - Video recording for question responses
  - Configuration: Listed in `app.json` plugins
- **Expo Router** (`expo-router` ~6.0.23)
  - File-based routing for navigation
  - Auth guard routing: `app/_layout.tsx`

## Databases and Auth Providers

### PostgreSQL Database (via Supabase)
**Connection Details** (local development via `/Users/hanswagener/reconnect/supabase/config.toml`):
- Port: 54322
- Shadow database port: 54320 (for migrations)
- Version: PostgreSQL 17
- Max rows per query: 1000
- Max file size in storage: 50 MiB

**Schema** (`/Users/hanswagener/reconnect/supabase/migrations/20260404000000_init.sql`):

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase built-in auth table (extended by profiles) |
| `public.profiles` | User profiles (extends `auth.users`) |
| `public.questions` | Question bank with categories (funny, deep, personal) |
| `public.friendships` | Friend relationships with streak tracking |
| `public.friend_invites` | Pending/accepted/declined friend requests |
| `public.question_responses` | Video answers to questions (ephemeral) |
| `public.question_ratings` | User question preferences (like/dislike) |

**Row-Level Security (RLS)**: Enabled on all tables
- Users can view any profile but only update own
- Users can only access friendships they're part of
- Users can only see invites they're involved in
- Users can only access question responses for friendships they're in
- Users manage only their own question ratings

### Authentication Provider
- **Supabase Auth** (via `@supabase/supabase-js` ^2.101.1)
- JWT token-based authentication
- Token expiry: 3600 seconds (1 hour) configurable in `supabase/config.toml`
- Refresh token rotation: Enabled
- Refresh token reuse interval: 10 seconds
- Email confirmation: Disabled (allow login without email verification)
- Signup: Enabled
- Anonymous sign-ins: Disabled

**Local Auth Configuration** (`supabase/config.toml` [auth] section):
```
site_url = "http://127.0.0.1:3000"
jwt_expiry = 3600
enable_refresh_token_rotation = true
enable_signup = true
enable_anonymous_sign_ins = false
```

## Environment Variables

### Client-Side Variables (React Native)
Required in `/Users/hanswagener/reconnect/mobile/.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note**: `EXPO_PUBLIC_` prefix required for environment variables to be exposed to frontend

### Backend Configuration Variables (Supabase)
Referenced in `/Users/hanswagener/reconnect/supabase/config.toml`:

| Variable | Purpose | Usage |
|----------|---------|-------|
| `OPENAI_API_KEY` | Supabase AI features in Studio | Studio AI assistant (not implemented in app) |
| `S3_HOST` | S3 bucket URL for OrioleDB storage | Experimental database storage (optional) |
| `S3_REGION` | AWS region for S3 | Experimental (optional) |
| `S3_ACCESS_KEY` | AWS access key | Experimental (optional) |
| `S3_SECRET_KEY` | AWS secret key | Experimental (optional) |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | Twilio SMS integration | SMS auth (disabled by default) |

## Storage Services

### Supabase Storage
- **Purpose**: Object storage for ephemeral video files
- **Configuration** (`supabase/config.toml`):
  - File size limit: 50 MiB
  - Location: `/Users/hanswagener/reconnect/supabase/config.toml` [storage] section
  - Image transformation API: Available (Supabase Pro plan required)
- **Usage Pattern** (from schema):
  - `question_responses.video_url` stores video references
  - Videos accessed via signed URLs (auto-expire after watch)
  - Auto-delete policy enforced after `watched_at` timestamp

### Local Development Storage
- **Inbucket** (email testing server)
  - Port: 54324
  - Purpose: Test emails without actual SMTP
  - Disabled for SMS (not configured)

## Real-Time Features (Supabase Realtime)

**Configuration** (`supabase/config.toml` [realtime] section):
- Enabled: true
- Request policy: `per_worker` (hot reload enabled during dev)
- Chrome inspector port: 8083

**Intended Usage**:
- Friend status updates
- New questions available
- Question responses received
- Streak notifications

## Analytics (Optional)

**Supabase Analytics** (`supabase/config.toml` [analytics] section):
- Enabled: true
- Port: 54327
- Backend: PostgreSQL
- Note: Not integrated into app frontend yet

## Edge Functions (Planned)

**Deno Runtime** (`supabase/config.toml` [edge_runtime] section):
- Enabled: true
- Deno version: 2
- Inspector port: 8083
- Policy: `per_worker` (hot reload)
- Potential use cases:
  - Server-side video processing
  - Streak calculation/notification logic
  - Question recommendation algorithm

## Local Development Services

All services run on localhost via Supabase CLI:

| Service | Port | Purpose |
|---------|------|---------|
| Supabase REST API | 54321 | Database/auth API |
| PostgreSQL | 54322 | Database |
| Supabase Studio | 54323 | Web UI for management |
| Inbucket | 54324 | Email testing |
| Analytics | 54327 | Analytics backend |
| Realtime | (auto) | WebSocket for real-time |
| Edge Functions | 8083 | Inspector/debug |

## Third-Party Providers (Not Yet Integrated)

From `supabase/config.toml`, the following are available but disabled:

- **OAuth Providers**: Apple, Azure, Bitbucket, Discord, Facebook, GitHub, GitLab, Google, Keycloak, LinkedIn, Notion, Twitch, Twitter, Slack, Spotify, WorkOS, Zoom
- **Web3**: Solana wallet sign-in (SIWS/EIP-4361)
- **Third-Party Auth**: Firebase, Auth0, AWS Cognito, Clerk
- **SMS Providers**: Twilio (default), Twilio Verify, MessageBird, TextLocal, Vonage
- **CAPTCHA**: hCaptcha, Turnstile (for bot protection)
- **MFA**: TOTP (app authenticator), Phone, WebAuthn (all disabled by default)

## Data Flow

1. **Authentication**: User logs in → Supabase Auth → JWT token → AsyncStorage
2. **Database Queries**: App → Supabase REST API → PostgreSQL → RLS enforcement
3. **Real-time Updates**: WebSocket connection → Realtime subscriptions
4. **Video Upload**: App → Expo Camera → Supabase Storage → Signed URL
5. **Video Deletion**: After watch → Database trigger (or scheduled job via Edge Functions)
