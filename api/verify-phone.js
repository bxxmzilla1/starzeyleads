/* Vercel serverless function: validates a phone number with the free
 * Twilio Lookup v2 API (no SMS is sent, basic lookups are free).
 *
 * Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Vercel ->
 * Project Settings -> Environment Variables. Without them (or if
 * Twilio is unreachable) the check is skipped and the number is
 * treated as valid, so the funnel never breaks.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const digits = String((req.body && req.body.phone) || "").replace(/\D/g, "");
  if (digits.length !== 10) {
    res.status(200).json({ valid: false, reason: "bad_format" });
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    res.status(200).json({ valid: true, simulated: true });
    return;
  }

  try {
    const e164 = "+1" + digits;
    const auth = Buffer.from(sid + ":" + token).toString("base64");
    const resp = await fetch(
      "https://lookups.twilio.com/v2/PhoneNumbers/" + encodeURIComponent(e164),
      { headers: { Authorization: "Basic " + auth } }
    );
    const data = await resp.json();

    res.status(200).json({
      valid: data.valid === true,
      countryCode: data.country_code || null
    });
  } catch (err) {
    /* Twilio outage shouldn't block lead capture. */
    res.status(200).json({ valid: true, simulated: true });
  }
}
