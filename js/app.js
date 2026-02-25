// js/app.js
const BACKEND_URL = 'https://isaac-achievement-tracker.vercel.app';

let allAchievements = [];
let activeFilters = {
  version: 'all',
  status: 'all',
  category: 'all',
  search: '',
};

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const steamId = params.get('steamid');
  const userName = params.get('name');
  const userAvatar = params.get('avatar');

  if (!steamId) { window.location.href = 'index.html'; return; }

  document.getElementById('userName').textContent = userName || 'Steam User';

  if (userAvatar) {
    const avatarImg = document.getElementById('userAvatar');
    avatarImg.src = userAvatar;
    avatarImg.style.display = 'block';
    document.getElementById('userAvatarPlaceholder').style.display = 'none';
  }

  setupFilters();
  setupSearch();
  setupModal();

  try { await loadAchievementMeta(); } catch (err) {
    console.warn('No se pudo cargar la base de datos de metadatos:', err);
  }

  await fetchAndRenderAchievements(steamId);
});

async function fetchAndRenderAchievements(steamId) {
  const loadingScreen  = document.getElementById('loadingScreen');
  const errorScreen    = document.getElementById('errorScreen');
  const container      = document.getElementById('achievementsContainer');

  try {
    const response = await fetch(`${BACKEND_URL}/api/achievements?steamid=${steamId}`);
    const data = await response.json();

    if (data.error === 'PRIVATE_PROFILE') {
      document.getElementById('errorScreenText').textContent =
        '⚠ Tu perfil de Steam es PRIVADO. Ponlo en público en la configuración de Steam y vuelve a intentarlo.';
      loadingScreen.style.display = 'none';
      errorScreen.style.display = 'flex';
      return;
    }
    if (data.error) throw new Error(data.error);

    allAchievements = data.achievements.map(steamAch => {
      const meta = getMeta(steamAch.displayName);
      return {
        id:           steamAch.id,
        displayName:  steamAch.displayName,
        description:  steamAch.description,
        icon:         steamAch.icon,
        icongray:     steamAch.icongray,
        steamHidden:  steamAch.hidden,
        achieved:     steamAch.achieved,
        unlocktime:   steamAch.unlocktime,
        howToUnlock:  meta?.howToUnlock  || null,
        version:      meta?.version      || 'rebirth',
        category:     meta?.category     || 'item',
        character:    meta?.character    || null,
        secret:       meta?.secret       || false,
        tags:         meta?.tags         || [],
        hasMeta:      !!meta,
      };
    });

    const unlocked = allAchievements.filter(a => a.achieved).length;
    updateGlobalProgress(unlocked, allAchievements.length);

    loadingScreen.style.display = 'none';
    container.style.display = 'block';
    renderAchievements();

  } catch (err) {
    console.error('Error al cargar logros:', err);
    loadingScreen.style.display = 'none';
    errorScreen.style.display = 'flex';
    document.getElementById('errorScreenText').textContent =
      'Error al conectar con el servidor. Inténtalo de nuevo más tarde.';
  }
}

function updateGlobalProgress(unlocked, total) {
  const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  document.getElementById('progressText').textContent = `${unlocked} / ${total} logros desbloqueados`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  setTimeout(() => {
    document.getElementById('progressFill').style.width = percent + '%';
  }, 200);
}

function renderAchievements() {
  const container = document.getElementById('achievementsContainer');
  container.innerHTML = '';

  const filtered = filterAchievements(allAchievements);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <span class="no-results-icon">💀</span>
        <p class="vt323">No se encontraron logros con esos filtros.</p>
      </div>`;
    return;
  }

  const byVersion = groupByVersion(filtered);

  for (const version of VERSION_ORDER) {
    const achievements = byVersion[version];
    if (!achievements || achievements.length === 0) continue;

    const vInfo = VERSIONS[version];
    const unlocked = achievements.filter(a => a.achieved).length;
    const total = achievements.length;
    const pct = Math.round((unlocked / total) * 100);

    const section = document.createElement('div');
    section.className = 'version-section';
    section.dataset.version = version;
    section.innerHTML = `
      <div class="version-header">
        <h2 class="version-title" style="color:${vInfo.color}">${vInfo.label}</h2>
        <div class="version-bar">
          <div class="version-bar-fill" style="width:${pct}%;background:${vInfo.color}"></div>
        </div>
        <span class="version-progress-mini">${unlocked}/${total} (${pct}%)</span>
      </div>
      <div class="achievements-grid" id="grid-${version}"></div>`;
    container.appendChild(section);

    const grid = section.querySelector(`#grid-${version}`);
    for (const ach of achievements) grid.appendChild(createAchievementCard(ach));
  }
}

// ── TAG HELPERS ─────────────────────────────────────────────────────────────

/**
 * Genera el CSS slug para un tag concreto.
 * Convierte "BOSS RUSH" → "tag-boss-rush", "???" → "tag-unk", etc.
 */
function tagSlug(tag) {
  const map = {
    'PERSONAJE':       'character',
    'OBJETO':          'item',
    'BOSS':            'boss',
    'BOSS RUSH':       'boss-rush',
    'DESAFÍO':         'challenge',
    'ÁREA':            'area',
    'CO-OP':           'coop',
    'DONACIÓN':        'donation',
    'TIENDA':          'shop',
    'NO DAMAGE':       'nodamage',
    'HARD MODE':       'hard',
    'TRANSFORMACIÓN':  'transform',
    'COLECCIÓN':       'collection',
    'PROGRESIÓN':      'progression',
    'DIFICULTAD':      'difficulty',
    'COMPLETION MARKS':'completion',
    'EXPLORACIÓN':     'explore',
    'ANGEL ROOM':      'angel',
    'DEVIL DEAL':      'devil',
    'MUERTES':         'deaths',
    'SECRETO':         'secret',
    '100%':            'platinum',
    '???':             'blubaby',
    'ISAAC':           'chr-isaac',
    'MAGDALENE':       'chr-magdalene',
    'CAIN':            'chr-cain',
    'JUDAS':           'chr-judas',
    'EVE':             'chr-eve',
    'SAMSON':          'chr-samson',
    'AZAZEL':          'chr-azazel',
    'LAZARUS':         'chr-lazarus',
    'EDEN':            'chr-eden',
    'THE LOST':        'chr-thelost',
  };
  return 'tag-' + (map[tag] || tag.toLowerCase().replace(/[^a-z0-9]/g, '-'));
}

function buildTagsHTML(ach) {
  const tags = ach.tags && ach.tags.length > 0 ? ach.tags : [];

  // Si no hay tags, fallback a category
  if (tags.length === 0) {
    return `<span class="card-tag tag-${ach.category}">${ach.category.toUpperCase()}</span>`;
  }

  // Máximo 4 tags en la card para no saturar
  const visible = tags.slice(0, 4);
  return visible.map(t =>
    `<span class="card-tag ${tagSlug(t)}">${t}</span>`
  ).join('');
}

function buildModalTagsHTML(ach) {
  const tags = ach.tags && ach.tags.length > 0 ? ach.tags : [ach.category.toUpperCase()];
  return tags.map(t =>
    `<span class="meta-tag ${tagSlug(t)}">${t}</span>`
  ).join('');
}

// ── CARD ────────────────────────────────────────────────────────────────────

function createAchievementCard(ach) {
  const card = document.createElement('div');
  card.className = `achievement-card ${ach.achieved ? 'is-unlocked' : 'is-locked'} ${!ach.hasMeta ? 'steam-only' : ''}`;

  let iconHTML;
  if (ach.achieved && ach.icon)  iconHTML = `<img class="card-icon" src="${ach.icon}" alt="" loading="lazy">`;
  else if (ach.icongray)         iconHTML = `<img class="card-icon is-locked" src="${ach.icongray}" alt="" loading="lazy">`;
  else                           iconHTML = `<div class="card-icon-placeholder">${ach.achieved ? '⭐' : '?'}</div>`;

  let desc = ach.description && ach.description.trim() !== '' ? ach.description : null;
  if (!desc) desc = ach.howToUnlock ? ach.howToUnlock.substring(0, 70) + '...' : 'Haz clic para ver cómo desbloquear.';

  card.innerHTML = `
    <div class="card-top">
      ${iconHTML}
      <span class="card-name">${ach.displayName}</span>
    </div>
    <p class="card-desc">${desc}</p>
    <div class="card-footer">${buildTagsHTML(ach)}</div>`;

  card.addEventListener('click', () => openModal(ach));
  return card;
}

// ── FILTROS ──────────────────────────────────────────────────────────────────

function filterAchievements(achievements) {
  return achievements.filter(ach => {
    if (activeFilters.version  !== 'all' && ach.version  !== activeFilters.version)  return false;
    if (activeFilters.status   === 'unlocked' && !ach.achieved) return false;
    if (activeFilters.status   === 'locked'   &&  ach.achieved) return false;
    if (activeFilters.category !== 'all' && ach.category !== activeFilters.category) return false;
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const searchIn = [ach.displayName, ach.description, ach.howToUnlock, ach.character, ...(ach.tags || [])];
      if (!searchIn.some(s => (s || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

function groupByVersion(achievements) {
  const groups = {};
  for (const ach of achievements) {
    if (!groups[ach.version]) groups[ach.version] = [];
    groups[ach.version].push(ach);
  }
  return groups;
}

function setupFilters() {
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const ft = pill.dataset.filter;
      const fv = pill.dataset.value;
      document.querySelectorAll(`.pill[data-filter="${ft}"]`).forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilters[ft] = fv;
      renderAchievements();
    });
  });
}

function setupSearch() {
  let t;
  document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => { activeFilters.search = e.target.value.trim(); renderAchievements(); }, 300);
  });
}

// ── MODAL ────────────────────────────────────────────────────────────────────

function setupModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openModal(ach) {
  const vInfo = VERSIONS[ach.version] || VERSIONS.rebirth;
  const icon  = document.getElementById('modalIcon');
  icon.src    = (ach.achieved && ach.icon) ? ach.icon : (ach.icongray || '');
  icon.style.filter = (!ach.achieved && ach.icongray) ? 'grayscale(80%) brightness(0.5)' : 'none';

  document.getElementById('modalName').textContent = ach.displayName;

  const badge = document.getElementById('modalVersionBadge');
  badge.textContent       = vInfo.label;
  badge.style.color       = vInfo.color;
  badge.style.borderColor = vInfo.color;
  badge.style.background  = vInfo.color + '15';

  const statusEl = document.getElementById('modalStatus');
  if (ach.achieved) { statusEl.textContent = '✓ DESBLOQUEADO'; statusEl.className = 'modal-status unlocked'; }
  else              { statusEl.textContent = '✗ PENDIENTE';    statusEl.className = 'modal-status locked'; }

  const desc = (ach.description && ach.description.trim()) || 'Sin descripción de Steam.';
  document.getElementById('modalDesc').textContent = desc;

  const howEl = document.getElementById('modalHow');
  if (ach.howToUnlock) {
    howEl.textContent = ach.howToUnlock;
    howEl.style.color = '';
  } else {
    howEl.textContent = '⚠ Este logro aún no está en nuestra base de datos. Consulta la wiki oficial: bindingofisaacrebirth.fandom.com/wiki/Achievements';
    howEl.style.color = 'var(--text-hint)';
  }

  // Tags en el modal (todos, sin límite)
  const metaEl = document.getElementById('modalMeta');
  if (metaEl) {
    metaEl.innerHTML = buildModalTagsHTML(ach);
  } else {
    // Fallback para versiones anteriores del HTML
    document.getElementById('modalCategory').textContent = '📁 ' + (ach.category || 'item').toUpperCase();
    const charEl = document.getElementById('modalCharacter');
    if (ach.character) { charEl.textContent = '👤 ' + ach.character; charEl.style.display = 'inline'; }
    else               { charEl.style.display = 'none'; }
  }

  const dateEl  = document.getElementById('modalDate');
  const dateStr = formatUnlockDate(ach.unlocktime);
  if (dateStr && ach.achieved) { dateEl.textContent = '📅 ' + dateStr; dateEl.style.display = 'inline'; }
  else                         { dateEl.style.display = 'none'; }

  document.getElementById('modalOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}