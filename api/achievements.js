// Este es el "proxy" que habla con Steam en nombre del frontend.
// El frontend NO puede llamar a Steam directamente por dos razones:
// Así que el frontend nos llama a nosotros, y nosotros llamamos a Steam.

export default async function handler(req, res) {
  // CORS: Permitir que nuestro frontend de GitHub Pages haga peticiones aquí
  const FRONTEND_URL = process.env.FRONTEND_URL;
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Las peticiones OPTIONS son de "preflight" - el navegador pregunta si puede hacer la petición real
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { steamid } = req.query;

  if (!steamid) {
    return res.status(400).json({ error: 'Se requiere el parámetro steamid' });
  }

  // Validar que el steamId tiene el formato correcto (17 dígitos)
  if (!/^\d{17}$/.test(steamid)) {
    return res.status(400).json({ error: 'Steam ID inválido' });
  }

  const STEAM_API_KEY = process.env.STEAM_API_KEY;
  const STEAM_APP_ID = '250900'; // The Binding of Isaac: Rebirth (todas las versiones usan este ID)

  if (!STEAM_API_KEY) {
    return res.status(500).json({ error: 'Steam API Key no configurada en el servidor' });
  }

  try {
    // Hacemos DOS peticiones a Steam en paralelo para ser más eficientes:
    // 1. Los logros del jugador (cuáles tiene desbloqueados)
    // 2. El esquema del juego (nombres, descripciones e iconos de TODOS los logros)
    const [playerAchievementsRes, gameSchemaRes] = await Promise.all([
      fetch(
        `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&appid=${STEAM_APP_ID}&l=english`
      ),
      fetch(
        `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${STEAM_APP_ID}&l=english`
      ),
    ]);

    const playerData = await playerAchievementsRes.json();
    const schemaData = await gameSchemaRes.json();

    // Verificar si el perfil del usuario es privado
    if (playerData.playerstats?.error === 'Profile is not public') {
      return res.status(403).json({
        error: 'PRIVATE_PROFILE',
        message: 'Tu perfil de Steam es privado. Debes hacerlo público temporalmente para ver tus logros.'
      });
    }

    // Extraemos los logros del jugador (cuáles desbloqueó y cuándo)
    const playerAchievements = playerData.playerstats?.achievements || [];
    // Creamos un mapa para buscar rápido: { "ACHIEVEMENT_ID": { achieved: 1, unlocktime: 1234567890 } }
    const playerMap = {};
    for (const ach of playerAchievements) {
      playerMap[ach.apiname] = {
        achieved: ach.achieved,
        unlocktime: ach.unlocktime,
      };
    }

    // Extraemos el esquema del juego (nombres, descripciones, iconos)
    const schemaAchievements = schemaData.game?.availableGameStats?.achievements || [];

    // Combinamos toda la información en un solo array de objetos
    const combined = schemaAchievements.map((schema) => {
      const playerStatus = playerMap[schema.name] || { achieved: 0, unlocktime: 0 };
      return {
        id: schema.name,           // Nombre interno en Steam (ej: "ACHIEVEMENT_1")
        displayName: schema.displayName,  // Nombre visible (ej: "The D6")
        description: schema.description || '', // Descripción (vacía si está oculto en Steam)
        icon: schema.icon,          // URL del icono desbloqueado
        icongray: schema.icongray,  // URL del icono bloqueado (en gris)
        hidden: schema.hidden === 1, // true si Steam lo muestra como "logro oculto"
        achieved: playerStatus.achieved === 1,
        unlocktime: playerStatus.unlocktime,
      };
    });

    // Devolvemos los datos al frontend
    return res.status(200).json({
      steamid,
      gameName: playerData.playerstats?.gameName || 'The Binding of Isaac: Repentance',
      totalAchievements: combined.length,
      unlockedCount: combined.filter(a => a.achieved).length,
      achievements: combined,
    });

  } catch (error) {
    console.error('Error al obtener logros de Steam:', error);
    return res.status(500).json({ error: 'Error al contactar con la API de Steam' });
  }
}