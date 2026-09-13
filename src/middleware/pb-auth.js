import { config } from '../config.js';

export async function requirePocketbaseAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn('[PB Auth Debug] Rejected request: Missing Authorization header.');
    return res.status(401).json({
      error: 'Cabecera de autenticación requerida. Formato: Bearer <token>'
    });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : authHeader.trim();

  if (!token) {
    console.warn('[PB Auth Debug] Rejected request: Empty Bearer token.');
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  const refreshUrl = `${config.pocketbaseUrl}/api/collections/${config.pocketbaseCollection}/auth-refresh`;

  console.log(`[PB Auth Debug] Contacting PocketBase auth endpoint: ${refreshUrl}`);

  try {
    const pbRes = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(6000) // 6 second timeout to prevent hanging
    });

    if (pbRes.status === 401 || pbRes.status === 403 || pbRes.status === 400) {
      console.warn(`[PB Auth Debug] Token rejected by PocketBase with HTTP status ${pbRes.status}`);
      return res.status(401).json({
        error: 'Sesión no válida o expirada en PocketBase.'
      });
    }

    if (!pbRes.ok) {
      const errText = await pbRes.text();
      console.error(`[PB Auth Debug] PocketBase returned non-200 status ${pbRes.status}: ${errText}`);
      return res.status(502).json({
        error: `Error al contactar el servidor de autenticación PocketBase (HTTP ${pbRes.status}).`
      });
    }

    const data = await pbRes.json();
    console.log(`[PB Auth Debug] Token validated successfully for user: ${data?.record?.id || data?.record?.email || 'authenticated'}`);
    req.user = data.record;
    req.freshToken = data.token;
    next();
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.error(`[PB Auth Debug] Timeout after 6s contacting PocketBase at ${refreshUrl}`);
      return res.status(504).json({
        error: `Tiempo de espera agotado (Timeout) al contactar PocketBase en ${config.pocketbaseUrl}. Revisa la variable POCKETBASE_URL.`
      });
    }

    console.error('[PB Auth Debug] Connection Error:', err.message);
    return res.status(503).json({
      error: `Servicio de autenticación inalcanzable (${config.pocketbaseUrl}). ${err.message}`
    });
  }
}
