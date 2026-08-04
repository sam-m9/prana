# PRANA — project notes for Claude

Static PWA: all app logic lives inline in `index.html`, `sw.js` is the offline
service worker (bump its `CACHE` version on every shipped change), `manifest.webmanifest`
declares the Home Screen app.

## Test/QA Guidelines

- All automated QA, unit tests, and background test scripts MUST mock network
  requests to `PRANA_PARSER_URL` by default. Never issue live fetch calls
  during automated test execution.
- Standalone diagnostic scripts (e.g. `test-parser.mjs`) must default to a
  mocked response and only hit the live Lambda endpoint when explicitly
  opted in (e.g. a `LIVE_TEST=true` environment flag).
