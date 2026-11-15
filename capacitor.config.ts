import type { CapacitorConfig } from '@capacitor/cli';

// Live reload has to be asked for, not switched off. Capacitor honours
// `server.url` in EVERY build type — not only debug — so a config that carries it
// turns the installed app into a shell that looks for a dev server on the phone
// and renders nothing. v0.1.7 shipped exactly that. Opting in also fails safe in
// the right direction: forgetting to set this costs a dev session without live
// reload, while forgetting to clear it costs a release.
const liveReload = process.env.CAP_LIVE_RELOAD === '1';

const config: CapacitorConfig = {
  appId: 'app.lolia.mobile',
  appName: 'Lolia',
  webDir: 'build',
  // Matches --bg in the design tokens, so a cold start has no white flash.
  backgroundColor: '#161110',
  ...(liveReload
    ? {
        server: {
          // Reached from the emulator over `adb reverse tcp:5174 tcp:5174`.
          url: 'http://localhost:5174',
          cleartext: true
        },
        android: {
          // Opens the WebView devtools socket chrome-devtools-mcp attaches to.
          webContentsDebuggingEnabled: true
        }
      }
    : {})
};

export default config;
