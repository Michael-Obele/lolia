import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lolia.mobile',
  appName: 'Lolia',
  webDir: 'build',
  // Matches --bg in the design tokens, so a cold start has no white flash.
  backgroundColor: '#161110'
};

export default config;
