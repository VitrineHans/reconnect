import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme/tokens';

// This screen is immediately replaced by the auth guard in _layout.tsx.
// It exists only to give Expo Router a valid root route to render
// while session + profile state resolves.
export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={colors.ember} />
    </View>
  );
}
