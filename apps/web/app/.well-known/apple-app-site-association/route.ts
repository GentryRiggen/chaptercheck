/**
 * Apple App Site Association (AASA) file for Universal Links.
 *
 * Served at `/.well-known/apple-app-site-association` with
 * `Content-Type: application/json`. Apple's CDN fetches this to verify the
 * domain ↔ app association so `https://chaptercheck.com/...` links open the
 * iOS app when installed, and fall back to the web otherwise.
 *
 * If the app ID or matched paths change, update this file and redeploy — Apple
 * caches the association file, so changes may take up to 24h to propagate.
 */

export const dynamic = "force-static";

const APP_ID = "DDA6P8AJDM.com.chaptercheck.app";

const aasa = {
  applinks: {
    details: [
      {
        appIDs: [APP_ID],
        components: [
          { "/": "/books/*" },
          { "/": "/authors/*" },
          { "/": "/series/*" },
          { "/": "/shelves/*" },
          { "/": "/users/*" },
        ],
      },
    ],
  },
};

export function GET() {
  return new Response(JSON.stringify(aasa), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
