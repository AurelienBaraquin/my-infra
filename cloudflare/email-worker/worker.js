// Email Worker « dashboard-inbox » : tout mail reçu sur inbox@aurelienb.com est poussé tel quel
// (MIME brut) vers le dashboard, qui le range dans la boîte de réception.
// Déployé par scripts/cloudflare-email.sh. Bindings : DASH_URL (texte), DASH_TOKEN (secret, jeton
// dsh_ de portée ingest:email), FALLBACK (facultatif : adresse vérifiée qui reçoit le mail si le
// dashboard est injoignable).
const MAX_BYTES = 15 * 1024 * 1024;

export default {
  async email(message, env) {
    if (message.rawSize > MAX_BYTES) {
      message.setReject('Message trop volumineux pour le dashboard (15 Mo max)');
      return;
    }
    const raw = await new Response(message.raw).arrayBuffer();
    let status = 0;
    try {
      const res = await fetch(env.DASH_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.DASH_TOKEN}`,
          'content-type': 'message/rfc822',
          'x-envelope-from': message.from,
          'x-envelope-to': message.to,
        },
        body: raw,
      });
      status = res.status;
      if (res.ok) return;
    } catch {
      status = 0;
    }
    // Dashboard injoignable ou refus : on ne perd pas le mail.
    if (env.FALLBACK) await message.forward(env.FALLBACK);
    else message.setReject(`Dashboard indisponible (HTTP ${status}), réessayez plus tard`);
  },
};
