# Conventions

## TypeScript

- Config: `mobile/tsconfig.json` extends `expo/tsconfig.base`
- Strict mode inherited from Expo base config
- Non-null assertions used in `mobile/lib/supabase.ts` for env vars (`process.env.EXPO_PUBLIC_SUPABASE_URL!`)
- `as const` used for tuple types in `mobile/constants/index.ts`
- No `any` types found in current codebase

## Component Style

- Functional components only (no class components)
- Default exports for screens (required by Expo Router)
- Named exports for hooks and utilities
- Inline `StyleSheet.create()` at bottom of screen files
- No shared theme or design tokens yet — each screen defines its own styles

## Current Style Patterns (from existing screens)

```tsx
// Screen pattern
import { View, Text, StyleSheet } from 'react-native';

export default function ScreenName() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Title</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: 'bold', marginTop: 60 },
});
```

## Hooks Pattern

```tsx
// Custom hook pattern (from useSession.ts)
import { useEffect, useState } from 'react';

export function useHookName() {
  const [state, setState] = useState<Type | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // setup + cleanup
    return () => cleanup();
  }, []);

  return { state, loading };
}
```

## File Naming

- Screens: lowercase (`home.tsx`, `login.tsx`)
- Hooks: camelCase (`useSession.ts`)
- Lib: camelCase (`supabase.ts`)
- Constants: camelCase (`index.ts`)
- No test files exist yet

## Imports

- React Native built-ins first
- Expo packages second
- Third-party (Supabase) third
- Local imports last
- No path aliases configured (uses relative paths)

## Error Handling

- Not yet established — placeholder screens have no async operations
- `useSession.ts` handles auth errors implicitly (session stays null)
- No global error boundary implemented yet

## Environment Variables

- Expo public vars prefixed `EXPO_PUBLIC_` (bundled into app)
- Accessed via `process.env.EXPO_PUBLIC_*`
- Template in `mobile/.env.example`
