import { config } from '../config.js';

export async function requirePocketbaseAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Cabecera de autenticación requerida. Formato: Bearer <token>'
    });
  }

  const token = authHeader.split(' ')[1]?.trim();

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado.' });
  }

  const refreshUrl = `${config.pocketbaseUrl}/api/collections/${config.pocketbaseCollection}/auth-refresh`;

  try {
    const pbRes = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (pbRes.status === 401 || pbRes.status === 403 || pbRes.status === 400) {
      return res.status(401).json({
        error: 'Sesión no válida o expirada en PocketBase.'
      });
    }

    if (!pbRes.ok) {
      const errText = await pbRes.text();
      console.error(`[PB Error] HTTP ${pbRes.status}: ${errText}`);
      return res.status(502).json({
        error: 'Error al contactar el servidor de autenticación.'
      });
    }

    const data = await pbRes.json();
    req.user = data.record;
    req.freshToken = data.token;
    next();
  } catch (err) {
    console.error('[PB Connection Error]:', err.message);
    return res.status(503).json({
      error: 'Servicio de autenticación inalcanzable.'
    });
  }
}
