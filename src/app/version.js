import packageJson from '../../package.json';

// package.json is the release source of truth. Vite inlines this value into
// the standalone app and the plugin build copies the same package version.
export const APP_VERSION = packageJson.version;
