// Mock AsyncStorage globally (native module is null under Jest), then
// initialise i18next so components using useTranslation() resolve real
// strings (default language: English).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// require (not import) so it runs after the mock above is registered.
require('./lib/i18n');
