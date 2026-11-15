import { describe, expect, test } from "bun:test";

// `cap sync` copies `capacitor.config.ts` into the Android project verbatim, and
// Capacitor honours `server.url` in every build type — not just debug. A config
// that carries it therefore ships an app that opens a blank page looking for a
// dev server on the device, which is exactly what v0.1.7 did.
//
// What ships is the config with `CAP_LIVE_RELOAD` unset, so that is the state
// worth asserting. The release job checks the generated JSON as well, but this
// runs earlier and fails the branch instead of a tag.
const releaseConfig = async () => {
  delete process.env.CAP_LIVE_RELOAD;
  const module = await import("../capacitor.config.ts");
  return module.default;
};

describe("the Capacitor config that ships", () => {
  test("carries no dev server to look for", async () => {
    // Without this, the WebView loads http://localhost:5174 instead of the
    // bundled build and the release is a blank screen on a real phone.
    expect((await releaseConfig()).server).toBeUndefined();
  });

  test("leaves the WebView devtools socket closed", async () => {
    // A remote debugger reachable on a released app is debug surface nobody asked for.
    expect(
      (await releaseConfig()).android?.webContentsDebuggingEnabled,
    ).toBeUndefined();
  });

  test("still describes the shell it packages", async () => {
    // The dev-only settings must not take the real ones with them when removed.
    const config = await releaseConfig();
    expect(config.appId).toBe("app.lolia.mobile");
    expect(config.webDir).toBe("build");
  });
});
