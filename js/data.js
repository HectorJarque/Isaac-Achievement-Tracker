// js/data.js
// Base de datos LOCAL de logros de Isaac.
// IMPORTANTE: ahora el match se hace por displayName (nombre visible en Steam),
// no por el ID interno de Steam, que no podemos conocer sin llamar a la API.

const VERSIONS = {
  rebirth:         { label: 'Rebirth',       class: 'v-rebirth',         color: '#4a7fbf' },
  afterbirth:      { label: 'Afterbirth',    class: 'v-afterbirth',      color: '#bf7a4a' },
  afterbirth_plus: { label: 'Afterbirth+',   class: 'v-afterbirth-plus', color: '#4abf8a' },
  repentance:      { label: 'Repentance',    class: 'v-repentance',      color: '#9a4abf' },
  repentance_plus: { label: 'Repentance+',   class: 'v-repentance-plus', color: '#bf4a6a' },
};

const VERSION_ORDER = ['rebirth', 'afterbirth', 'afterbirth_plus', 'repentance', 'repentance_plus'];

let ACHIEVEMENT_META_MAP = null;

async function loadAchievementMeta() {
  if (ACHIEVEMENT_META_MAP) return ACHIEVEMENT_META_MAP;

  const base = window.location.pathname.replace(/\/[^/]*$/, '');
  const response = await fetch(`${base}/data/achievements.json`);
  const data = await response.json();

  ACHIEVEMENT_META_MAP = {};
  for (const ach of data.achievements) {
    const key = ach.displayName.toLowerCase().trim();
    ACHIEVEMENT_META_MAP[key] = ach;
  }

  return ACHIEVEMENT_META_MAP;
}

function getMeta(displayName) {
  if (!ACHIEVEMENT_META_MAP || !displayName) return null;
  return ACHIEVEMENT_META_MAP[displayName.toLowerCase().trim()] || null;
}

function formatUnlockDate(unixTimestamp) {
  if (!unixTimestamp || unixTimestamp === 0) return null;
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}