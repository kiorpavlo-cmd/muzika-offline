const $ = (selector, root = document) => root.querySelector(selector);
const content = $('#content');
const audio = $('#audio-element');

const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  radio: '<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.5 10.5 0 0 0 0 15M19.5 4.5a10.5 10.5 0 0 1 0 15"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/>',
  library: '<path d="M6 5h12M4 9h16M5 13h14v7H5z"/><path d="M9 3h6"/>',
  search: '<circle cx="10.8" cy="10.8" r="7.1"/><path d="m16 16 5 5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="M5 5v14l10-7zM19 5v14" fill="currentColor"/>',
  play: '<path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h4v14H7zM15 5h4v14h-4z" fill="currentColor" stroke="none"/>',
  shuffle: '<path d="m16 3 4 4-4 4M4 7h3c5 0 5 10 10 10h3M16 14l4 3-4 4M4 17h3c1.3 0 2.2-.8 3-1.8M14 8c.8-.7 1.7-1 3-1"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>',
  artist: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/>',
  album: '<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M7 3h10M9 1h6"/>',
  playlist: '<path d="M4 6h11M4 12h11M4 18h7"/><path d="M18 14v6a2 2 0 1 1-2-2h2V9l5-1v8"/>',
  download: '<circle cx="12" cy="12" r="9"/><path d="M12 6v10m-4-4 4 4 4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" fill="currentColor" stroke="none"/>'
};

const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || ''}</svg>`;

const albums = [
  { id: 'armiya', title: 'А.Р.М.И.Я', artist: 'А.Р.М.И.Я', art: 'mono', kind: 'album' },
  { id: 'astudio', title: 'Улетаю', artist: "A'Студио", art: 'silver', kind: 'album' },
  { id: 'sky', title: 'Небо в клетку', artist: 'Алексей Марковников', art: 'blue', kind: 'album' },
  { id: 'angels', title: 'А мы не ангелы, парень', artist: 'Алексей Пономарёв', art: 'paper', kind: 'album' },
  { id: 'date', title: 'Первое свидание', artist: 'алёна швец.', art: 'rose', kind: 'album' },
  { id: 'dream', title: 'Зимний сон', artist: 'Алсу', art: 'gold', kind: 'album' },
  { id: 'respect', title: 'Там', artist: 'Антиреспект', art: 'night', kind: 'album' },
  { id: 'kiss', title: 'Kiss You', artist: 'Serebro', art: 'coast', kind: 'album' },
  { id: 'dolls', title: 'Магазин игрушек для взрослых', artist: 'Кис-кис', art: 'comic', kind: 'album' },
  { id: 'angel-single', title: 'ангел-хранитель — Single', artist: 'я про рок', art: 'halo', kind: 'album' },
  { id: 'everyday', title: 'Every Single Day', artist: 'Benny Benassi & Matt Sassari', art: 'concert', kind: 'album' },
  { id: 'radio-mix', title: 'Станція користувача', artist: 'Підібрано для вас', art: 'neon', kind: 'playlist' }
];

const tracks = [
  { id: 't1', title: 'Вызываю на бой', artist: 'А.Р.М.И.Я', album: 'А.Р.М.И.Я', art: 'mono', favorite: true },
  { id: 't2', title: 'Улетаю', artist: "A'Студио", album: 'Улетаю', art: 'silver' },
  { id: 't3', title: '2000 баксов', artist: 'Алексей Марковников', album: 'Небо в клетку', art: 'blue' },
  { id: 't4', title: 'А мы не ангелы, парень', artist: 'Алексей Пономарёв', album: 'А мы не ангелы, парень', art: 'paper' },
  { id: 't5', title: 'Первое свидание', artist: 'алёна швец.', album: 'Первое свидание', art: 'rose' },
  { id: 't6', title: 'Зимний сон', artist: 'Алсу', album: 'Зимний сон', art: 'gold' },
  { id: 't7', title: 'Ні я не ту кохав', artist: 'Анатолій Говорадло', album: 'Найкраще', art: 'portrait' },
  { id: 't8', title: 'Там', artist: 'Антиреспект', album: 'Там', art: 'night', favorite: true },
  { id: 't9', title: 'Kiss You', artist: 'Serebro', album: 'Kiss You', art: 'coast' },
  { id: 't10', title: 'Без любви', artist: 'Serebro', album: 'Без любви', art: 'violet' },
  { id: 't11', title: 'Почему же', artist: 'DJ Дождик', album: 'The Best', art: 'cassette' },
  { id: 't12', title: 'Та4то', artist: 'Бумбокс', album: 'III', art: 'minimal' },
  { id: 't13', title: 'ангел-хранитель', artist: 'я про рок', album: 'ангел-хранитель — Single', art: 'halo' },
  { id: 't14', title: 'Every Single Day', artist: 'Benny Benassi & Matt Sassari', album: 'Every Single Day', art: 'concert' }
];

const artists = [...new Map(tracks.map((track) => [track.artist, {
  id: track.artist,
  title: track.artist,
  album: track.album,
  art: track.art,
  kind: 'artist'
}])).values()];

const categoryInfo = {
  playlists: ['Підбірки', 'playlist'],
  artists: ['Виконавці', 'artist'],
  albums: ['Альбоми', 'album'],
  songs: ['Пісні', 'music'],
  downloaded: ['Викачано', 'download']
};

const state = {
  tab: 'home',
  screen: { type: 'tab', tab: 'home' },
  screenStack: [],
  searchText: '',
  searchScope: 'catalog',
  recentSearches: JSON.parse(localStorage.getItem('muzika-searches') || '[]'),
  favorites: JSON.parse(localStorage.getItem('muzika-favorites') || '["t1","t8"]'),
  localTracks: [],
  currentTrackId: 't2',
  isPlaying: false,
  toastTimer: null
};

const database = {
  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('muzika-library', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async all() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('tracks', 'readonly').objectStore('tracks').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async add(track) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('tracks', 'readwrite').objectStore('tracks').add(track);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

function safeText(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function artMarkup(art, label, extra = '') {
  const readable = safeText(label || '♫');
  return `<div class="artwork artwork--${safeText(art || 'local')} ${extra}" aria-label="${readable}"><span class="artwork-mark">${art === 'mono' ? 'A.R.M.' : art === 'silver' ? 'A’STUDIO' : art === 'night' ? 'TAM' : art === 'halo' ? '◌' : art === 'coast' ? 'KISS' : '♫'}</span><span class="artwork-title">${readable}</span><span class="artwork-glow"></span></div>`;
}

function currentTrack() {
  return [...tracks, ...state.localTracks].find((track) => track.id === state.currentTrackId) || tracks[1];
}

function allTracks() {
  return [...tracks, ...state.localTracks];
}

function albumCards(items, compact = false) {
  return `<div class="album-strip${compact ? ' album-strip--compact' : ''}">${items.map((item) => `<button class="album-card" data-action="open-item" data-kind="${item.kind}" data-id="${safeText(item.id)}">${artMarkup(item.art, item.title)}<span class="album-title">${safeText(item.title)}</span><span class="album-subtitle">${safeText(item.artist)}</span></button>`).join('')}</div>`;
}

function songRow(track, index, options = {}) {
  const favorite = state.favorites.includes(track.id);
  const playing = state.currentTrackId === track.id && state.isPlaying;
  return `<div class="song-row" data-song-index="${index}">
    ${artMarkup(track.art, track.album, 'song-art')}
    <button class="song-main" data-action="play-track" data-id="${safeText(track.id)}" aria-label="Відтворити ${safeText(track.title)}">
      <span class="song-title">${safeText(track.title)}</span><span class="song-artist">${safeText(track.artist)}${options.showAlbum ? ` · ${safeText(track.album)}` : ''}</span>
    </button>
    <span class="song-indicators">${favorite ? '<span class="favorite-mark">★</span>' : ''}${playing ? '<span class="playing-bars"><i></i><i></i><i></i></span>' : ''}</span>
    <button class="icon-button song-more" data-action="song-menu" data-id="${safeText(track.id)}" aria-label="Додаткові дії">${icon('more')}</button>
  </div>`;
}

function sectionHeading(title, action = '', href = '') {
  return `<div class="section-heading"><h2>${title}</h2>${action ? `<button class="text-action" data-action="${href}">${action}</button>` : ''}</div>`;
}

function renderHome() {
  const recently = [albums[7], albums[8], albums[0], albums[3], albums[4]];
  return `<header class="page-header page-header--home"><h1>Домівка</h1><button class="profile-button" data-action="settings" aria-label="Профіль">ПК</button></header>
    ${sectionHeading('Найпопулярніше для вас')}
    <div class="featured-strip">
      <button class="feature-card feature-card--favorite" data-action="open-item" data-kind="playlist" data-id="favorites">
        <div class="favorite-art">${icon('star')}</div><span class="feature-kicker">Створено вами</span><strong>Улюблені пісні</strong><span>Усі пісні, що стали вашими улюбленими</span>
      </button>
      <button class="feature-card feature-card--neon" data-action="open-item" data-kind="playlist" data-id="radio-mix"><span class="feature-kicker">Підібрано для вас</span><strong>Станція користувача</strong><span>Музика, яка пасує саме вам</span></button>
    </div>
    ${sectionHeading('Недавно прослухані', 'Усі', 'recent')}
    ${albumCards(recently)}
    ${sectionHeading('Пісні, які можуть сподобатися')}
    <div class="song-list">${[tracks[8], tracks[10], tracks[4]].map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>
    <div class="offline-note">${icon('download')}<span>Медіатека доступна офлайн</span></div>`;
}

function renderNew() {
  return `<header class="page-header"><h1>Новинки</h1><button class="profile-button" data-action="settings" aria-label="Профіль">ПК</button></header>
    <section class="editorial-hero"><span class="editorial-kicker">ПІСНЯ, ЯКОЇ НАМ БРАКУВАЛО</span><h2>Музика, що лишається з тобою.</h2>${artMarkup('rose', 'Нові враження', 'hero-art')}</section>
    ${sectionHeading('Найкраще за 2026 рік', '›', 'all-albums')}${albumCards([albums[10], albums[4], albums[8], albums[1]])}
    ${sectionHeading('Нещодавно додані')}${albumCards([albums[1], albums[7], albums[9], albums[2]])}`;
}

function renderRadio() {
  const stations = [
    ['ONE', 'Станція одного'], ['HITS', 'Головні хіти'], ['COUNTRY', 'Кантрі'],
    ['MÚSICA', 'Музика світу'], ['club', 'Клубна'], ['Chill', 'Для відпочинку']
  ];
  return `<header class="page-header"><h1>Радіо</h1><button class="profile-button" data-action="settings" aria-label="Профіль">ПК</button></header>
    <div class="station-grid">${stations.map(([word, title], index) => `<button class="station-card station-card--${index}" data-action="station" data-title="${title}"><span>${word}</span><small>♫ radio</small></button>`).join('')}</div>
    ${sectionHeading('Наживо')}
    <button class="live-card" data-action="station" data-title="Музика наживо"><div class="live-art">${artMarkup('blue', 'LIVE')}</div><div class="live-copy"><span>ЗАРАЗ В ЕФІРІ</span><strong>Музика без пауз</strong><small>Слухайте збережені треки навіть без мережі</small></div></button>
    ${sectionHeading('Ваші станції')}${albumCards([albums[11], albums[4], albums[0]])}`;
}

function renderLibrary() {
  const categories = Object.entries(categoryInfo).map(([key, [title, iconName]]) => `<button class="category-row" data-action="category" data-category="${key}">${icon(iconName)}<span>${title}</span>${icon('back', 'chevron')}</button>`).join('');
  return `<header class="page-header page-header--library"><h1>Медіатека</h1><div class="header-actions"><button class="header-pill" data-action="import" aria-label="Додати музику">${icon('plus')}<span class="pill-divider"></span>${icon('menu')}</button><button class="profile-button" data-action="settings" aria-label="Профіль">ПК</button></div></header>
    <div class="category-list">${categories}</div>
    ${sectionHeading('Недавно додані', 'Усі', 'all-albums')}${albumCards([albums[10], albums[9], albums[7], albums[8]])}
    <div class="library-footnote">${icon('download')}<span>Додайте свої аудіофайли — вони збережуться на цьому пристрої.</span><button data-action="import">Додати</button></div>`;
}

function renderSearch() {
  return `<header class="search-header"><label class="search-box">${icon('search')}<input id="search-input" type="search" placeholder="Виконавці, пісні, альбоми" value="${safeText(state.searchText)}" autocomplete="off">${icon('mic')}</label><button class="search-close" data-action="close-search" aria-label="Закрити">${icon('close')}</button></header>
    <div class="search-scope"><button data-action="search-scope" data-scope="catalog" class="${state.searchScope === 'catalog' ? 'active' : ''}">Каталог</button><button data-action="search-scope" data-scope="library" class="${state.searchScope === 'library' ? 'active' : ''}">Медіатека</button></div>
    <div id="search-body">${renderSearchBody()}</div>`;
}

function renderSearchBody() {
  const matches = state.searchText.trim() ? allTracks().filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(state.searchText.toLowerCase())) : [];
  const local = state.searchScope === 'library' ? matches.filter((track) => track.local) : matches;
  return state.searchText.trim()
    ? `<div class="search-results-label">${local.length ? 'Результати' : 'Нічого не знайдено'}</div><div class="song-list">${local.map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>`
    : `<div class="section-heading"><h2>Недавні пошуки</h2><button class="text-action text-action--red" data-action="clear-search">Очистити</button></div>
      <div class="recent-searches">${(state.recentSearches.length ? state.recentSearches : ['Улетаю', 'Улюблені пісні', 'Алсу']).map((term) => `<button data-action="recent-search" data-term="${safeText(term)}">${icon('search')}<span>${safeText(term)}</span>${icon('more')}</button>`).join('')}</div>`;
}

function renderItemScreen() {
  const { kind, id } = state.screen;
  const item = [...albums, ...artists].find((value) => value.id === id) || { id, title: id === 'favorites' ? 'Улюблені пісні' : id === 'recent' ? 'Недавно прослухані' : 'Музика', artist: 'Ваша медіатека', art: id === 'favorites' ? 'favorite' : 'neon' };
  let heading = item.title;
  let list = [];
  if (kind === 'artist') list = allTracks().filter((track) => track.artist === id);
  else if (kind === 'album') list = allTracks().filter((track) => track.album === item.title || track.artist === item.artist);
  else if (id === 'favorites') list = allTracks().filter((track) => state.favorites.includes(track.id));
  else if (id === 'recent') list = [tracks[1], tracks[8], tracks[10], tracks[4]];
  else list = tracks.slice(0, 6);
  return `<header class="subpage-top"><button class="round-back" data-action="back">${icon('back')}</button><button class="header-pill" data-action="song-menu" data-id="${safeText(id)}">${icon('menu')}<span class="pill-divider"></span>${icon('more')}</button></header>
    <section class="detail-heading">${kind === 'artist' ? artMarkup(item.art, item.title, 'detail-art detail-art--artist') : ''}<h1>${safeText(heading)}</h1>${kind !== 'artist' ? `<p>${safeText(item.artist || 'Ваша медіатека')}</p>` : ''}</section>
    <div class="detail-actions"><button data-action="play-list" data-id="${safeText(id)}" data-kind="${safeText(kind)}">${icon('play')} Відтворити</button><button data-action="shuffle-list" data-id="${safeText(id)}" data-kind="${safeText(kind)}">${icon('shuffle')} Тасувати</button></div>
    ${kind === 'artist' ? `<h2 class="letter-heading">Популярні пісні</h2>` : `<h2 class="letter-heading">${kind === 'playlist' ? 'Пісні' : 'A'}</h2>`}
    <div class="song-list song-list--detail">${list.map((track, i) => songRow(track, i, { showAlbum: false })).join('') || '<div class="empty-state">Тут поки немає пісень. Додайте власні аудіофайли, щоб слухати їх офлайн.</div>'}</div>`;
}

function renderCategory() {
  const { category } = state.screen;
  const [title, iconName] = categoryInfo[category] || ['Медіатека', 'music'];
  let rows = '';
  if (category === 'playlists') {
    rows = `<button class="entity-row" data-action="open-item" data-kind="playlist" data-id="favorites">${artMarkup('favorite', 'Улюблені пісні', 'entity-art')}<span>Улюблені пісні</span>${icon('back', 'chevron')}</button>`;
  } else if (category === 'artists') {
    const sorted = [...artists].sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    rows = `<div class="alphabet" aria-hidden="true">${'АБВГДЕЄЖЗИІКЛМНОПРСТУФХЦЧШЩЬЮЯ#'.split('').map((char) => `<span>${char}</span>`).join('')}</div>${sorted.map((artist) => `<button class="entity-row" data-action="open-item" data-kind="artist" data-id="${safeText(artist.id)}">${artMarkup(artist.art, artist.title, 'entity-art entity-art--round')}<span>${safeText(artist.title)}</span>${icon('back', 'chevron')}</button>`).join('')}`;
  } else if (category === 'albums') {
    rows = `<div class="album-grid">${albums.slice(0, 10).map((album) => `<button class="album-card" data-action="open-item" data-kind="album" data-id="${safeText(album.id)}">${artMarkup(album.art, album.title)}<span class="album-title">${safeText(album.title)}</span><span class="album-subtitle">${safeText(album.artist)}</span></button>`).join('')}</div>`;
  } else {
    const list = category === 'downloaded' ? allTracks().filter((track) => track.local) : allTracks();
    rows = `<div class="song-list">${list.length ? list.map((track, i) => songRow(track, i, { showAlbum: category === 'downloaded' })).join('') : `<div class="empty-state">${category === 'downloaded' ? 'Тут з’явиться ваша музика, додана на пристрої.' : 'Додайте аудіофайли, щоб бачити свою медіатеку тут.'}</div>`}</div>`;
  }
  return `<header class="subpage-top"><button class="round-back" data-action="back">${icon('back')}</button>${category === 'songs' || category === 'albums' ? `<button class="header-pill" data-action="song-menu" data-id="${category}">${icon('menu')}<span class="pill-divider"></span>${icon('more')}</button>` : ''}</header>
    <h1 class="category-title">${title}</h1>${category === 'songs' || category === 'albums' ? `<div class="detail-actions"><button data-action="play-list" data-category="${category}">${icon('play')} Відтворити</button><button data-action="shuffle-list" data-category="${category}">${icon('shuffle')} Тасувати</button></div>` : ''}
    <div class="category-content">${rows}</div>`;
}

function renderSettings() {
  const online = navigator.onLine;
  return `<header class="subpage-top"><button class="round-back" data-action="back">${icon('back')}</button><h2>Налаштування</h2><span></span></header>
    <div class="settings-profile"><div class="profile-button profile-button--large">ПК</div><div><strong>Моя медіатека</strong><small>Зберігається на цьому пристрої</small></div></div>
    <div class="settings-group"><div class="settings-row"><span>Стан мережі</span><strong class="${online ? 'online-label' : 'offline-label'}">${online ? 'Підключено' : 'Офлайн'}</strong></div><div class="settings-row"><span>Оновлення застосунку</span><button data-action="check-updates">Перевірити</button></div><div class="settings-row"><span>Офлайн-аудіо</span><strong>${state.localTracks.length} пісень</strong></div></div>
    <button class="import-panel" data-action="import">${icon('plus')}<span><strong>Додати аудіофайли</strong><small>Файли залишаються лише на вашому пристрої</small></span>${icon('back', 'chevron')}</button>
    <a class="import-panel profile-download" href="./Muzika.mobileconfig">${icon('home')}<span><strong>Додати ярлик на iPhone або iPad</strong><small>Завантажити профіль вебзастосунку</small></span>${icon('back', 'chevron')}</a>
    <p class="settings-note">Оновлення інтерфейсу завантажуються автоматично під час запуску, коли є інтернет. Збережена музика та сам застосунок доступні офлайн.</p>`;
}

function renderScreen() {
  switch (state.screen.type) {
    case 'category': return renderCategory();
    case 'item': return renderItemScreen();
    case 'settings': return renderSettings();
    case 'tab':
    default:
      return ({ home: renderHome, new: renderNew, radio: renderRadio, library: renderLibrary, search: renderSearch }[state.screen.tab] || renderHome)();
  }
}

function renderTabBar() {
  const tabs = [
    ['home', 'Домівка', 'home'], ['new', 'Новинки', 'grid'], ['radio', 'Радіо', 'radio'], ['library', 'Медіатека', 'music'], ['search', 'Пошук', 'search']
  ];
  $('#tab-bar').innerHTML = tabs.map(([id, label, glyph]) => `<button class="tab-button ${state.tab === id ? 'active' : ''}" data-tab="${id}">${icon(glyph)}<span>${label}</span></button>`).join('');
}

function renderPlayer() {
  const track = currentTrack();
  $('#mini-player').innerHTML = `<button class="player-track" data-action="now-playing">${artMarkup(track.art, track.album, 'player-art')}<span class="player-copy"><strong>${safeText(track.title)}</strong><small>${safeText(track.artist)}</small></span></button><button class="player-control" data-action="toggle-play" aria-label="${state.isPlaying ? 'Пауза' : 'Відтворити'}">${icon(state.isPlaying ? 'pause' : 'play')}</button><button class="player-control player-next" data-action="next-track" aria-label="Наступна пісня">${icon('next')}</button>`;
}

function render() {
  content.innerHTML = renderScreen();
  renderTabBar();
  renderPlayer();
  content.scrollTop = 0;
  if (state.screen.type === 'tab' && state.screen.tab === 'search' && state.searchText) {
    const input = $('#search-input');
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(input.value.length, input.value.length);
  }
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function rememberSearch(term) {
  if (!term.trim()) return;
  state.recentSearches = [term.trim(), ...state.recentSearches.filter((item) => item.toLowerCase() !== term.trim().toLowerCase())].slice(0, 8);
  localStorage.setItem('muzika-searches', JSON.stringify(state.recentSearches));
}

function navigateTab(tab) {
  state.tab = tab;
  state.screenStack = [];
  state.screen = { type: 'tab', tab };
  render();
}

function pushScreen(screen) {
  state.screenStack.push(state.screen);
  state.screen = screen;
  render();
}

async function playTrack(track) {
  if (!track) return;
  if (!track.local) {
    notify('Додайте свій аудіофайл, щоб слухати його офлайн.');
    return;
  }
  if (state.currentTrackId === track.id && state.isPlaying) {
    audio.pause();
    state.isPlaying = false;
    renderPlayer();
    return;
  }
  state.currentTrackId = track.id;
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = URL.createObjectURL(track.file);
  audio.src = state.audioUrl;
  try {
    await audio.play();
    state.isPlaying = true;
    renderPlayer();
  } catch {
    state.isPlaying = false;
    notify('Не вдалося відтворити цей файл.');
    renderPlayer();
  }
}

async function importFiles(files) {
  const audioFiles = [...files].filter((file) => file.type.startsWith('audio/'));
  if (!audioFiles.length) return notify('Оберіть аудіофайл.');
  try {
    for (const file of audioFiles) {
      const name = file.name.replace(/\.[^.]+$/, '');
      const pieces = name.split(' — ');
      const artist = pieces.length > 1 ? pieces[0] : 'Моя медіатека';
      const title = pieces.length > 1 ? pieces.slice(1).join(' — ') : name;
      const id = `local-${crypto.randomUUID()}`;
      const track = { id, title, artist, album: 'Додані аудіофайли', art: ['local', 'violet', 'blue', 'rose'][state.localTracks.length % 4], local: true, file };
      await database.add(track);
      state.localTracks.push(track);
    }
    notify(`Додано пісень: ${audioFiles.length}`);
    render();
  } catch {
    notify('Не вдалося зберегти файли. Перевірте вільне місце на пристрої.');
  }
}

async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) return notify('Автономний режим недоступний у цьому браузері.');
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return notify('Оновлення перевірятимуться автоматично під час запуску онлайн.');
    await registration.update();
    notify(navigator.onLine ? 'Перевірку оновлень виконано.' : 'Ви офлайн — працює збережена версія.');
  } catch {
    notify('Немає мережі — продовжуємо збережену версію.');
  }
}

document.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) return navigateTab(tab.dataset.tab);
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, kind, category, scope, term, title } = button.dataset;

  switch (action) {
    case 'category': pushScreen({ type: 'category', category }); break;
    case 'open-item': pushScreen({ type: 'item', kind, id }); break;
    case 'back': {
      state.screen = state.screenStack.pop() || { type: 'tab', tab: 'library' };
      if (state.screen.type === 'tab') state.tab = state.screen.tab;
      render();
      break;
    }
    case 'settings': pushScreen({ type: 'settings' }); break;
    case 'import': $('#audio-import').click(); break;
    case 'play-track': playTrack(allTracks().find((track) => track.id === id)); break;
    case 'toggle-play': playTrack(currentTrack()); break;
    case 'next-track': {
      const list = allTracks().filter((track) => track.local);
      if (!list.length) return notify('Спершу додайте аудіофайли.');
      const index = list.findIndex((track) => track.id === state.currentTrackId);
      await playTrack(list[(index + 1) % list.length] || list[0]);
      break;
    }
    case 'play-list': {
      let list = [];
      if (button.dataset.category === 'downloaded') list = allTracks().filter((track) => track.local);
      else if (button.dataset.kind === 'artist') list = allTracks().filter((track) => track.artist === id);
      else if (button.dataset.kind === 'album') {
        const album = albums.find((item) => item.id === id);
        list = allTracks().filter((track) => track.album === album?.title);
      } else if (id === 'favorites') list = allTracks().filter((track) => state.favorites.includes(track.id));
      else list = allTracks();
      await playTrack(list.find((track) => track.local));
      break;
    }
    case 'shuffle-list': {
      let list = allTracks().filter((track) => track.local);
      if (button.dataset.kind === 'artist') list = list.filter((track) => track.artist === id);
      if (button.dataset.kind === 'album') {
        const album = albums.find((item) => item.id === id);
        list = list.filter((track) => track.album === album?.title);
      }
      if (id === 'favorites') list = list.filter((track) => state.favorites.includes(track.id));
      const shuffled = list[Math.floor(Math.random() * list.length)];
      await playTrack(shuffled);
      break;
    }
    case 'clear-search': state.recentSearches = []; localStorage.removeItem('muzika-searches'); render(); break;
    case 'close-search': state.searchText = ''; state.tab = 'home'; state.screenStack = []; state.screen = { type: 'tab', tab: 'home' }; render(); break;
    case 'search-scope': state.searchScope = scope; render(); break;
    case 'recent-search': state.searchText = term; render(); break;
    case 'song-menu': {
      const track = allTracks().find((item) => item.id === id);
      if (track) {
        if (state.favorites.includes(track.id)) {
          state.favorites = state.favorites.filter((favorite) => favorite !== track.id);
          notify('Вилучено з улюблених.');
        } else {
          state.favorites.push(track.id);
          notify('Додано до улюблених.');
        }
        localStorage.setItem('muzika-favorites', JSON.stringify(state.favorites));
        render();
      } else notify('Додайте власний аудіофайл у медіатеку.');
      break;
    }
    case 'station': notify(`«${title}» — радіостанції з’являться після підключення онлайн-каталогу.`); break;
    case 'recent': pushScreen({ type: 'item', kind: 'playlist', id: 'recent' }); break;
    case 'all-albums': pushScreen({ type: 'category', category: 'albums' }); break;
    case 'now-playing': {
      if (currentTrack().local) notify('Зараз відтворюється ваша офлайн-пісня.');
      else notify('Додайте власні аудіофайли, щоб слухати їх офлайн.');
      break;
    }
    case 'check-updates': checkForUpdates(); break;
  }
});

content.addEventListener('input', (event) => {
  if (event.target.id !== 'search-input') return;
  state.searchText = event.target.value;
  $('#search-body').innerHTML = renderSearchBody();
});

content.addEventListener('keydown', (event) => {
  if (event.target.id === 'search-input' && event.key === 'Enter') {
    rememberSearch(state.searchText);
    event.target.blur();
  }
});

$('#audio-import').addEventListener('change', (event) => {
  importFiles(event.target.files || []);
  event.target.value = '';
});

audio.addEventListener('ended', async () => {
  const list = allTracks().filter((track) => track.local);
  const index = list.findIndex((track) => track.id === state.currentTrackId);
  await playTrack(list[(index + 1) % list.length] || list[0]);
});

window.addEventListener('online', () => {
  notify('З’єднання відновлено. Перевіряємо оновлення…');
  startServiceWorkerUpdateCheck();
});
window.addEventListener('offline', () => notify('Офлайн-режим. Збережена медіатека доступна.'));

async function startServiceWorkerUpdateCheck() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    let reloadScheduled = false;
    const shouldReload = () => {
      if (!hadController || reloadScheduled) return;
      reloadScheduled = true;
      setTimeout(() => location.reload(), 250);
    };
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) shouldReload();
      });
    });
    if (registration.installing) {
      registration.installing.addEventListener('statechange', (event) => {
        if (event.target.state === 'installed' && navigator.serviceWorker.controller) shouldReload();
      });
    }
    await registration.update().catch(() => {});
    if (registration.waiting && hadController) shouldReload();
  } catch {
    // The cached shell remains usable when the network or service worker is unavailable.
  }
}

async function initialize() {
  try { state.localTracks = await database.all(); } catch { state.localTracks = []; }
  render();
  startServiceWorkerUpdateCheck();
}

initialize();
