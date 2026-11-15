import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lolia.mobile',
  appName: 'Lolia',
  webDir: 'build',
  // Matches --bg in the design tokens, so a cold start has no white flash.
  backgroundColor: '#161110',
  server: {
    // Reached from the emulator over `adb reverse tcp:5174 tcp:5174`.
    url: 'http://localhost:5174',
    cleartext: true
  },
  android: {
    // Opens the WebView devtools socket that chrome-devtools-mcp attaches to.
    webContentsDebuggingEnabled: true
  }
};

export default config;
