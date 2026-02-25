// Este archivo contiene la base de datos LOCAL de logros:
// versión, categoría, personaje y cómo desbloquear cada uno.
// Los datos de STEAM (nombre, descripción, icono, desbloqueado o no)
// vienen del backend. Aquí COMPLEMENTAMOS esos datos con más info.

const VERSIONS = {
  rebirth:         { label: 'Rebirth',       class: 'v-rebirth',         color: '#4a7fbf' },
  afterbirth:      { label: 'Afterbirth',    class: 'v-afterbirth',      color: '#bf7a4a' },
  afterbirth_plus: { label: 'Afterbirth+',   class: 'v-afterbirth-plus', color: '#4abf8a' },
  repentance:      { label: 'Repentance',    class: 'v-repentance',      color: '#9a4abf' },
  repentance_plus: { label: 'Repentance+',   class: 'v-repentance-plus', color: '#bf4a6a' },
};

// Orden en el que se muestran las versiones
const VERSION_ORDER = ['rebirth', 'afterbirth', 'afterbirth_plus', 'repentance', 'repentance_plus'];

// Mapa de metadatos de logros, cargado desde achievements.json
// Clave = ID interno de Steam, Valor = objeto con metadatos
let ACHIEVEMENT_META_MAP = null;

// Carga asíncrona del JSON de logros
async function loadAchievementMeta() {
  if (ACHIEVEMENT_META_MAP) return ACHIEVEMENT_META_MAP; // Ya estaba cargado

  const response = await fetch('./data/achievements.json');
  const data = await response.json();

  // Convertimos el array a un mapa para búsqueda rápida por ID
  ACHIEVEMENT_META_MAP = {};
  for (const ach of data.achievements) {
    ACHIEVEMENT_META_MAP[ach.id] = ach;
  }

  return ACHIEVEMENT_META_MAP;
}

// Función para obtener los metadatos de un logro por su ID de Steam
function getMeta(steamAchievementId) {
  if (!ACHIEVEMENT_META_MAP) return null;
  return ACHIEVEMENT_META_MAP[steamAchievementId] || null;
}

// Función para obtener la versión de un logro (con fallback)
function getVersion(meta) {
  if (!meta || !meta.version) return 'rebirth'; // Default: Rebirth si no lo sabemos
  return meta.version;
}

// Formatea una fecha de desbloqueo de Unix timestamp a texto legible
function formatUnlockDate(unixTimestamp) {
  if (!unixTimestamp || unixTimestamp === 0) return null;
  const date = new Date(unixTimestamp * 1000); // Steam usa segundos, JS usa milisegundos
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}