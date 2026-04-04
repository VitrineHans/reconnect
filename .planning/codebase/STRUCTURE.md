# Structure

## Directory Layout

```
reconnect/
├── CLAUDE.md                          # Project instructions + decisions for Claude
├── skills-lock.json                   # Installed skills manifest
├── docs/
│   └── superpowers/specs/
│       └── 2026-04-04-reconnect-product-vision-design.md  # Full product spec
├── mobile/                            # Expo React Native app
│   ├── app.json                       # Expo app config (name, slug, icons, scheme)
│   ├── package.json                   # Dependencies
│   ├── tsconfig.json                  # TypeScript config (extends expo/tsconfig.base)
│   ├── index.ts                       # App entry point
│   ├── App.tsx                        # Root component
│   ├── .env.example                   # Required env vars template
│   ├── app/                           # Expo Router screens (file = route)
│   │   ├── _layout.tsx                # Root layout + auth guard
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx            # Auth stack layout
│   │   │   └── login.tsx              # Login screen (placeholder)
│   │   └── (tabs)/
│   │       ├── _layout.tsx            # Tab bar layout
│   │       ├── home.tsx               # Home screen (placeholder)
│   │       ├── friends.tsx            # Friends screen (placeholder)
│   │       └── profile.tsx            # Profile screen (placeholder)
│   ├── assets/                        # App icons and splash screen images
│   ├── components/                    # Shared UI components (empty — not yet built)
│   ├── constants/
│   │   └── index.ts                   # App-wide constants
│   ├── hooks/
│   │   └── useSession.ts              # Supabase auth session hook
│   └── lib/
│       └── supabase.ts                # Supabase client singleton
├── supabase/
│   ├── config.toml                    # Supabase local dev config
│   ├── migrations/
│   │   └── 20260404000000_init.sql    # Full DB schema (all 6 tables)
│   └── functions/                     # Edge functions (empty — none yet)
└── .claude/
    └── skills/                        # Installed Claude Code skills
        ├── frontend-design/
        └── browser-use/
```

## Key File Locations

| Purpose | Path |
|---|---|
| Supabase client | `mobile/lib/supabase.ts` |
| Auth session hook | `mobile/hooks/useSession.ts` |
| App constants | `mobile/constants/index.ts` |
| Auth guard / root nav | `mobile/app/_layout.tsx` |
| DB schema | `supabase/migrations/20260404000000_init.sql` |
| Product spec | `docs/superpowers/specs/2026-04-04-reconnect-product-vision-design.md` |

## Naming Conventions

- **Screens**: PascalCase component, kebab-case file (`home.tsx`, `login.tsx`)
- **Hooks**: camelCase prefixed with `use` (`useSession.ts`)
- **Lib files**: camelCase (`supabase.ts`)
- **Constants**: SCREAMING_SNAKE_CASE for values, PascalCase for types
- **Route groups**: parentheses notation per Expo Router convention (`(auth)`, `(tabs)`)

## Module Organisation

- No barrel files yet (`index.ts` exports not used in `components/` or `hooks/`)
- Direct imports from file paths
- Single Supabase client instance imported wherever needed
