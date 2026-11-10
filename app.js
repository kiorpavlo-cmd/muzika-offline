const $ = (selector, root = document) => root.querySelector(selector);
const content = $('#content');
const audio = $('#audio-element');

const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  radio: '<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.5 10.5 0 0 0 0 15M19.5 4.5a10.5 10.5 0 0 1 0 15"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7m2.8-9.8a9 9 0 0 1 0 12.6"/>',
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
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" fill="currentColor" stroke="none"/>',
  pin: '<path d="M16 3 8 11l-3-1-2 2 6 3 3 6 2-2-1-3 8-8-5-5Z"/><path d="m3 21 7-7"/>',
  playlistAdd: '<path d="M4 6h11M4 12h11M4 18h7"/><path d="M19 3v8m-4-4h8"/>',
  queue: '<path d="M4 6h12M4 12h12M4 18h8"/><path d="m17 16 5 3-5 3z" fill="currentColor" stroke="none"/>',
  albumFile: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M12 8v8"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>'
};

const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || ''}</svg>`;

const categoryInfo = {
  playlists: ['Підбірки', 'playlist'],
  artists: ['Виконавці', 'artist'],
  albums: ['Альбоми', 'album'],
  songs: ['Пісні', 'music'],
  downloaded: ['Викачано', 'download']
};
const musicAlphabet = [...'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ', '#'];
const latinInitials = { A: 'А', B: 'Б', C: 'С', D: 'Д', E: 'Е', F: 'Ф', G: 'Г', H: 'Х', I: 'І', J: 'Й', K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', Q: 'К', R: 'Р', S: 'С', T: 'Т', U: 'У', V: 'В', W: 'В', X: 'К', Y: 'Й', Z: 'З' };
const musicCollator = new Intl.Collator('uk', { sensitivity: 'base', ignorePunctuation: true });

const state = {
  tab: 'home',
  screen: { type: 'tab', tab: 'home' },
  screenStack: [],
  searchText: '',
  recentSearches: JSON.parse(localStorage.getItem('muzika-searches') || '[]'),
  recentTrackIds: JSON.parse(localStorage.getItem('muzika-recent-tracks') || '[]'),
  favorites: JSON.parse(localStorage.getItem('muzika-favorites') || '[]'),
  pinnedSongs: JSON.parse(localStorage.getItem('muzika-pinned-songs') || '[]'),
  queue: [],
  googleProfile: (() => {
    try { return JSON.parse(localStorage.getItem('muzika-google-profile') || 'null'); } catch { return null; }
  })(),
  localTracks: [],
  currentTrackId: '',
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
  },
  async remove(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('tracks', 'readwrite').objectStore('tracks').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

function safeText(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function profilePictureUrl(profile) {
  return typeof profile?.picture === 'string' && profile.picture.startsWith('https://') ? profile.picture : '';
}

function profileAvatarContents(profile = state.googleProfile) {
  if (!profile) return '?';
  const picture = profilePictureUrl(profile);
  if (picture) return `<img class="profile-photo" src="${safeText(picture)}" alt="">`;
  const name = String(profile.name || profile.email || '?').trim();
  return safeText(name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?');
}

function profileButtonMarkup() {
  const profile = state.googleProfile;
  const label = profile ? `Профіль: ${safeText(profile.name || profile.email || 'Google')}` : 'Увійти через Google';
  return `<button class="profile-button ${profilePictureUrl(profile) ? 'profile-button--photo' : ''}" data-action="settings" aria-label="${label}">${profileAvatarContents(profile)}</button>`;
}

function artMarkup(art, label, extra = '') {
  return `<div class="artwork artwork--local ${extra}" aria-hidden="true">${icon('music', 'artwork-music')}</div>`;
}

function currentTrack() {
  return allTracks().find((track) => track.id === state.currentTrackId) || allTracks()[0] || null;
}

function allTracks() {
  return state.localTracks;
}

function libraryAlbums() {
  return [...new Map(allTracks().map((track) => [track.album || 'Додані аудіофайли', {
    id: track.album || 'Додані аудіофайли', title: track.album || 'Додані аудіофайли',
    artist: track.artist || 'Невідомий виконавець', art: 'local', kind: 'album'
  }])).values()];
}

function libraryArtists() {
  return [...new Map(allTracks().map((track) => [track.artist || 'Невідомий виконавець', {
    id: track.artist || 'Невідомий виконавець', title: track.artist || 'Невідомий виконавець',
    art: 'local', kind: 'artist'
  }])).values()];
}

function musicLetter(value = '') {
  const initial = String(value).trim().charAt(0).toLocaleUpperCase('uk');
  if (latinInitials[initial]) return latinInitials[initial];
  return musicAlphabet.includes(initial) ? initial : '#';
}

function sortTracksByArtist(list) {
  return [...list].sort((first, second) => {
    const firstLetter = musicLetter(first.artist);
    const secondLetter = musicLetter(second.artist);
    const letterOrder = musicAlphabet.indexOf(firstLetter) - musicAlphabet.indexOf(secondLetter);
    if (letterOrder) return letterOrder;
    const firstArtist = String(first.artist || '').trim().replace(/^[A-Za-z]/, (letter) => latinInitials[letter.toUpperCase()] || letter);
    const secondArtist = String(second.artist || '').trim().replace(/^[A-Za-z]/, (letter) => latinInitials[letter.toUpperCase()] || letter);
    return musicCollator.compare(firstArtist, secondArtist) || musicCollator.compare(first.title, second.title);
  });
}

function prioritizePinned(list) {
  return [...list].sort((a, b) => Number(state.pinnedSongs.includes(b.id)) - Number(state.pinnedSongs.includes(a.id)));
}

function songRow(track, index, options = {}) {
  const favorite = state.favorites.includes(track.id);
  const pinned = state.pinnedSongs.includes(track.id);
  const playing = state.currentTrackId === track.id && state.isPlaying;
  return `<div class="song-row" data-song-index="${index}">
    ${options.leadingFavorite ? `<span class="song-leading-favorite" aria-hidden="true">${favorite ? '★' : ''}</span>` : ''}
    ${artMarkup(track.art, track.album, 'song-art')}
    <button class="song-main" data-action="play-track" data-id="${safeText(track.id)}" aria-label="Відтворити ${safeText(track.title)}">
      <span class="song-title">${safeText(track.title)}</span><span class="song-artist">${safeText(track.artist)}${options.showAlbum ? ` · ${safeText(track.album)}` : ''}</span>
    </button>
    <span class="song-indicators">${favorite && !options.leadingFavorite ? '<span class="favorite-mark">★</span>' : ''}${pinned && !options.hidePinned ? icon('pin', 'pin-mark') : ''}${playing ? '<span class="playing-bars"><i></i><i></i><i></i></span>' : ''}</span>
    <button class="icon-button song-more" data-action="song-menu" data-id="${safeText(track.id)}" aria-label="Додаткові дії">${icon('more')}</button>
  </div>`;
}

function closeSongMenu() {
  $('#modal-root').innerHTML = '';
}

function openSongMenu(track) {
  const favorite = state.favorites.includes(track.id);
  const pinned = state.pinnedSongs.includes(track.id);
  const root = $('#modal-root');
  root.innerHTML = `<div id="song-menu-backdrop" class="action-modal">
    <section class="action-sheet" role="dialog" aria-modal="true" aria-label="Дії з піснею">
      <div class="action-track-head">${artMarkup(track.art, track.album, 'action-art')}<button class="action-feature" data-action="toggle-favorite" data-id="${safeText(track.id)}">${icon('star')}<span>${favorite ? 'Вилучити з улюблених' : 'Додати до улюблених'}</span></button></div>
      <button class="song-action-row" data-action="toggle-pin" data-id="${safeText(track.id)}">${icon('pin')}<span>${pinned ? 'Відкріпити пісню' : 'Закріпити пісню'}</span></button>
      <button class="song-action-row" data-action="open-playlist-menu" data-id="${safeText(track.id)}">${icon('playlistAdd')}<span>Додати до підбірки</span></button>
      <button class="song-action-row" data-action="play-next" data-id="${safeText(track.id)}">${icon('queue')}<span>Відтворити далі</span></button>
      <button class="song-action-row song-action-row--album" data-action="open-track-album" data-id="${safeText(track.id)}">${icon('albumFile')}<span>Перейти до альбому<small>${safeText(track.album)}</small></span></button>
      <button class="song-action-row song-action-row--danger" data-action="delete-track" data-id="${safeText(track.id)}">${icon('trash')}<span>Видалити з медіатеки</span></button>
    </section>
  </div>`;
  root.querySelector('#song-menu-backdrop').addEventListener('click', (event) => {
    if (event.target.id === 'song-menu-backdrop') closeSongMenu();
  });
}

function openPlaylistMenu(track) {
  const root = $('#modal-root');
  root.innerHTML = `<div id="song-menu-backdrop" class="action-modal">
    <section class="action-sheet action-sheet--playlists" role="dialog" aria-modal="true" aria-labelledby="playlist-menu-title">
      <button class="action-back" data-action="back-to-song-menu" data-id="${safeText(track.id)}">${icon('back')}<span>Дії з піснею</span></button>
      <h2 id="playlist-menu-title">Додати до підбірки</h2>
      <button class="song-action-row" data-action="add-to-favorites" data-id="${safeText(track.id)}">${icon('star')}<span>Улюблені пісні</span></button>
    </section>
  </div>`;
  root.querySelector('#song-menu-backdrop').addEventListener('click', (event) => {
    if (event.target.id === 'song-menu-backdrop') closeSongMenu();
  });
}

function addToFavorites(trackId) {
  if (!state.favorites.includes(trackId)) {
    state.favorites.push(trackId);
    localStorage.setItem('muzika-favorites', JSON.stringify(state.favorites));
  }
  closeSongMenu();
  render();
  notify('Додано до підбірки «Улюблені пісні».');
}

function togglePinned(trackId) {
  state.pinnedSongs = state.pinnedSongs.includes(trackId)
    ? state.pinnedSongs.filter((id) => id !== trackId)
    : [...state.pinnedSongs, trackId];
  localStorage.setItem('muzika-pinned-songs', JSON.stringify(state.pinnedSongs));
  closeSongMenu();
  render();
  notify(state.pinnedSongs.includes(trackId) ? 'Пісню закріплено.' : 'Пісню відкріплено.');
}

function queueTrackNext(trackId) {
  state.queue = [trackId, ...state.queue.filter((id) => id !== trackId)];
  closeSongMenu();
  notify('Пісню додано до черги «Відтворити далі».');
}

async function playNextTrack() {
  const queuedId = state.queue.shift();
  const queuedTrack = queuedId && allTracks().find((track) => track.id === queuedId);
  if (queuedTrack) return playTrack(queuedTrack);
  const list = allTracks().filter((track) => track.local);
  if (!list.length) return notify('Спершу додайте аудіофайл у медіатеку.');
  const index = list.findIndex((track) => track.id === state.currentTrackId);
  await playTrack(list[(index + 1) % list.length] || list[0]);
}

async function playPreviousTrack() {
  if (currentTrack()?.local && audio.currentTime > 3) {
    audio.currentTime = 0;
    syncNowPlayingPlayback();
    return;
  }
  const list = allTracks().filter((track) => track.local);
  if (!list.length) return notify('Спершу додайте аудіофайл у медіатеку.');
  const index = list.findIndex((track) => track.id === state.currentTrackId);
  await playTrack(list[(index - 1 + list.length) % list.length]);
}

async function deleteTrackFromLibrary(trackId) {
  const track = allTracks().find((item) => item.id === trackId);
  if (!track) return closeSongMenu();
  try {
    await database.remove(trackId);
    state.localTracks = state.localTracks.filter((item) => item.id !== trackId);
    state.favorites = state.favorites.filter((id) => id !== trackId);
    state.pinnedSongs = state.pinnedSongs.filter((id) => id !== trackId);
    state.recentTrackIds = state.recentTrackIds.filter((id) => id !== trackId);
    state.queue = state.queue.filter((id) => id !== trackId);
    localStorage.setItem('muzika-favorites', JSON.stringify(state.favorites));
    localStorage.setItem('muzika-pinned-songs', JSON.stringify(state.pinnedSongs));
    localStorage.setItem('muzika-recent-tracks', JSON.stringify(state.recentTrackIds));
    if (state.currentTrackId === trackId) {
      audio.pause();
      audio.removeAttribute('src');
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
      state.audioUrl = null;
      state.currentTrackId = state.localTracks[0]?.id || allTracks()[0]?.id || '';
      state.isPlaying = false;
    }
    closeSongMenu();
    render();
    notify('Пісню видалено з медіатеки.');
  } catch {
    notify('Не вдалося видалити пісню. Спробуйте ще раз.');
  }
}

function sectionHeading(title, action = '', href = '') {
  return `<div class="section-heading"><h2>${title}</h2>${action ? `<button class="text-action" data-action="${href}">${action}</button>` : ''}</div>`;
}

function renderHome() {
  const recentlyPlayed = state.recentTrackIds.map((id) => allTracks().find((track) => track.id === id)).filter(Boolean);
  const recentlyAdded = [...allTracks()].reverse().slice(0, 8);
  const favoriteCount = allTracks().filter((track) => state.favorites.includes(track.id)).length;
  const favoritesSection = favoriteCount ? `${sectionHeading('Ваші підбірки')}<div class="featured-strip">
    <button class="feature-card feature-card--favorite" data-action="open-item" data-kind="playlist" data-id="favorites">
      <div class="favorite-art">${icon('star')}</div><span class="feature-kicker">Ваша медіатека</span><strong>Улюблені пісні</strong><span>${favoriteCount} ${favoriteCount === 1 ? 'пісня' : 'пісень'}</span>
    </button>
  </div>` : '';
  const recentSection = recentlyPlayed.length ? `${sectionHeading('Недавно прослухані', 'Усі', 'recent')}<div class="song-list">${recentlyPlayed.slice(0, 5).map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>` : '';
  const librarySection = recentlyAdded.length ? `${sectionHeading('Недавно додані')}<div class="song-list">${recentlyAdded.map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>` : `<div class="empty-state empty-state--home">${icon('music')}<strong>Ваша медіатека порожня</strong><span>Додайте аудіофайли з пристрою або Google Диска — вони збережуться для офлайн-прослуховування.</span><button class="empty-state-action" data-action="import">Додати аудіофайли</button></div>`;
  return `<header class="page-header page-header--home"><h1>Домівка</h1>${profileButtonMarkup()}</header>
    ${favoritesSection}${recentSection}${librarySection}`;
}

function renderNew() {
  return `<header class="page-header"><h1>Новинки</h1>${profileButtonMarkup()}</header>
    <div class="empty-state">Онлайн-каталог новинок не підключено.</div>`;
}

function renderRadio() {
  return `<header class="page-header"><h1>Радіо</h1>${profileButtonMarkup()}</header>
    <div class="empty-state">Радіостанції поки недоступні.</div>`;
}

function renderLibrary() {
  const categories = Object.entries(categoryInfo).map(([key, [title, iconName]]) => `<button class="category-row" data-action="category" data-category="${key}">${icon(iconName)}<span>${title}</span>${icon('back', 'chevron')}</button>`).join('');
  const added = [...allTracks()].reverse();
  return `<header class="page-header page-header--library"><h1>Медіатека</h1>${profileButtonMarkup()}</header>
    <div class="category-list">${categories}</div>
    ${added.length ? `${sectionHeading('Недавно додані', 'Усі', 'all-albums')}<div class="song-list">${added.slice(0, 8).map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>` : ''}
    <div class="library-footnote">${icon('download')}<span>Додайте свої аудіофайли — вони збережуться на цьому пристрої.</span><button data-action="import">Додати</button></div>`;
}

function renderSearch() {
  return `<header class="search-header"><label class="search-box">${icon('search')}<input id="search-input" type="search" placeholder="Виконавці, пісні, альбоми" value="${safeText(state.searchText)}" autocomplete="off">${icon('mic')}</label><button class="search-close" data-action="close-search" aria-label="Закрити">${icon('close')}</button></header>
    <div id="search-body">${renderSearchBody()}</div>`;
}

function renderSearchBody() {
  const matches = state.searchText.trim() ? allTracks().filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(state.searchText.toLowerCase())) : [];
  return state.searchText.trim()
    ? `<div class="search-results-label">${matches.length ? 'Результати' : 'Нічого не знайдено'}</div><div class="song-list">${prioritizePinned(matches).map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>`
    : `<div class="section-heading"><h2>Недавні пошуки</h2><button class="text-action text-action--red" data-action="clear-search">Очистити</button></div>
      <div class="recent-searches">${state.recentSearches.map((term) => `<button data-action="recent-search" data-term="${safeText(term)}">${icon('search')}<span>${safeText(term)}</span>${icon('more')}</button>`).join('') || '<div class="empty-state">Ваші пошуки з’являться тут.</div>'}</div>`;
}

function renderItemScreen() {
  const { kind, id } = state.screen;
  const albumTrack = kind === 'album' ? allTracks().find((track) => track.album === id) : null;
  const item = [...libraryAlbums(), ...libraryArtists()].find((value) => value.id === id) || { id, title: id === 'favorites' ? 'Улюблені пісні' : id === 'recent' ? 'Недавно прослухані' : kind === 'album' ? id : 'Медіатека', artist: albumTrack?.artist || 'Ваша медіатека', art: 'local' };
  let heading = item.title;
  let list = [];
  if (kind === 'artist') list = allTracks().filter((track) => track.artist === id);
  else if (kind === 'album') list = allTracks().filter((track) => track.album === id);
  else if (id === 'favorites') list = allTracks().filter((track) => state.favorites.includes(track.id));
  else if (id === 'recent') list = state.recentTrackIds.map((trackId) => allTracks().find((track) => track.id === trackId)).filter(Boolean);
  list = prioritizePinned(list);
  return `<header class="subpage-top"><button class="round-back" data-action="back">${icon('back')}</button><span></span></header>
    <section class="detail-heading">${kind === 'artist' ? artMarkup(item.art, item.title, 'detail-art detail-art--artist') : ''}<h1>${safeText(heading)}</h1>${kind !== 'artist' ? `<p>${safeText(item.artist || 'Ваша медіатека')}</p>` : ''}</section>
    ${list.length ? `<div class="detail-actions"><button data-action="play-list" data-id="${safeText(id)}" data-kind="${safeText(kind)}">${icon('play')} Відтворити</button><button data-action="shuffle-list" data-id="${safeText(id)}" data-kind="${safeText(kind)}">${icon('shuffle')} Тасувати</button></div>` : ''}
    ${kind === 'artist' ? `<h2 class="letter-heading">Популярні пісні</h2>` : `<h2 class="letter-heading">${kind === 'playlist' ? 'Пісні' : 'A'}</h2>`}
    <div class="song-list song-list--detail">${list.map((track, i) => songRow(track, i, { showAlbum: false })).join('') || '<div class="empty-state">Тут поки немає пісень. Додайте власні аудіофайли, щоб слухати їх офлайн.</div>'}</div>`;
}

function renderCategory() {
  const { category } = state.screen;
  const [title, iconName] = categoryInfo[category] || ['Медіатека', 'music'];
  let rows = '';
  if (category === 'playlists') {
    rows = `<button class="entity-row" data-action="open-item" data-kind="playlist" data-id="favorites"><span class="favorite-art entity-art">${icon('star')}</span><span>Улюблені пісні</span>${icon('back', 'chevron')}</button>`;
  } else if (category === 'artists') {
    const sorted = libraryArtists().sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    rows = sorted.length ? `<div class="alphabet" aria-hidden="true">${'АБВГДЕЄЖЗИІКЛМНОПРСТУФХЦЧШЩЬЮЯ#'.split('').map((char) => `<span>${char}</span>`).join('')}</div>${sorted.map((artist) => `<button class="entity-row" data-action="open-item" data-kind="artist" data-id="${safeText(artist.id)}">${artMarkup(artist.art, artist.title, 'entity-art entity-art--round')}<span>${safeText(artist.title)}</span>${icon('back', 'chevron')}</button>`).join('')}` : '<div class="empty-state">Тут з’являться виконавці з ваших аудіофайлів.</div>';
  } else if (category === 'albums') {
    const albums = libraryAlbums();
    rows = albums.length ? `<div class="album-grid">${albums.map((album) => `<button class="album-card" data-action="open-item" data-kind="album" data-id="${safeText(album.id)}">${artMarkup(album.art, album.title)}<span class="album-title">${safeText(album.title)}</span><span class="album-subtitle">${safeText(album.artist)}</span></button>`).join('')}</div>` : '<div class="empty-state">Тут з’являться альбоми з ваших аудіофайлів.</div>';
  } else if (category === 'songs') {
    const list = sortTracksByArtist(allTracks());
    const groups = [];
    list.forEach((track, index) => {
      const letter = musicLetter(track.artist);
      let group = groups.at(-1);
      if (!group || group.letter !== letter) {
        group = { letter, tracks: [] };
        groups.push(group);
      }
      group.tracks.push({ track, index });
    });
    const alphabetIndex = groups.length ? `<nav class="alphabet alphabet--interactive" aria-label="Алфавітний покажчик">${musicAlphabet.map((letter) => `<button data-action="jump-letter" data-letter="${letter}" aria-label="Літера ${letter}">${letter}</button>`).join('')}</nav>` : '';
    rows = groups.length ? `${alphabetIndex}${groups.map((group) => `<section class="song-letter-group" data-letter-group="${group.letter}"><h2 class="letter-heading">${group.letter}</h2><div class="song-list">${group.tracks.map(({ track, index }) => songRow(track, index, { leadingFavorite: true, hidePinned: true })).join('')}</div></section>`).join('')}` : '<div class="empty-state">Додайте аудіофайли, щоб слухати їх офлайн.</div>';
  } else {
    const list = prioritizePinned(allTracks().filter((track) => track.local));
    rows = `<div class="song-list">${list.length ? list.map((track, i) => songRow(track, i, { showAlbum: category === 'downloaded' })).join('') : `<div class="empty-state">${category === 'downloaded' ? 'Тут з’явиться ваша музика, додана на пристрої.' : 'Додайте аудіофайли, щоб бачити свою медіатеку тут.'}</div>`}</div>`;
  }
  const hasAudio = allTracks().length > 0;
  return `<header class="subpage-top"><button class="round-back" data-action="back">${icon('back')}</button><span></span></header>
    <h1 class="category-title">${title}</h1>${(category === 'songs' || category === 'albums') && hasAudio ? `<div class="detail-actions"><button data-action="play-list" data-category="${category}">${icon('play')} Відтворити</button><button data-action="shuffle-list" data-category="${category}">${icon('shuffle')} Тасувати</button></div>` : ''}
    <div class="category-content">${rows}</div>`;
}

function renderSettings() {
  const profile = state.googleProfile;
  return `<header class="subpage-top"><button class="round-back" data-action="back">${icon('back')}</button><h2>Налаштування</h2><span></span></header>
    <button class="settings-profile" data-action="google-account" aria-label="${profile ? `Google: ${safeText(profile.name || profile.email)}` : 'Войти через Google'}"><span class="profile-button profile-button--large ${profilePictureUrl(profile) ? 'profile-button--photo' : ''}">${profileAvatarContents(profile)}</span><span class="settings-profile-copy"><strong>${profile ? safeText(profile.name || profile.email) : 'Моя медіатека'}</strong><small>${profile ? safeText(profile.email) : 'Войти через Google'}</small></span>${icon('back', 'chevron')}</button>
    <button class="import-panel" data-action="import">${icon('plus')}<span><strong>Додати аудіофайли</strong><small>Файли залишаються лише на вашому пристрої</small></span>${icon('back', 'chevron')}</button>
    <button class="import-panel" data-action="drive-import">${icon('download')}<span><strong>Импорт из Google Диска</strong><small>Выбранные файлы сохраняются только на этом устройстве</small></span>${icon('back', 'chevron')}</button>
    <a class="import-panel profile-download" href="./Muzika.mobileconfig">${icon('home')}<span><strong>Додати ярлик на iPhone або iPad</strong><small>Завантажити профіль вебзастосунку</small></span>${icon('back', 'chevron')}</a>
    <p class="settings-note">Оновлення інтерфейсу завантажуються автоматично під час запуску, коли є інтернет. Збережена музика та сам застосунок доступні офлайн.</p>`;
}

const GOOGLE_CLIENT_ID = document.querySelector('meta[name="google-client-id"]')?.content.trim() || '';
const GOOGLE_DRIVE_API_KEY = document.querySelector('meta[name="google-drive-api-key"]')?.content.trim() || '';
const GOOGLE_CLOUD_PROJECT_NUMBER = document.querySelector('meta[name="google-cloud-project-number"]')?.content.trim() || '';
const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
let googleIdentityPromise;
let googleIdentityInitialized = false;
let googleApiLoaderPromise;
let googlePickerPromise;

function closeGoogleAccount() {
  $('#modal-root').innerHTML = '';
}

function decodeGoogleProfile(credential) {
  try {
    const part = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = part + '='.repeat((4 - part.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    if (!claims.sub || !claims.email) return null;
    return { id: claims.sub, name: claims.name || claims.email, email: claims.email, picture: typeof claims.picture === 'string' ? claims.picture : '' };
  } catch {
    return null;
  }
}

function handleGoogleCredential(response) {
  const profile = decodeGoogleProfile(response.credential || '');
  if (!profile) return notify('Не удалось получить профиль Google. Попробуйте ещё раз.');
  state.googleProfile = profile;
  localStorage.setItem('muzika-google-profile', JSON.stringify(profile));
  closeGoogleAccount();
  render();
  notify(`Вы вошли как ${profile.name}.`);
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!googleIdentityPromise) {
    googleIdentityPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('google-identity-unavailable'));
      document.head.append(script);
    }).catch((error) => {
      googleIdentityPromise = null;
      throw error;
    });
  }
  return googleIdentityPromise;
}

function loadGoogleApiLoader() {
  if (window.gapi?.load) return Promise.resolve();
  if (!googleApiLoaderPromise) {
    googleApiLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('google-api-loader-unavailable'));
      document.head.append(script);
    }).catch((error) => {
      googleApiLoaderPromise = null;
      throw error;
    });
  }
  return googleApiLoaderPromise;
}

async function loadGooglePicker() {
  if (window.google?.picker?.PickerBuilder) return;
  if (!googlePickerPromise) {
    googlePickerPromise = (async () => {
      await loadGoogleApiLoader();
      await new Promise((resolve, reject) => {
        window.gapi.load('picker', {
          callback: resolve,
          onerror: () => reject(new Error('google-picker-unavailable')),
          timeout: 10000,
          ontimeout: () => reject(new Error('google-picker-timeout'))
        });
      });
    })().catch((error) => {
      googlePickerPromise = null;
      throw error;
    });
  }
  await googlePickerPromise;
}

function importFromGoogleDrive() {
  if (!navigator.onLine) return notify('Для импорта из Google Диска подключитесь к интернету.');
  if (!GOOGLE_CLIENT_ID || !GOOGLE_DRIVE_API_KEY || !GOOGLE_CLOUD_PROJECT_NUMBER) {
    return notify('Импорт из Google Диска появится после настройки доступа Google.');
  }

  loadGoogleIdentityServices().then(() => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_DRIVE_FILE_SCOPE,
      callback: async (response) => {
        if (response.error || !response.access_token) return notify('Не удалось получить доступ к выбранным файлам Google Диска.');
        try {
          await openGoogleDrivePicker(response.access_token);
        } catch {
          notify('Не удалось открыть Google Диск. Проверьте интернет и настройки доступа.');
        }
      }
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }).catch(() => notify('Не удалось подключиться к Google. Проверьте интернет и попробуйте ещё раз.'));
}

async function openGoogleDrivePicker(accessToken) {
  await loadGooglePicker();
  const picker = new window.google.picker.PickerBuilder()
    .setAppId(GOOGLE_CLOUD_PROJECT_NUMBER)
    .setDeveloperKey(GOOGLE_DRIVE_API_KEY)
    .setOAuthToken(accessToken)
    .setLocale('ru')
    .addView(new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes('audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/webm,audio/opus'))
    .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
    .setCallback((data) => handleGoogleDrivePickerResult(data, accessToken))
    .build();
  picker.setVisible(true);
}

async function handleGoogleDrivePickerResult(data, accessToken) {
  if (data[window.google.picker.Response.ACTION] !== window.google.picker.Action.PICKED) return;
  const documents = data[window.google.picker.Response.DOCUMENTS] || [];
  try {
    const files = [];
    for (const document of documents) {
      const fileId = document[window.google.picker.Document.ID];
      const name = document[window.google.picker.Document.NAME] || 'Аудиофайл';
      const mimeType = document[window.google.picker.Document.MIME_TYPE] || '';
      if (!fileId || !mimeType.startsWith('audio/')) throw new Error('not-audio-file');
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) throw new Error('drive-download-failed');
      const blob = await response.blob();
      files.push(new File([blob], name, { type: mimeType || blob.type }));
    }
    await importFiles(files);
  } catch (error) {
    notify(error.message === 'not-audio-file' ? 'Выберите аудиофайлы из Google Диска.' : 'Не удалось загрузить выбранные аудиофайлы.');
  }
}

async function prepareGoogleSignIn() {
  const buttonRoot = $('#google-signin-button');
  if (!buttonRoot || state.googleProfile) return;
  if (!navigator.onLine) {
    buttonRoot.innerHTML = '<p class="account-message">Чтобы войти через Google, подключитесь к интернету.</p>';
    return;
  }
  if (!GOOGLE_CLIENT_ID) {
    buttonRoot.innerHTML = '<p class="account-message">Вход через Google появится после настройки OAuth для сайта.</p>';
    return;
  }
  buttonRoot.innerHTML = '<p class="account-message">Подключаемся к Google…</p>';
  try {
    await loadGoogleIdentityServices();
    if (!buttonRoot.isConnected) return;
    buttonRoot.innerHTML = '';
    if (!googleIdentityInitialized) {
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential, auto_select: false });
      googleIdentityInitialized = true;
    }
    window.google.accounts.id.renderButton(buttonRoot, {
      theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', width: 280, locale: 'ru'
    });
  } catch {
    if (buttonRoot.isConnected) buttonRoot.innerHTML = '<p class="account-message">Не удалось подключиться к Google. Проверьте интернет и попробуйте ещё раз.</p>';
  }
}

function openGoogleAccount() {
  const profile = state.googleProfile;
  const root = $('#modal-root');
  root.innerHTML = `<div id="google-account-modal" class="account-modal" role="presentation">
    <section class="account-sheet" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <button class="account-close" data-action="close-google-account" aria-label="Закрити">${icon('close')}</button>
      <div class="account-mark">G</div>
      <h2 id="account-title">${profile ? 'Аккаунт Google' : 'Войти через Google'}</h2>
      ${profile ? `<p class="account-message account-message--signed">${safeText(profile.name)}<br><span>${safeText(profile.email)}</span></p><button class="account-signout" data-action="google-signout">Выйти из аккаунта в приложении</button>` : '<div id="google-signin-button" class="google-signin-button"></div>'}
      <p class="account-footnote">Музыка и аудиофайлы остаются только на этом устройстве.</p>
    </section>
  </div>`;
  root.querySelector('#google-account-modal').addEventListener('click', (event) => {
    if (event.target.id === 'google-account-modal') closeGoogleAccount();
  });
  if (!profile) prepareGoogleSignIn();
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
  $('#mini-player').innerHTML = track
    ? `<button class="player-track" data-action="now-playing">${artMarkup(track.art, track.album, 'player-art')}<span class="player-copy"><strong>${safeText(track.title)}</strong><small>${safeText(track.artist)}</small></span></button><button class="player-control" data-action="toggle-play" aria-label="${state.isPlaying ? 'Пауза' : 'Відтворити'}">${icon(state.isPlaying ? 'pause' : 'play')}</button><button class="player-control player-next" data-action="next-track" aria-label="Наступна пісня">${icon('next')}</button>`
    : `<button class="player-track" data-action="import">${artMarkup('local', '', 'player-art')}<span class="player-copy"><strong>Додати аудіофайл</strong><small>Офлайн-медіатека</small></span></button><button class="player-control" disabled aria-label="Немає пісень">${icon('play')}</button><button class="player-control player-next" disabled aria-label="Немає наступної пісні">${icon('next')}</button>`;
}

function formatPlayerTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function renderNowPlayingScreen() {
  const track = currentTrack();
  if (!track) return '';
  const playable = Boolean(track.local);
  const duration = playable && Number.isFinite(audio.duration) ? audio.duration : 0;
  const progress = duration ? Math.min(100, audio.currentTime / duration * 100) : 0;
  return `<div class="now-playing-backdrop"></div>
    <section id="now-playing-screen" class="now-playing-screen" role="dialog" aria-modal="true" aria-label="Зараз відтворюється">
      <header class="now-playing-header now-playing-drag-zone">
        <button class="now-playing-close" data-action="close-now-playing" aria-label="Згорнути плеєр">${icon('down')}</button>
        <span class="now-playing-header-title">ЗАРАЗ ВІДТВОРЮЄТЬСЯ</span>
        <button class="now-playing-more" data-action="player-queue" aria-label="Черга відтворення">${icon('more')}</button>
      </header>
      <div class="now-playing-content">
        <div class="now-playing-art-wrap now-playing-drag-zone">${artMarkup(track.art, track.album, 'now-playing-art')}</div>
        <div class="now-playing-track-info">
          <div class="now-playing-copy"><strong>${safeText(track.title)}</strong><span>${safeText(track.artist)}</span></div>
          <button class="now-playing-favorite" data-action="toggle-player-favorite" aria-label="${state.favorites.includes(track.id) ? 'Вилучити з улюблених' : 'Додати до улюблених'}">${icon('star', state.favorites.includes(track.id) ? 'is-favorite' : '')}</button>
        </div>
        <div class="now-playing-progress-block">
          <input id="player-progress" class="player-range" type="range" min="0" max="${duration || 0}" step="0.1" value="${Math.min(audio.currentTime || 0, duration)}" style="--range-progress:${progress}%" aria-label="Позиція відтворення" ${playable && duration ? '' : 'disabled'}>
          <div class="now-playing-times"><span id="player-current-time">${formatPlayerTime(playable ? audio.currentTime : 0)}</span><span>${duration ? formatPlayerTime(duration) : '–:––'}</span></div>
        </div>
        <div class="now-playing-controls">
          <button class="now-playing-secondary" data-action="previous-track" aria-label="Попередня пісня">${icon('next', 'is-reversed')}</button>
          <button id="now-playing-toggle" class="now-playing-toggle" data-action="toggle-play" aria-label="${state.isPlaying ? 'Пауза' : 'Відтворити'}">${icon(state.isPlaying ? 'pause' : 'play')}</button>
          <button class="now-playing-secondary" data-action="next-track" aria-label="Наступна пісня">${icon('next')}</button>
        </div>
        <div class="now-playing-volume-row"><span>${icon('volume')}</span><input id="player-volume" class="player-range player-volume" type="range" min="0" max="1" step="0.01" value="${audio.volume}" aria-label="Гучність" ${playable ? '' : 'disabled'}><span>${icon('volume', 'volume-high')}</span></div>
        <p class="now-playing-note ${playable ? 'now-playing-note--ready' : ''}">${playable ? 'Офлайн-аудіо збережено на цьому пристрої' : 'Додайте аудіофайл, щоб слухати офлайн'}</p>
      </div>
      <div class="now-playing-home-indicator" aria-hidden="true"></div>
    </section>`;
}

let nowPlayingClosing = false;

function openNowPlaying() {
  if (!currentTrack()) return;
  const root = $('#player-root');
  if (root.firstElementChild) return;
  root.innerHTML = `<div id="now-playing-root" class="now-playing-root">${renderNowPlayingScreen()}</div>`;
  const screen = $('#now-playing-screen');
  const source = $('#mini-player .player-art');
  const target = root.querySelector('.now-playing-art');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sharedArtAnimation = null;

  if (source && target && !reducedMotion) {
    screen.classList.add('is-shared-art-hidden');
    sharedArtAnimation = animateArtworkTransition(source, target, true);
  }

  requestAnimationFrame(() => {
    $('#now-playing-root')?.classList.add('is-open');
    $('#now-playing-screen')?.classList.add('is-open');
  });
  if (sharedArtAnimation) sharedArtAnimation.finally(() => screen.classList.remove('is-shared-art-hidden'));

  root.querySelector('[data-action="close-now-playing"]').addEventListener('click', (event) => {
    event.stopPropagation();
    closeNowPlaying();
  });
  root.querySelector('.now-playing-backdrop').addEventListener('click', closeNowPlaying);
  attachNowPlayingDrag(screen);
  syncNowPlayingPlayback();
}

function animateArtworkTransition(source, target, opening) {
  const shell = $('.app-shell');
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const shellHeight = shell?.getBoundingClientRect().height || window.innerHeight;
  const origin = from;
  const goal = { left: to.left, top: opening ? to.top - shellHeight : to.top, width: to.width, height: to.height };
  const clone = source.cloneNode(true);
  if (opening) {
    clone.classList.remove('player-art');
    clone.classList.add('now-playing-art');
  }
  clone.removeAttribute('aria-label');
  Object.assign(clone.style, {
    position: 'fixed', left: `${origin.left}px`, top: `${origin.top}px`, width: `${origin.width}px`, height: `${origin.height}px`,
    margin: '0', zIndex: '1000', pointerEvents: 'none', transformOrigin: 'top left', willChange: 'transform,border-radius'
  });
  document.body.append(clone);
  const x = goal.left - origin.left;
  const y = goal.top - origin.top;
  const scaleX = goal.width / origin.width;
  const scaleY = goal.height / origin.height;
  const animation = clone.animate([
    { transform: 'translate(0, 0) scale(1, 1)', borderRadius: opening ? '7px' : '18px' },
    { transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`, borderRadius: opening ? '18px' : '7px' }
  ], { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
  return animation.finished.catch(() => {}).finally(() => clone.remove());
}

function closeNowPlaying() {
  const root = $('#now-playing-root');
  const screen = $('#now-playing-screen');
  if (!root || !screen || nowPlayingClosing) return;
  nowPlayingClosing = true;
  const expandedArt = $('#player-root .now-playing-art');
  const miniArt = $('#mini-player .player-art');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sharedArtAnimation = null;
  if (expandedArt && miniArt && !reducedMotion) {
    screen.classList.add('is-shared-art-hidden');
    sharedArtAnimation = animateArtworkTransition(expandedArt, miniArt, false);
  }
  root.classList.remove('is-open');
  screen.classList.remove('is-open');
  const finish = () => {
    $('#player-root').innerHTML = '';
    nowPlayingClosing = false;
  };
  if (sharedArtAnimation) sharedArtAnimation.finally(finish);
  else setTimeout(finish, reducedMotion ? 80 : 470);
}

function syncNowPlayingPlayback() {
  const button = $('#now-playing-toggle');
  const track = currentTrack();
  if (button) {
    button.innerHTML = icon(state.isPlaying ? 'pause' : 'play');
    button.setAttribute('aria-label', state.isPlaying ? 'Пауза' : 'Відтворити');
  }
  const currentTime = $('#player-current-time');
  if (currentTime) currentTime.textContent = formatPlayerTime(track?.local ? audio.currentTime : 0);
  const progress = $('#player-progress');
  if (progress && track?.local) {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    progress.max = String(duration);
    progress.value = String(Math.min(audio.currentTime || 0, duration));
    progress.style.setProperty('--range-progress', `${duration ? audio.currentTime / duration * 100 : 0}%`);
    progress.disabled = !duration;
    const totalTime = $('.now-playing-times span:last-child');
    if (totalTime) totalTime.textContent = duration ? formatPlayerTime(duration) : '–:––';
  }
}

function syncNowPlayingTrack() {
  const track = currentTrack();
  const artwork = $('.now-playing-art-wrap');
  const copy = $('.now-playing-copy');
  const favoriteButton = $('.now-playing-favorite');
  const note = $('.now-playing-note');
  const progress = $('#player-progress');
  const volume = $('#player-volume');
  if (!artwork || !track) return;
  artwork.innerHTML = artMarkup(track.art, track.album, 'now-playing-art');
  if (copy) copy.innerHTML = `<strong>${safeText(track.title)}</strong><span>${safeText(track.artist)}</span>`;
  if (favoriteButton) {
    const favorite = state.favorites.includes(track.id);
    favoriteButton.innerHTML = icon('star', favorite ? 'is-favorite' : '');
    favoriteButton.setAttribute('aria-label', favorite ? 'Вилучити з улюблених' : 'Додати до улюблених');
  }
  if (note) {
    note.textContent = track.local ? 'Офлайн-аудіо збережено на цьому пристрої' : 'Додайте аудіофайл, щоб слухати офлайн';
    note.classList.toggle('now-playing-note--ready', Boolean(track.local));
  }
  if (progress) progress.disabled = !track.local;
  if (volume) volume.disabled = !track.local;
  syncNowPlayingPlayback();
}

function attachNowPlayingDrag(screen) {
  let startY = null;
  let lastY = null;
  let lastTime = 0;
  screen.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.now-playing-drag-zone') || event.target.closest('button') || event.button !== 0) return;
    startY = event.clientY;
    lastY = event.clientY;
    lastTime = performance.now();
    screen.setPointerCapture?.(event.pointerId);
  });
  screen.addEventListener('pointermove', (event) => {
    if (startY === null) return;
    const distance = Math.max(0, event.clientY - startY);
    const now = performance.now();
    screen.style.transition = 'none';
    screen.style.transform = `translateY(${distance}px)`;
    $('#now-playing-root')?.style.setProperty('--player-backdrop-opacity', String(Math.max(.16, 1 - distance / window.innerHeight)));
    screen.dataset.dragVelocity = String((event.clientY - lastY) / Math.max(1, now - lastTime));
    lastY = event.clientY;
    lastTime = now;
  });
  screen.addEventListener('pointerup', () => {
    if (startY === null) return;
    const distance = Math.max(0, lastY - startY);
    const velocity = Number(screen.dataset.dragVelocity || 0);
    startY = null;
    screen.style.transition = '';
    screen.style.transform = '';
    $('#now-playing-root')?.style.removeProperty('--player-backdrop-opacity');
    if (distance > 115 || velocity > .65) closeNowPlaying();
  });
  screen.addEventListener('pointercancel', () => {
    startY = null;
    screen.style.transition = '';
    screen.style.transform = '';
    $('#now-playing-root')?.style.removeProperty('--player-backdrop-opacity');
  });
}

function render() {
  content.innerHTML = renderScreen();
  content.classList.toggle('content--category-screen', state.screen.type === 'category');
  content.classList.toggle('content--category-detail', state.screen.type === 'category' && ['songs', 'albums'].includes(state.screen.category));
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

function canStartBackGesture() {
  return state.screenStack.length > 0 &&
    content.querySelector('.round-back[data-action="back"]') &&
    !$('#modal-root').firstElementChild &&
    !$('#player-root').firstElementChild &&
    !refreshRunning;
}

function navigateBack() {
  const previous = state.screenStack.pop();
  state.screen = previous ? { ...previous } : { type: 'tab', tab: 'library' };
  if (state.screen.type === 'tab') state.tab = state.screen.tab;
  const previousScrollTop = Math.max(0, Number(state.screen.scrollTop) || 0);
  delete state.screen.scrollTop;
  render();
  content.scrollTop = previousScrollTop;
}

function pushScreen(screen) {
  state.screenStack.push({ ...state.screen, scrollTop: content.scrollTop });
  state.screen = screen;
  render();
}

function jumpToMusicLetter(letter) {
  const groups = [...content.querySelectorAll('.song-letter-group')];
  if (!groups.length) return;
  const requestedIndex = musicAlphabet.indexOf(letter);
  const destination = groups.find((group) => group.dataset.letterGroup === letter) ||
    groups.find((group) => musicAlphabet.indexOf(group.dataset.letterGroup) >= requestedIndex) ||
    groups.at(-1);
  const scrollTop = content.scrollTop + destination.getBoundingClientRect().top - content.getBoundingClientRect().top - 8;
  content.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
}

let backGesture = null;

function beginBackGesturePreview() {
  const previous = state.screenStack.at(-1);
  if (!previous || !canStartBackGesture()) return null;

  const activeScreen = state.screen;
  let previousMarkup;
  try {
    state.screen = previous;
    previousMarkup = renderScreen();
  } finally {
    state.screen = activeScreen;
  }

  const shellRect = $('.app-shell').getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const preview = document.createElement('div');
  const isRtl = getComputedStyle($('.app-shell')).direction === 'rtl';
  preview.className = `back-gesture-preview${isRtl ? ' back-gesture-preview--rtl' : ''}`;
  preview.setAttribute('aria-hidden', 'true');
  preview.inert = true;
  preview.innerHTML = previousMarkup;
  Object.assign(preview.style, {
    top: `${contentRect.top - shellRect.top}px`,
    right: isRtl ? '0' : 'auto',
    bottom: `${shellRect.bottom - contentRect.bottom}px`,
    left: isRtl ? 'auto' : '0',
    width: `${contentRect.width}px`,
    transform: `translate3d(${isRtl ? '' : '-'}28%, 0, 0)`,
    opacity: '.68'
  });
  $('.app-shell').insertBefore(preview, content);
  preview.scrollTop = Math.max(0, Number(previous.scrollTop) || 0);
  content.classList.add('content--back-gesture');
  content.style.transform = 'translate3d(0, 0, 0)';
  return { preview, width: contentRect.width, isRtl, direction: isRtl ? -1 : 1 };
}

function updateBackGesture(distance) {
  if (!backGesture) return;
  const progress = Math.min(1, distance / backGesture.width);
  content.style.transform = `translate3d(${backGesture.direction * distance}px, 0, 0)`;
  backGesture.preview.style.transform = `translate3d(${backGesture.direction * (-28 + progress * 28)}%, 0, 0)`;
  backGesture.preview.style.opacity = String(.68 + progress * .32);
}

function clearBackGesture() {
  if (!backGesture) return;
  backGesture.preview.remove();
  content.classList.remove('content--back-gesture', 'content--back-settling');
  content.style.removeProperty('transform');
  backGesture = null;
}

function settleBackGesture(shouldComplete) {
  if (!backGesture) return;
  const activeGesture = backGesture;
  content.classList.remove('content--back-gesture');
  content.classList.add('content--back-settling');
  activeGesture.preview.classList.add('back-gesture-preview--settling');
  if (shouldComplete) {
    content.style.transform = `translate3d(${activeGesture.direction * activeGesture.width}px, 0, 0)`;
    activeGesture.preview.style.transform = 'translate3d(0, 0, 0)';
    activeGesture.preview.style.opacity = '1';
  } else {
    content.style.transform = 'translate3d(0, 0, 0)';
    activeGesture.preview.style.transform = `translate3d(${activeGesture.direction * -28}%, 0, 0)`;
    activeGesture.preview.style.opacity = '.68';
  }
  const settleDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 250;
  window.setTimeout(() => {
    if (backGesture !== activeGesture) return;
    clearBackGesture();
    if (shouldComplete) navigateBack();
  }, settleDelay);
}

const appShell = $('.app-shell');

appShell.addEventListener('pointerdown', (event) => {
  if (!canStartBackGesture() || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  if (event.target.closest?.('#mini-player, #tab-bar, #player-root, #modal-root')) return;
  const rtl = getComputedStyle(appShell).direction === 'rtl';
  const shellRect = appShell.getBoundingClientRect();
  const leadingDistance = rtl ? shellRect.right - event.clientX : event.clientX - shellRect.left;
  if (leadingDistance < 0 || leadingDistance > 30) return;

  backGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastTime: event.timeStamp,
    velocity: 0,
    direction: rtl ? -1 : 1,
    active: false
  };
});

appShell.addEventListener('pointermove', (event) => {
  if (!backGesture || event.pointerId !== backGesture.pointerId) return;
  const gesture = backGesture;
  const signedDistance = (event.clientX - gesture.startX) * gesture.direction;
  const verticalDistance = event.clientY - gesture.startY;
  const elapsed = Math.max(1, event.timeStamp - gesture.lastTime);
  gesture.velocity = ((event.clientX - gesture.lastX) * gesture.direction) / elapsed;
  gesture.lastX = event.clientX;
  gesture.lastTime = event.timeStamp;

  if (!gesture.active) {
    if (Math.abs(verticalDistance) > 12 && Math.abs(verticalDistance) > signedDistance) {
      backGesture = null;
      return;
    }
    if (signedDistance < 8 || signedDistance < Math.abs(verticalDistance) * 1.15) return;
    const preview = beginBackGesturePreview();
    if (!preview) {
      backGesture = null;
      return;
    }
    Object.assign(gesture, preview, { active: true });
    try { appShell.setPointerCapture(event.pointerId); } catch { /* Pointer capture can be unavailable in older WebKit. */ }
  }

  if (event.cancelable) event.preventDefault();
  updateBackGesture(Math.max(0, signedDistance));
}, { passive: false });

function finishBackGesture(event) {
  if (!backGesture || event.pointerId !== backGesture.pointerId) return;
  if (!backGesture.active) {
    backGesture = null;
    return;
  }
  const gesture = backGesture;
  const distance = (event.clientX - gesture.startX) * gesture.direction;
  const shouldComplete = distance > Math.min(120, gesture.width * .32) || (distance > 48 && gesture.velocity > .48);
  settleBackGesture(shouldComplete);
}

appShell.addEventListener('pointerup', finishBackGesture);
appShell.addEventListener('pointercancel', (event) => {
  if (!backGesture || event.pointerId !== backGesture.pointerId) return;
  if (backGesture.active) settleBackGesture(false);
  else backGesture = null;
});

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
    syncNowPlayingPlayback();
    return;
  }
  if (state.currentTrackId !== track.id || !state.audioUrl) {
    state.currentTrackId = track.id;
    syncNowPlayingTrack();
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = URL.createObjectURL(track.file);
    audio.src = state.audioUrl;
  } else if (audio.ended) {
    audio.currentTime = 0;
  }
  state.recentTrackIds = [track.id, ...state.recentTrackIds.filter((id) => id !== track.id)].slice(0, 30);
  localStorage.setItem('muzika-recent-tracks', JSON.stringify(state.recentTrackIds));
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

let refreshRunning = false;
let pullStart = null;
let pullDistance = 0;
const pullRefreshIndicator = $('#pull-refresh');
const PULL_REFRESH_THRESHOLD = 86;
const MIN_REFRESH_INDICATOR_MS = 950;
const REFRESH_ROUTE_KEY = 'muzika-refresh-return';
let refreshStartedAt = 0;

function showRefreshIndicator(distance = 0) {
  if (!refreshStartedAt) refreshStartedAt = performance.now();
  const offset = distance ? Math.min(64, Math.round(distance * 0.62)) : 54;
  content.classList.remove('content--pulling');
  content.style.setProperty('--refresh-offset', `${offset}px`);
  pullRefreshIndicator.style.setProperty('--pull-offset', '0px');
  pullRefreshIndicator.classList.add('pull-refresh--visible', 'pull-refresh--loading');
  pullRefreshIndicator.setAttribute('aria-hidden', 'false');
}

function rememberScreenBeforeRefresh() {
  try {
    sessionStorage.setItem(REFRESH_ROUTE_KEY, JSON.stringify({
      tab: state.tab,
      screen: state.screen,
      screenStack: state.screenStack,
      scrollTop: content.scrollTop
    }));
  } catch {
    // The refreshed shell can still load if session storage is unavailable.
  }
}

function restoreScreenAfterRefresh() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(REFRESH_ROUTE_KEY) || 'null');
    sessionStorage.removeItem(REFRESH_ROUTE_KEY);
    if (!saved || !['home', 'new', 'radio', 'library', 'search'].includes(saved.tab)) return null;
    if (!saved.screen || !['tab', 'settings', 'category', 'item'].includes(saved.screen.type)) return null;
    if (saved.screen.type === 'tab' && !['home', 'new', 'radio', 'library', 'search'].includes(saved.screen.tab)) return null;
    state.tab = saved.tab;
    state.screen = saved.screen;
    state.screenStack = Array.isArray(saved.screenStack) ? saved.screenStack : [];
    return Number.isFinite(saved.scrollTop) ? Math.max(0, saved.scrollTop) : 0;
  } catch {
    try { sessionStorage.removeItem(REFRESH_ROUTE_KEY); } catch { /* Storage may be disabled. */ }
    return null;
  }
}

function reloadAfterRefresh() {
  if (!pullRefreshIndicator.classList.contains('pull-refresh--visible')) showRefreshIndicator();
  pullRefreshIndicator.querySelector('.pull-refresh-label').textContent = 'Оновлено. Перезапускаємо…';
  rememberScreenBeforeRefresh();
  const visibleFor = performance.now() - refreshStartedAt;
  setTimeout(() => location.reload(), Math.max(0, MIN_REFRESH_INDICATOR_MS - visibleFor));
}

function updatePullIndicator(distance, label) {
  const contentOffset = Math.min(64, Math.round(distance * 0.62));
  const spinnerOffset = Math.min(46, Math.round(distance * 0.54));
  content.style.setProperty('--refresh-offset', `${contentOffset}px`);
  pullRefreshIndicator.style.setProperty('--pull-offset', `calc(-46px + ${spinnerOffset}px)`);
  pullRefreshIndicator.classList.toggle('pull-refresh--visible', distance > 6 || refreshRunning);
  pullRefreshIndicator.setAttribute('aria-hidden', 'false');
  pullRefreshIndicator.querySelector('.pull-refresh-label').textContent = label;
}

function resetPullIndicator() {
  pullRefreshIndicator.classList.remove('pull-refresh--visible', 'pull-refresh--loading');
  pullRefreshIndicator.style.removeProperty('--pull-offset');
  pullRefreshIndicator.setAttribute('aria-hidden', 'true');
  pullRefreshIndicator.querySelector('.pull-refresh-label').textContent = 'Потягніть вниз для оновлення';
  content.classList.remove('content--pulling');
  content.style.setProperty('--refresh-offset', '0px');
  refreshStartedAt = 0;
}

function waitForWorkerActivation(worker, timeoutMs = 45000) {
  if (worker.state === 'activated') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('service-worker-timeout')), timeoutMs);
    const onStateChange = () => {
      if (worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('service-worker-redundant'));
    };
    const finish = (error) => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', onStateChange);
      if (error) reject(error);
      else resolve();
    };
    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  });
}

function askWorkerToRefreshShell(worker) {
  return new Promise((resolve, reject) => {
    if (!('MessageChannel' in window)) return reject(new Error('message-channel-unavailable'));
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error('refresh-timeout'));
    }, 60000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.ok === true);
    };
    try {
      worker.postMessage({ type: 'FORCE_REFRESH_OFFLINE_SHELL' }, [channel.port2]);
    } catch (error) {
      clearTimeout(timer);
      channel.port1.close();
      reject(error);
    }
  });
}

async function forceRefreshOfflineShell(pulledDistance = 0) {
  if (refreshRunning) return;
  if (!navigator.onLine) {
    resetPullIndicator();
    notify('Немає інтернету. Попередня версія та музика залишилися доступні офлайн.');
    return;
  }
  refreshRunning = true;
  showRefreshIndicator(pulledDistance);
  pullRefreshIndicator.querySelector('.pull-refresh-label').textContent = 'Завантажуємо застосунок для офлайн…';

  try {
    if (!('serviceWorker' in navigator)) throw new Error('service-worker-unavailable');

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    const previousWorker = registration.active;
    await registration.update();

    const installingWorker = registration.installing || registration.waiting;
    if (installingWorker && installingWorker !== previousWorker) {
      await waitForWorkerActivation(installingWorker);
    } else {
      const activeWorker = navigator.serviceWorker.controller || registration.active;
      if (!activeWorker || !await askWorkerToRefreshShell(activeWorker)) throw new Error('shell-refresh-failed');
    }

    pullRefreshIndicator.querySelector('.pull-refresh-label').textContent = 'Готово. Перезапускаємо…';
    reloadAfterRefresh();
  } catch {
    refreshRunning = false;
    resetPullIndicator();
    notify(navigator.onLine
      ? 'Не вдалося оновити офлайн-кеш. Попередня версія та музика збережені.'
      : 'Немає інтернету. Попередня версія та музика залишилися доступні офлайн.');
  }
}

appShell.addEventListener('touchstart', (event) => {
  if (event.touches.length !== 1 || content.scrollTop > 0 || refreshRunning || $('#modal-root').childElementCount) return;
  if (event.target.closest?.('#mini-player, #tab-bar, #player-root, #modal-root')) return;
  if (document.activeElement?.matches('input, textarea') && state.screen.tab !== 'search') return;
  content.classList.add('content--pulling');
  pullStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  pullDistance = 0;
}, { passive: true });

appShell.addEventListener('touchmove', (event) => {
  if (!pullStart || event.touches.length !== 1 || content.scrollTop > 0) return;
  const touch = event.touches[0];
  const deltaY = touch.clientY - pullStart.y;
  const deltaX = touch.clientX - pullStart.x;
  if (Math.abs(deltaX) > Math.max(12, deltaY * 0.7)) {
    pullStart = null;
    pullDistance = 0;
    resetPullIndicator();
    return;
  }
  if (deltaY <= 0) return;
  pullDistance = deltaY;
  event.preventDefault();
  updatePullIndicator(pullDistance, pullDistance >= PULL_REFRESH_THRESHOLD ? 'Відпустіть, щоб оновити' : 'Потягніть вниз для оновлення');
}, { passive: false });

appShell.addEventListener('touchend', () => {
  const shouldRefresh = pullDistance >= PULL_REFRESH_THRESHOLD;
  const releasedDistance = pullDistance;
  pullStart = null;
  pullDistance = 0;
  if (shouldRefresh) void forceRefreshOfflineShell(releasedDistance);
  else resetPullIndicator();
}, { passive: true });

appShell.addEventListener('touchcancel', () => {
  pullStart = null;
  pullDistance = 0;
  resetPullIndicator();
}, { passive: true });

document.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) return navigateTab(tab.dataset.tab);
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, kind, category, term } = button.dataset;

  switch (action) {
    case 'category': pushScreen({ type: 'category', category }); break;
    case 'jump-letter': jumpToMusicLetter(button.dataset.letter); break;
    case 'open-item': pushScreen({ type: 'item', kind, id }); break;
    case 'back': navigateBack(); break;
    case 'settings': pushScreen({ type: 'settings' }); break;
    case 'google-account': openGoogleAccount(); break;
    case 'close-google-account': closeGoogleAccount(); break;
    case 'google-signout':
      window.google?.accounts?.id?.disableAutoSelect();
      state.googleProfile = null;
      localStorage.removeItem('muzika-google-profile');
      closeGoogleAccount();
      render();
      notify('Ви вийшли з акаунта в застосунку.');
      break;
    case 'import': $('#audio-import').click(); break;
    case 'drive-import': importFromGoogleDrive(); break;
    case 'play-track': playTrack(allTracks().find((track) => track.id === id)); break;
    case 'toggle-play': playTrack(currentTrack()); break;
    case 'next-track': {
      await playNextTrack();
      break;
    }
    case 'play-list': {
      let list = [];
      if (button.dataset.category === 'downloaded') list = allTracks().filter((track) => track.local);
      else if (button.dataset.kind === 'artist') list = allTracks().filter((track) => track.artist === id);
      else if (button.dataset.kind === 'album') list = allTracks().filter((track) => track.album === id);
      else if (id === 'favorites') list = allTracks().filter((track) => state.favorites.includes(track.id));
      else if (id === 'recent') list = state.recentTrackIds.map((trackId) => allTracks().find((track) => track.id === trackId)).filter(Boolean);
      else list = allTracks();
      await playTrack(list.find((track) => track.local));
      break;
    }
    case 'shuffle-list': {
      let list = allTracks().filter((track) => track.local);
      if (button.dataset.kind === 'artist') list = list.filter((track) => track.artist === id);
      if (button.dataset.kind === 'album') list = list.filter((track) => track.album === id);
      if (id === 'favorites') list = list.filter((track) => state.favorites.includes(track.id));
      if (id === 'recent') list = state.recentTrackIds.map((trackId) => allTracks().find((track) => track.id === trackId)).filter(Boolean);
      const shuffled = list[Math.floor(Math.random() * list.length)];
      await playTrack(shuffled);
      break;
    }
    case 'clear-search': state.recentSearches = []; localStorage.removeItem('muzika-searches'); render(); break;
    case 'close-search': state.searchText = ''; state.tab = 'home'; state.screenStack = []; state.screen = { type: 'tab', tab: 'home' }; render(); break;
    case 'recent-search': state.searchText = term; render(); break;
    case 'song-menu': {
      const track = allTracks().find((item) => item.id === id);
      if (track) openSongMenu(track);
      else notify('Відкрийте меню поруч із піснею, щоб керувати нею.');
      break;
    }
    case 'close-song-menu': closeSongMenu(); break;
    case 'toggle-favorite': {
      if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter((favorite) => favorite !== id);
        notify('Вилучено з улюблених.');
      } else {
        state.favorites.push(id);
        notify('Додано до улюблених.');
      }
      localStorage.setItem('muzika-favorites', JSON.stringify(state.favorites));
      closeSongMenu();
      render();
      break;
    }
    case 'toggle-pin': togglePinned(id); break;
    case 'open-playlist-menu': {
      const track = allTracks().find((item) => item.id === id);
      if (track) openPlaylistMenu(track);
      break;
    }
    case 'back-to-song-menu': {
      const track = allTracks().find((item) => item.id === id);
      if (track) openSongMenu(track);
      break;
    }
    case 'add-to-favorites': addToFavorites(id); break;
    case 'play-next': queueTrackNext(id); break;
    case 'open-track-album': {
      const track = allTracks().find((item) => item.id === id);
      if (track) {
        closeSongMenu();
        pushScreen({ type: 'item', kind: 'album', id: track.album });
      }
      break;
    }
    case 'delete-track': await deleteTrackFromLibrary(id); break;
    case 'recent': pushScreen({ type: 'item', kind: 'playlist', id: 'recent' }); break;
    case 'all-albums': pushScreen({ type: 'category', category: 'albums' }); break;
    case 'now-playing': openNowPlaying(); break;
    case 'close-now-playing': closeNowPlaying(); break;
    case 'previous-track': await playPreviousTrack(); break;
    case 'player-queue': notify(state.queue.length ? `У черзі: ${state.queue.length} пісень.` : 'Черга відтворення порожня.'); break;
    case 'toggle-player-favorite': {
      const track = currentTrack();
      if (!track) break;
      if (state.favorites.includes(track.id)) state.favorites = state.favorites.filter((favorite) => favorite !== track.id);
      else state.favorites.push(track.id);
      localStorage.setItem('muzika-favorites', JSON.stringify(state.favorites));
      const favoriteButton = $('#player-root .now-playing-favorite');
      if (favoriteButton) {
        const favorite = state.favorites.includes(track.id);
        favoriteButton.innerHTML = icon('star', favorite ? 'is-favorite' : '');
        favoriteButton.setAttribute('aria-label', favorite ? 'Вилучити з улюблених' : 'Додати до улюблених');
      }
      break;
    }
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

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('#now-playing-root')) closeNowPlaying();
});

$('#player-root').addEventListener('input', (event) => {
  if (event.target.id === 'player-progress' && currentTrack()?.local) {
    audio.currentTime = Number(event.target.value);
    event.target.style.setProperty('--range-progress', `${audio.duration ? audio.currentTime / audio.duration * 100 : 0}%`);
    const time = $('#player-current-time');
    if (time) time.textContent = formatPlayerTime(audio.currentTime);
  }
  if (event.target.id === 'player-volume') audio.volume = Number(event.target.value);
});

$('#audio-import').addEventListener('change', (event) => {
  importFiles(event.target.files || []);
  event.target.value = '';
});

audio.addEventListener('ended', async () => {
  await playNextTrack();
});
audio.addEventListener('timeupdate', syncNowPlayingPlayback);
audio.addEventListener('loadedmetadata', syncNowPlayingPlayback);
audio.addEventListener('durationchange', syncNowPlayingPlayback);
audio.addEventListener('play', () => {
  state.isPlaying = true;
  renderPlayer();
  syncNowPlayingPlayback();
});
audio.addEventListener('pause', () => {
  state.isPlaying = false;
  renderPlayer();
  syncNowPlayingPlayback();
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
      reloadAfterRefresh();
    };
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (hadController) showRefreshIndicator();
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) shouldReload();
        else if (worker.state === 'redundant') resetPullIndicator();
      });
    });
    if (registration.installing) {
      if (hadController) showRefreshIndicator();
      registration.installing.addEventListener('statechange', (event) => {
        if (event.target.state === 'installed' && navigator.serviceWorker.controller) shouldReload();
        else if (event.target.state === 'redundant') resetPullIndicator();
      });
    }
    await registration.update().catch(() => {});
    if (registration.waiting && hadController) shouldReload();
  } catch {
    // The cached shell remains usable when the network or service worker is unavailable.
  }
}

async function initialize() {
  const refreshScrollTop = restoreScreenAfterRefresh();
  try { state.localTracks = await database.all(); } catch { state.localTracks = []; }
  const validTrackIds = new Set(state.localTracks.map((track) => track.id));
  state.favorites = state.favorites.filter((id) => validTrackIds.has(id));
  state.pinnedSongs = state.pinnedSongs.filter((id) => validTrackIds.has(id));
  state.recentTrackIds = state.recentTrackIds.filter((id) => validTrackIds.has(id));
  state.currentTrackId = validTrackIds.has(state.currentTrackId) ? state.currentTrackId : state.localTracks[0]?.id || '';
  localStorage.setItem('muzika-favorites', JSON.stringify(state.favorites));
  localStorage.setItem('muzika-pinned-songs', JSON.stringify(state.pinnedSongs));
  localStorage.setItem('muzika-recent-tracks', JSON.stringify(state.recentTrackIds));
  localStorage.removeItem('muzika-hidden-tracks');
  render();
  if (refreshScrollTop !== null) content.scrollTop = refreshScrollTop;
  startServiceWorkerUpdateCheck();
}

initialize();
