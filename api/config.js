/* Vercel serverless function: exposes Supabase config from environment
 * variables as a script. Set SUPABASE_URL and SUPABASE_ANON_KEY in
 * Vercel -> Project Settings -> Environment Variables.
 *
 * Pages load /api/config before assets/config.js; if the env vars are
 * missing (or when running on a plain static server locally, where
 * this endpoint doesn't exist), the assets/config.js fallback applies.
 */
export default function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");

  if (url && key) {
    const config = JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key });
    res.status(200).send("window.STARZEY_CONFIG = " + config + ";");
  } else {
    res.status(200).send("/* Supabase env vars not set; falling back to assets/config.js */");
  }
}
