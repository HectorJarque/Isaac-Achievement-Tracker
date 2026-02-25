// Steam redirige aquí después del login. Debemos VERIFICAR que la respuesta es legítima
// Esto se hace enviando los parámetros de vuelta a Steam para que los confirme.

export default async function handler(req, res) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://hectorjarque.github.io';
  const SITE_URL = process.env.SITE_URL || FRONTEND_URL;
  const BACKEND_URL = process.env.BACKEND_URL || 'https://isaac-achievement-tracker.vercel.app';

  try {
    // Steam nos envía todos los parámetros openid en la query string
    const query = req.query;

    // Paso 1: Verificar que Steam confirmó el login (no solo que llegó alguien a esta URL)
    if (query['openid.mode'] !== 'id_res') {
      return res.redirect(`${SITE_URL}?error=login_cancelled`);
    }

    // Paso 2: Verificar la autenticidad enviando los parámetros de vuelta a Steam
    // Construimos el cuerpo de la petición de verificación
    const verifyParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      verifyParams.set(key, value);
    }
    // Cambiamos el modo a "check_authentication" para la verificación
    verifyParams.set('openid.mode', 'check_authentication');

    const verifyResponse = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString(),
    });

    const verifyText = await verifyResponse.text();

    // Steam responde con "is_valid:true" si la autenticación es legítima
    if (!verifyText.includes('is_valid:true')) {
      return res.redirect(`${SITE_URL}?error=invalid_auth`);
    }

    // Paso 3: Extraer el Steam ID del campo "claimed_id"
    // Steam devuelve una URL como: https://steamcommunity.com/openid/id/76561198XXXXXXXXX
    const claimedId = query['openid.claimed_id'];
    const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);

    if (!steamIdMatch) {
      return res.redirect(`${SITE_URL}?error=no_steamid`);
    }

    const steamId = steamIdMatch[1];

    // Paso 4: Opcionalmente, obtenemos el nombre y avatar del usuario de Steam
    // para mostrarlo en el dashboard sin que el usuario tenga que decir su nombre
    let playerInfo = null;
    const STEAM_API_KEY = process.env.STEAM_API_KEY;

    if (STEAM_API_KEY) {
      try {
        const playerResponse = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
        );
        const playerData = await playerResponse.json();
        const player = playerData?.response?.players?.[0];
        if (player) {
          playerInfo = {
            name: player.personaname,
            avatar: player.avatarmedium,
          };
        }
      } catch {
        // Si falla, no pasa nada, seguimos sin info extra
      }
    }

    // Paso 5: Redirigir al dashboard del frontend con el Steam ID
    // El Steam ID no es secreto (es público en Steam), así que puede ir en la URL
    const dashboardParams = new URLSearchParams({ steamid: steamId });
    if (playerInfo) {
      dashboardParams.set('name', playerInfo.name);
      dashboardParams.set('avatar', playerInfo.avatar);
    }

    res.redirect(`${SITE_URL}/dashboard.html?${dashboardParams.toString()}`);

  } catch (error) {
    console.error('Error en callback de Steam:', error);
    res.redirect(`${SITE_URL}?error=server_error`);
  }
}