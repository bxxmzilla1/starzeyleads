/* Vercel serverless function: geolocates the visitor's IP with IPinfo.
 *
 * Set IPINFO_TOKEN in Vercel -> Project Settings -> Environment
 * Variables (free tier: https://ipinfo.io). Without a token the
 * request still works within IPinfo's small unauthenticated limits.
 */
export default async function handler(req, res) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : (fwd || ""))
    .split(",")[0]
    .trim();

  res.setHeader("Cache-Control", "no-store");

  const token = process.env.IPINFO_TOKEN;
  const query = token ? "?token=" + encodeURIComponent(token) : "";
  const url = ip
    ? "https://ipinfo.io/" + encodeURIComponent(ip) + "/json" + query
    : "https://ipinfo.io/json" + query;

  try {
    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await resp.json();

    res.status(200).json({
      ip: data.ip || ip || null,
      city: data.city || null,
      region: data.region || null,
      country: data.country || null
    });
  } catch (err) {
    /* Geolocation is best-effort; never block the funnel over it. */
    res.status(200).json({ ip: ip || null, city: null, region: null, country: null });
  }
}
