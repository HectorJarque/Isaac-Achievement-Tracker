// Pasos:
//   1. Leer el Steam ID de la URL (lo puso el backend después del login)
//   2. Llamar al backend para pedir los logros del usuario
//   3. Cruzar los datos de Steam con nuestra base de datos local (how-to-unlock, versión, etc.)
//   4. Renderizar todo en pantalla con filtros y búsqueda

// ── CONFIGURACIÓN ──
const BACKEND_URL = 'https://isaac-achievement-tracker.vercel.app';

// ── ESTADO DE LA APLICACIÓN ──
let allAchievements = []; // Todos los logros combinados (Steam + nuestra DB)
let activeFilters = {
  version: 'all',
  status: 'all',
  category: 'all',
  search: '',
};

// ── PUNTO DE ENTRADA ──
document.addEventListener('DOMContentLoaded', async () => {
  // Leer parámetros de la URL
  const params = new URLSearchParams(window.location.search);
  const steamId = params.get('steamid');
  const userName = params.get('name');
  const userAvatar = params.get('avatar');

  // Si no hay steamid, el usuario llegó aquí sin loguearse
  if (!steamId) {
    window.location.href = 'index.html';
    return;
  }

  // Mostrar info del usuario en el header
  if (userName) {
    document.getElementById('userName').textContent = userName;
  } else {
    document.getElementById('userName').textContent = 'Steam User';
  }

  if (userAvatar) {
    const avatarImg = document.getElementById('userAvatar');
    avatarImg.src = userAvatar;
    avatarImg.style.display = 'block';
    document.getElementById('userAvatarPlaceholder').style.display = 'none';
  }

  // Configurar filtros y búsqueda
  setupFilters();
  setupSearch();
  setupModal();

  // Cargar la base de datos de metadatos
  try {
    await loadAchievementMeta();
  } catch (err) {
    console.warn('No se pudo cargar la base de datos de metadatos:', err);
  }

  // Pedir logros al backend
  await fetchAndRenderAchievements(steamId);
});

// ── CARGA DE LOGROS ──
async function fetchAndRenderAchievements(steamId) {
  const loadingScreen = document.getElementById('loadingScreen');
  const errorScreen = document.getElementById('errorScreen');
  const achievementsContainer = document.getElementById('achievementsContainer');

  try {
    const response = await fetch(`${BACKEND_URL}/api/achievements?steamid=${steamId}`);
    const data = await response.json();

    // Si el perfil es privado, mostrar mensaje especial
    if (data.error === 'PRIVATE_PROFILE') {
      document.getElementById('errorScreenText').textContent =
        'Tu perfil de Steam es PRIVADO. Ponlo en público en la configuración de Steam y vuelve a intentarlo.';
      loadingScreen.style.display = 'none';
      errorScreen.style.display = 'flex';
      return;
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // Combinar logros de Steam con nuestra base de datos
    allAchievements = data.achievements.map(steamAch => {
      const meta = getMeta(steamAch.id);
      return {
        // Datos de Steam
        id: steamAch.id,
        displayName: steamAch.displayName,
        description: steamAch.description,
        icon: steamAch.icon,
        icongray: steamAch.icongray,
        steamHidden: steamAch.hidden,     // Steam marca algunos como "ocultos"
        achieved: steamAch.achieved,
        unlocktime: steamAch.unlocktime,
        // Datos de nuestra base de datos (null si no lo tenemos aún)
        howToUnlock: meta?.howToUnlock || null,
        version: meta?.version || 'rebirth',  // Si no sabemos la versión, Rebirth por defecto
        category: meta?.category || 'general',
        character: meta?.character || null,
        secret: meta?.secret || steamAch.hidden,
        hasMeta: !!meta,  // ¿Está en nuestra DB?
      };
    });

    // Actualizar la barra de progreso global
    const unlocked = allAchievements.filter(a => a.achieved).length;
    const total = allAchievements.length;
    updateGlobalProgress(unlocked, total);

    // Renderizar logros
    loadingScreen.style.display = 'none';
    achievementsContainer.style.display = 'block';
    renderAchievements();

  } catch (err) {
    console.error('Error al cargar logros:', err);
    loadingScreen.style.display = 'none';
    errorScreen.style.display = 'flex';
    document.getElementById('errorScreenText').textContent =
      'Error al conectar con el servidor. Inténtalo de nuevo más tarde.';
  }
}

// ── BARRA DE PROGRESO GLOBAL ──
function updateGlobalProgress(unlocked, total) {
  const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  document.getElementById('progressText').textContent = `${unlocked} / ${total} logros desbloqueados`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  // Pequeño delay para que la animación se vea
  setTimeout(() => {
    document.getElementById('progressFill').style.width = percent + '%';
  }, 200);
}

// ── RENDERIZADO PRINCIPAL ──
function renderAchievements() {
  const container = document.getElementById('achievementsContainer');
  container.innerHTML = '';

  // 1. Filtrar logros según el estado actual de los filtros
  const filtered = filterAchievements(allAchievements);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <span class="no-results-icon">💀</span>
        <p class="vt323">No se encontraron logros con esos filtros.</p>
      </div>
    `;
    return;
  }

  // 2. Agrupar por versión
  const byVersion = groupByVersion(filtered);

  // 3. Renderizar cada grupo de versión
  for (const version of VERSION_ORDER) {
    const achievements = byVersion[version];
    if (!achievements || achievements.length === 0) continue;

    const versionInfo = VERSIONS[version];
    const unlockedInVersion = achievements.filter(a => a.achieved).length;
    const totalInVersion = achievements.length;
    const percentInVersion = Math.round((unlockedInVersion / totalInVersion) * 100);

    // Crear sección de versión
    const section = document.createElement('div');
    section.className = 'version-section';
    section.dataset.version = version;

    section.innerHTML = `
      <div class="version-header">
        <h2 class="version-title" style="color: ${versionInfo.color}">
          ${versionInfo.label}
        </h2>
        <div class="version-bar">
          <div class="version-bar-fill" style="width: ${percentInVersion}%; background: ${versionInfo.color}"></div>
        </div>
        <span class="version-progress-mini">${unlockedInVersion}/${totalInVersion} (${percentInVersion}%)</span>
      </div>
      <div class="achievements-grid" id="grid-${version}"></div>
    `;

    container.appendChild(section);

    // Renderizar las tarjetas de logros de esta versión
    const grid = section.querySelector(`#grid-${version}`);
    for (const ach of achievements) {
      grid.appendChild(createAchievementCard(ach));
    }
  }
}

// ── TARJETA DE LOGRO ──
function createAchievementCard(ach) {
  const card = document.createElement('div');
  card.className = `achievement-card ${ach.achieved ? 'is-unlocked' : 'is-locked'} ${!ach.hasMeta ? 'steam-only' : ''}`;
  card.dataset.achId = ach.id;

  // Icono: usamos el de Steam si está disponible
  let iconHTML;
  if (ach.achieved && ach.icon) {
    iconHTML = `<img class="card-icon" src="${ach.icon}" alt="${ach.displayName}" loading="lazy">`;
  } else if (ach.icongray) {
    iconHTML = `<img class="card-icon is-locked" src="${ach.icongray}" alt="${ach.displayName}" loading="lazy">`;
  } else {
    // Placeholder si Steam no tiene icono (raro pero posible)
    iconHTML = `<div class="card-icon-placeholder">${ach.achieved ? '⭐' : '?'}</div>`;
  }

  // Nombre: si en Steam está oculto Y aún no lo hemos desbloqueado, mostramos "???"
  const displayName = (ach.steamHidden && !ach.achieved) ? '???' : ach.displayName;

  // Descripción corta
  let desc = ach.description;
  if (!desc || desc.trim() === '') {
    desc = ach.howToUnlock
      ? ach.howToUnlock.substring(0, 60) + '...'
      : 'Logro secreto. Haz clic para ver cómo desbloquearlo.';
  }

  // Tags: categoría y si es secreto
  let tagsHTML = `<span class="card-tag tag-${ach.category}">${ach.category.toUpperCase()}</span>`;
  if (ach.secret) tagsHTML += `<span class="card-tag tag-secret">SECRETO</span>`;
  if (ach.character) tagsHTML += `<span class="card-tag tag-character">${ach.character}</span>`;

  card.innerHTML = `
    <div class="card-top">
      ${iconHTML}
      <span class="card-name">${displayName}</span>
    </div>
    <p class="card-desc">${desc}</p>
    <div class="card-footer">${tagsHTML}</div>
  `;

  // Clic para abrir el modal de detalle
  card.addEventListener('click', () => openModal(ach));

  return card;
}

// ── FILTROS ──
function filterAchievements(achievements) {
  return achievements.filter(ach => {
    // Filtro de versión
    if (activeFilters.version !== 'all' && ach.version !== activeFilters.version) return false;

    // Filtro de estado
    if (activeFilters.status === 'unlocked' && !ach.achieved) return false;
    if (activeFilters.status === 'locked' && ach.achieved) return false;

    // Filtro de categoría
    if (activeFilters.category !== 'all' && ach.category !== activeFilters.category) return false;

    // Filtro de búsqueda (busca en nombre, descripción y cómo desbloquear)
    if (activeFilters.search) {
      const q = activeFilters.search.toLowerCase();
      const inName = ach.displayName.toLowerCase().includes(q);
      const inDesc = (ach.description || '').toLowerCase().includes(q);
      const inHow = (ach.howToUnlock || '').toLowerCase().includes(q);
      const inChar = (ach.character || '').toLowerCase().includes(q);
      if (!inName && !inDesc && !inHow && !inChar) return false;
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
  // Escuchar clics en todas las pastillas de filtro
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const filterType = pill.dataset.filter;
      const filterValue = pill.dataset.value;

      // Desactivar otras pastillas del mismo grupo
      document.querySelectorAll(`.pill[data-filter="${filterType}"]`).forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      // Actualizar el estado de filtros y rerenderizar
      activeFilters[filterType] = filterValue;
      renderAchievements();
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    // "Debounce": esperar 300ms antes de aplicar el filtro para no sobrecargar
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      activeFilters.search = e.target.value.trim();
      renderAchievements();
    }, 300);
  });
}

// ── MODAL ──
function setupModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(ach) {
  const overlay = document.getElementById('modalOverlay');
  const versionInfo = VERSIONS[ach.version] || VERSIONS.rebirth;

  // Icono del modal
  const icon = document.getElementById('modalIcon');
  icon.src = (ach.achieved && ach.icon) ? ach.icon : (ach.icongray || '');
  icon.alt = ach.displayName;
  if (!ach.achieved && ach.icongray) {
    icon.style.filter = 'grayscale(80%) brightness(0.5)';
  } else {
    icon.style.filter = 'none';
  }

  // Nombre
  const displayName = (ach.steamHidden && !ach.achieved) ? '??? (Logro oculto)' : ach.displayName;
  document.getElementById('modalName').textContent = displayName;

  // Badge de versión
  const badge = document.getElementById('modalVersionBadge');
  badge.textContent = versionInfo.label;
  badge.style.color = versionInfo.color;
  badge.style.borderColor = versionInfo.color;
  badge.style.background = versionInfo.color + '15';

  // Estado: desbloqueado o no
  const statusEl = document.getElementById('modalStatus');
  if (ach.achieved) {
    statusEl.textContent = '✓ DESBLOQUEADO';
    statusEl.className = 'modal-status unlocked';
  } else {
    statusEl.textContent = '✗ PENDIENTE';
    statusEl.className = 'modal-status locked';
  }

  // Descripción de Steam
  let desc = ach.description;
  if (!desc || desc.trim() === '') {
    desc = ach.steamHidden ? '[Steam oculta la descripción de este logro hasta que lo desbloquees]' : 'Sin descripción.';
  }
  document.getElementById('modalDesc').textContent = desc;

  // Cómo desbloquear (de nuestra DB)
  const howEl = document.getElementById('modalHow');
  if (ach.howToUnlock) {
    howEl.textContent = ach.howToUnlock;
  } else {
    howEl.textContent = '⚠ Este logro aún no está en nuestra base de datos. Consulta la wiki oficial de Isaac para más información.';
    howEl.style.color = 'var(--text-hint)';
  }

  // Metadatos: categoría, personaje, fecha de desbloqueo
  document.getElementById('modalCategory').textContent = '📁 ' + (ach.category || 'general').toUpperCase();

  const charEl = document.getElementById('modalCharacter');
  if (ach.character) {
    charEl.textContent = '👤 ' + ach.character;
    charEl.style.display = 'inline';
  } else {
    charEl.style.display = 'none';
  }

  const dateEl = document.getElementById('modalDate');
  const dateStr = formatUnlockDate(ach.unlocktime);
  if (dateStr && ach.achieved) {
    dateEl.textContent = '📅 ' + dateStr;
    dateEl.style.display = 'inline';
  } else {
    dateEl.style.display = 'none';
  }

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Bloquear scroll del fondo
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}