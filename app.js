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
  library: '<path d="M8 3h8v1.5H8zM6 5.5h12v2H6zM7 8.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" fill="currentColor" stroke="none"/><path d="M13.5 16v-5l3.5-.7v5" fill="none" stroke="#111113" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12.5" cy="17" r="1.7" fill="#111113" stroke="none"/><circle cx="15.5" cy="15.5" r="1.7" fill="#111113" stroke="none"/>',
  search: '<circle cx="10.8" cy="10.8" r="7.1"/><path d="m16 16 5 5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="M3 5v14l8-7zM12 5v14l8-7z" fill="currentColor" stroke="none"/>',
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
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" fill="currentColor" stroke="none"/>',
  pin: '<path d="M16 3 8 11l-3-1-2 2 6 3 3 6 2-2-1-3 8-8-5-5Z"/><path d="m3 21 7-7"/>',
  playlistAdd: '<path d="M4 6h11M4 12h11M4 18h7"/><path d="M19 3v8m-4-4h8"/>',
  queue: '<path d="M4 6h12M4 12h12M4 18h8"/><path d="m17 16 5 3-5 3z" fill="currentColor" stroke="none"/>',
  albumFile: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M12 8v8"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  share: '<path d="M12 15V3m-5 5 5-5 5 5"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/>',
  station: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.5 4.5a10.5 10.5 0 0 0 0 15M19.5 4.5a10.5 10.5 0 0 1 0 15M18 3v5m-2.5-2.5h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  dislike: '<path d="M7 10V4a2 2 0 0 1 2-2h8.2a2 2 0 0 1 1.9 1.4l2.1 7a2 2 0 0 1-1.9 2.6h-5.1l.8 4.2a2.5 2.5 0 0 1-4.4 2L7 14"/><path d="M2 9h5v8H2z"/>',
  plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8m-4-4h8"/>'
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
  searchCategory: 'top',
  youtubeResults: [],
  youtubeSearchQuery: '',
  youtubeSearchCategory: '',
  youtubeSearchStatus: 'idle',
  youtubeSearchError: '',
  youtubeChannelId: '',
  recentSearches: JSON.parse(localStorage.getItem('muzika-searches') || '[]'),
  youtubeLibrary: JSON.parse(localStorage.getItem('muzika-youtube-library') || '[]'),
  youtubeFavorites: JSON.parse(localStorage.getItem('muzika-youtube-favorites') || '[]'),
  hiddenYouTubeResultIds: [],
  hiddenSearchTrackIds: [],
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

let youtubeSearchTimer = null;
let youtubeSearchController = null;
let youtubeSearchRequestId = 0;
const activeAudioDownloads = new Set();
const MAX_DIRECT_AUDIO_BYTES = 120 * 1024 * 1024;
let directAudioDownloadController = null;
localStorage.removeItem('muzika-download-server');
localStorage.removeItem('muzika-download-token');
if (location.hash.includes('muzika-download-server=') || location.hash.includes('muzika-download-token=')) {
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}
const YOUTUBE_API_KEY = 'AIzaSyC2srpkO7s3ojMb4b5OpQ2YV2Ep0RoNJRM';

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

function openSearchTrackMenu(track) {
  const favorite = state.favorites.includes(track.id);
  const title = safeText(track.title);
  const artist = safeText(track.artist || 'Невідомий виконавець');
  $('#modal-root').innerHTML = `<div id="search-track-menu-backdrop" class="action-modal"><section class="action-sheet youtube-action-sheet" role="dialog" aria-modal="true" aria-label="Дії з піснею"><div class="action-track-head">${artMarkup(track.art, track.album, 'action-art')}<div class="youtube-menu-copy"><strong>${title}</strong><small>${artist}</small></div></div><div class="youtube-menu-quick"><button class="youtube-menu-quick-action" disabled>${icon('plusCircle')}<span>У медіатеці</span></button><button class="youtube-menu-quick-action" data-action="toggle-favorite" data-id="${safeText(track.id)}">${icon('star', favorite ? 'youtube-favorite-active' : '')}<span>${favorite ? 'В улюблених' : 'Додати до улюблених'}</span></button><button class="youtube-menu-quick-action" data-action="share-local-track" data-id="${safeText(track.id)}">${icon('share')}<span>Поширити</span></button></div><div class="youtube-menu-group"><button class="song-action-row youtube-menu-row" data-action="open-playlist-menu" data-id="${safeText(track.id)}">${icon('playlistAdd')}<span>Додати до підбірки</span></button><button class="song-action-row youtube-menu-row" data-action="play-next" data-id="${safeText(track.id)}">${icon('queue')}<span>Відтворити далі</span></button><button class="song-action-row youtube-menu-row" data-action="search-youtube-text" data-title="${artist}">${icon('station')}<span>Створити станцію</span></button></div><div class="youtube-menu-group"><button class="song-action-row youtube-menu-row" data-action="open-track-album" data-id="${safeText(track.id)}">${icon('albumFile')}<span>Перейти до альбому<small>${safeText(track.album || '')}</small></span></button><button class="song-action-row youtube-menu-row" data-action="open-item" data-kind="artist" data-id="${artist}">${icon('artist')}<span>Перейти до виконавця</span></button><button class="song-action-row youtube-menu-row" data-action="open-item" data-kind="artist" data-id="${artist}">${icon('info')}<span>Переглянути дані про автора</span></button></div><div class="youtube-menu-group youtube-menu-group--last"><button class="song-action-row youtube-menu-row" data-action="hide-search-track" data-id="${safeText(track.id)}">${icon('dislike')}<span>Пропонувати менше</span></button></div></section></div>`;
  $('#search-track-menu-backdrop').addEventListener('click', (event) => {
    if (event.target.id === 'search-track-menu-backdrop') closeSongMenu();
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
  if (queuedId && typeof queuedId === 'object' && queuedId.source === 'youtube') {
    openYouTubePlayer(queuedId.item);
    notify('Відкрито наступне відео YouTube.');
    return;
  }
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
  const favoriteCount = allTracks().filter((track) => state.favorites.includes(track.id)).length + state.youtubeFavorites.length;
  const favoritesSection = favoriteCount ? `${sectionHeading('Ваші підбірки')}<div class="featured-strip">
    <button class="feature-card feature-card--favorite" data-action="open-item" data-kind="playlist" data-id="favorites">
      <div class="favorite-art">${icon('star')}</div><span class="feature-kicker">Ваша медіатека</span><strong>Улюблені пісні</strong><span>${favoriteCount} ${favoriteCount === 1 ? 'пісня' : 'пісень'}</span>
    </button>
  </div>` : '';
  const recentSection = recentlyPlayed.length ? `${sectionHeading('Недавно прослухані', 'Усі', 'recent')}<div class="song-list">${recentlyPlayed.slice(0, 5).map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>` : '';
  const librarySection = recentlyAdded.length ? `${sectionHeading('Недавно додані')}<div class="song-list">${recentlyAdded.map((track, i) => songRow(track, i, { showAlbum: true })).join('')}</div>` : `<div class="empty-state empty-state--home">${icon('music')}<strong>Ваша медіатека порожня</strong></div>`;
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
    ${state.youtubeLibrary.length ? `${sectionHeading('Збережені з YouTube · онлайн')}<div class="song-list">${state.youtubeLibrary.map((item) => youtubeResultRow(item, { saved: true })).join('')}</div>` : ''}`;
}

function renderSearch() {
  return `<header class="search-header"><div class="search-box">${icon('search')}<input id="search-input" type="search" placeholder="Виконавці, пісні, альбоми" value="${safeText(state.searchText)}" autocomplete="off"></div><button class="search-close" data-action="close-search" aria-label="Очистити пошук або закрити">${icon('close')}</button></header>
    <div id="search-body">${renderSearchBody()}</div>`;
}

function refreshSearchResults() {
  if (state.screen.type === 'tab' && state.screen.tab === 'search' && $('#search-body')) {
    $('#search-body').innerHTML = renderSearchBody();
  }
}

function cancelYouTubeSearch() {
  clearTimeout(youtubeSearchTimer);
  youtubeSearchController?.abort();
  youtubeSearchController = null;
  youtubeSearchRequestId += 1;
  state.youtubeResults = [];
  state.youtubeSearchQuery = '';
  state.youtubeSearchCategory = '';
  state.youtubeSearchStatus = 'idle';
  state.youtubeSearchError = '';
  state.youtubeChannelId = '';
}

function scheduleYouTubeSearch(query, category = state.searchCategory, { immediate = false, channelId = '' } = {}) {
  const searchQuery = query.trim();
  state.hiddenYouTubeResultIds = [];
  clearTimeout(youtubeSearchTimer);
  youtubeSearchController?.abort();
  youtubeSearchController = null;
  youtubeSearchRequestId += 1;
  state.youtubeChannelId = channelId;
  state.youtubeResults = [];
  state.youtubeSearchQuery = searchQuery;
  state.youtubeSearchCategory = category;
  state.youtubeSearchError = '';

  if (searchQuery.length < 2) {
    state.youtubeSearchStatus = 'idle';
    refreshSearchResults();
    return;
  }

  state.youtubeSearchStatus = 'loading';
  refreshSearchResults();
  const requestId = youtubeSearchRequestId;
  youtubeSearchTimer = setTimeout(() => fetchYouTubeSearch(searchQuery, category, channelId, requestId), immediate ? 0 : 450);
}

async function fetchYouTubeSearch(query, category, channelId, requestId) {
  if (!YOUTUBE_API_KEY) {
    state.youtubeSearchStatus = 'error';
    state.youtubeSearchError = 'Глобальний пошук ще не налаштований.';
    refreshSearchResults();
    return;
  }
  if (!navigator.onLine) {
    state.youtubeSearchStatus = 'offline';
    refreshSearchResults();
    return;
  }

  const type = category === 'artists' ? 'channel' : category === 'albums' ? 'playlist' : 'video';
  const parameters = new URLSearchParams({ part: 'snippet', q: query, type, maxResults: '20', key: YOUTUBE_API_KEY });
  if (channelId) parameters.set('channelId', channelId);
  if (type === 'video') {
    parameters.set('videoCategoryId', '10');
  }
  const controller = new AbortController();
  youtubeSearchController = controller;
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${parameters}`, { signal: controller.signal });
    const payload = await response.json();
    if (!response.ok) {
      const reason = payload.error?.errors?.[0]?.reason || payload.error?.status || '';
      const message = reason.toLowerCase().includes('quota')
        ? 'Вичерпано денний ліміт пошуку YouTube. Спробуйте пізніше.'
        : reason.toLowerCase().includes('referer')
          ? 'Пошук доступний лише на опублікованому сайті. Оновіть сторінку GitHub Pages.'
          : reason.toLowerCase().includes('key')
            ? 'Не вдалося авторизувати пошук YouTube. Перевірте налаштування API.'
            : 'Не вдалося завантажити результати YouTube. Перевірте інтернет і спробуйте ще раз.';
      throw new Error(message);
    }
    if (requestId !== youtubeSearchRequestId) return;
    state.youtubeResults = Array.isArray(payload.items) ? payload.items : [];
    state.youtubeSearchStatus = 'ready';
    state.youtubeSearchError = '';
    refreshSearchResults();
  } catch (error) {
    if (error.name === 'AbortError' || requestId !== youtubeSearchRequestId) return;
    state.youtubeSearchStatus = 'error';
    state.youtubeSearchError = error.message || 'Не вдалося завантажити результати. Спробуйте ще раз.';
    refreshSearchResults();
  }
}

function youtubeResultRow(item, { saved = false } = {}) {
  const resultKind = item._kind || (item.id?.videoId ? 'video' : item.id?.channelId ? 'channel' : 'playlist');
  const id = item._id || item.id?.videoId || item.id?.channelId || item.id?.playlistId;
  if (!id) return '';
  const image = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '';
  const art = image.startsWith('https://') ? `<img class="song-art youtube-result-art ${resultKind === 'channel' ? 'youtube-result-art--round' : ''}" src="${safeText(image)}" alt="" loading="lazy">` : `<span class="song-art youtube-result-placeholder">${icon(resultKind === 'channel' ? 'artist' : resultKind === 'playlist' ? 'playlist' : 'music')}</span>`;
  const label = resultKind === 'video' ? `Пісня · ${item.snippet?.channelTitle || 'YouTube'}` : resultKind === 'channel' ? 'Виконавець · YouTube' : `Плейлист · ${item.snippet?.channelTitle || 'YouTube'}`;
  return `<div class="song-row search-song-row youtube-result-row ${saved ? 'youtube-result-row--saved' : ''}">${art}<button class="song-main" data-action="open-youtube-result" data-kind="${resultKind}" data-id="${safeText(id)}"><span class="song-title">${safeText(item.snippet?.title || 'Без назви')}</span><span class="song-artist">${safeText(label)}${saved ? ' · Онлайн' : ''}</span></button><button class="icon-button song-more" data-action="youtube-result-menu" data-kind="${resultKind}" data-id="${safeText(id)}" aria-label="Додаткові дії">${icon('more')}</button></div>`;
}

function findYouTubeResult(kind, id) {
  return [...state.youtubeResults, ...state.youtubeLibrary, ...state.youtubeFavorites].find((item) => {
    const itemId = item._id || item.id?.videoId || item.id?.channelId || item.id?.playlistId;
    const itemKind = item._kind || (item.id?.videoId ? 'video' : item.id?.channelId ? 'channel' : 'playlist');
    return itemId === id && itemKind === kind;
  });
}

function youtubeResultKey(kind, id) {
  return `${kind}:${id}`;
}

function youtubeResultKeys(items) {
  return items.map((item) => youtubeResultKey(item._kind || (item.id?.videoId ? 'video' : item.id?.channelId ? 'channel' : 'playlist'), item._id || item.id?.videoId || item.id?.channelId || item.id?.playlistId));
}

function saveYouTubeResult(item, kind, id) {
  const key = youtubeResultKey(kind, id);
  const existingIndex = youtubeResultKeys(state.youtubeLibrary).indexOf(key);
  if (existingIndex >= 0) {
    state.youtubeLibrary.splice(existingIndex, 1);
    localStorage.setItem('muzika-youtube-library', JSON.stringify(state.youtubeLibrary));
    closeSongMenu();
    render();
    notify('Видалено зі збережених YouTube.');
    return;
  }
  if (item) state.youtubeLibrary.unshift({ ...item, _kind: kind, _id: id });
  localStorage.setItem('muzika-youtube-library', JSON.stringify(state.youtubeLibrary));
  closeSongMenu();
  render();
  notify('Збережено в медіатеці. Для відтворення потрібен інтернет.');
}

function toggleYouTubeFavorite(item, kind, id) {
  const key = youtubeResultKey(kind, id);
  const existingIndex = youtubeResultKeys(state.youtubeFavorites).indexOf(key);
  if (existingIndex >= 0) state.youtubeFavorites.splice(existingIndex, 1);
  else if (item) state.youtubeFavorites.unshift({ ...item, _kind: kind, _id: id });
  localStorage.setItem('muzika-youtube-favorites', JSON.stringify(state.youtubeFavorites));
  closeSongMenu();
  render();
  notify(existingIndex >= 0 ? 'Вилучено з улюблених.' : 'Додано до улюблених.');
}

function searchYouTubeChannel(channelId, channelTitle, category = 'top') {
  if (!channelId) return notify('Для цього результату немає даних про канал.');
  state.searchText = channelTitle || state.searchText;
  state.searchCategory = category;
  closeSongMenu();
  if (state.screen.type !== 'tab' || state.screen.tab !== 'search') {
    state.tab = 'search';
    state.screenStack = [];
    state.screen = { type: 'tab', tab: 'search' };
  }
  render();
  scheduleYouTubeSearch(state.searchText, category, { immediate: true, channelId });
}

function searchYouTubeText(query, category = 'top') {
  state.searchText = query || state.searchText;
  state.searchCategory = category;
  closeSongMenu();
  if (state.screen.type !== 'tab' || state.screen.tab !== 'search') {
    state.tab = 'search';
    state.screenStack = [];
    state.screen = { type: 'tab', tab: 'search' };
  }
  render();
  scheduleYouTubeSearch(state.searchText, category, { immediate: true });
}

async function shareLocalTrack(trackId) {
  const track = allTracks().find((item) => item.id === trackId);
  if (!track) return;
  const title = `${track.title} — ${track.artist}`;
  try {
    if (navigator.share) await navigator.share({ title, text: title });
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(title);
      notify('Назву скопійовано.');
    } else notify('Не вдалося поділитися піснею.');
  } catch (error) {
    if (error.name !== 'AbortError') notify('Не вдалося поділитися піснею.');
  }
}

async function shareYouTubeResult(item, kind, id) {
  const url = kind === 'playlist' ? `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}` : kind === 'channel' ? `https://www.youtube.com/channel/${encodeURIComponent(id)}` : `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const title = item?.snippet?.title || 'YouTube';
  try {
    if (navigator.share) await navigator.share({ title, url });
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      notify('Посилання скопійовано.');
    } else notify('Не вдалося поділитися цим результатом.');
  } catch (error) {
    if (error.name !== 'AbortError') notify('Не вдалося поділитися цим результатом.');
  }
}

function directAudioFormat(url, contentType) {
  const type = (contentType || '').split(';', 1)[0].trim().toLowerCase();
  const extension = /\.([a-z0-9]{2,5})$/i.exec(url.pathname)?.[1]?.toLowerCase() || '';
  const byExtension = {
    mp3: ['audio/mpeg', 'mp3'],
    m4a: ['audio/mp4', 'm4a'],
    mp4: ['audio/mp4', 'm4a'],
    aac: ['audio/aac', 'aac'],
    ogg: ['audio/ogg', 'ogg'],
    opus: ['audio/ogg', 'opus'],
    wav: ['audio/wav', 'wav'],
    flac: ['audio/flac', 'flac']
  };
  const byType = {
    'audio/mpeg': ['audio/mpeg', 'mp3'],
    'audio/mp3': ['audio/mpeg', 'mp3'],
    'audio/mp4': ['audio/mp4', 'm4a'],
    'audio/x-m4a': ['audio/mp4', 'm4a'],
    'audio/aac': ['audio/aac', 'aac'],
    'audio/x-aac': ['audio/aac', 'aac'],
    'audio/ogg': ['audio/ogg', 'ogg'],
    'audio/opus': ['audio/opus', 'opus'],
    'audio/wav': ['audio/wav', 'wav'],
    'audio/x-wav': ['audio/wav', 'wav'],
    'audio/flac': ['audio/flac', 'flac'],
    'audio/x-flac': ['audio/flac', 'flac']
  };
  if (type.startsWith('audio/')) {
    const supportedType = byType[type];
    if (!supportedType) return null;
    const preferredExtension = extension === 'opus' && type === 'audio/ogg' ? 'opus' : supportedType[1];
    return { type: supportedType[0], extension: preferredExtension };
  }
  if (type && !['application/octet-stream', 'binary/octet-stream', 'application/force-download', 'application/download'].includes(type)) return null;
  return byExtension[extension] ? { type: byExtension[extension][0], extension: byExtension[extension][1] } : null;
}

function isYouTubeMediaHost(hostname) {
  const host = hostname.toLowerCase();
  return host === 'youtu.be' || host.endsWith('.youtu.be') || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com') || host === 'googlevideo.com' || host.endsWith('.googlevideo.com');
}

function safeAudioFilename(value) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function updateDirectDownloadProgress(loaded, total) {
  const progress = $('#direct-audio-progress');
  const fill = $('#direct-audio-progress-fill');
  const label = $('#direct-audio-progress-label');
  if (!progress || !fill || !label) return;
  progress.hidden = false;
  if (total > 0) {
    const percent = Math.min(100, Math.floor(loaded / total * 100));
    progress.classList.remove('is-indeterminate');
    fill.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
    label.textContent = `Завантажено ${percent}%`;
  } else {
    progress.classList.add('is-indeterminate');
    progress.removeAttribute('aria-valuenow');
    label.textContent = `Завантажено ${(loaded / (1024 * 1024)).toFixed(1)} МБ`;
  }
}

function resetDirectDownloadProgress() {
  const progress = $('#direct-audio-progress');
  const fill = $('#direct-audio-progress-fill');
  const label = $('#direct-audio-progress-label');
  const button = $('[data-action="download-direct-audio"]');
  const cancel = $('[data-action="cancel-direct-audio-download"]');
  if (progress) {
    progress.hidden = true;
    progress.classList.remove('is-indeterminate');
  }
  if (fill) fill.style.width = '0%';
  if (label) label.textContent = '';
  if (button) {
    button.disabled = false;
    button.textContent = 'Завантажити на пристрій';
  }
  if (cancel) cancel.hidden = true;
}

async function downloadDirectAudio() {
  const rawUrl = $('#direct-audio-url')?.value.trim() || '';
  const titleInput = $('#direct-audio-title')?.value.trim() || '';
  const artistInput = $('#direct-audio-artist')?.value.trim() || '';
  let source;
  try { source = new URL(rawUrl); }
  catch { return notify('Вставте повну HTTPS-посилання на аудіофайл.'); }
  if (source.protocol !== 'https:' || !source.hostname || source.username || source.password || isYouTubeMediaHost(source.hostname)) {
    return notify('Потрібне пряме HTTPS-посилання на аудіофайл із дозволеного джерела.');
  }
  if (!navigator.onLine) return notify('Для завантаження підключіться до інтернету.');

  const downloadKey = `direct:${source.href}`;
  if (activeAudioDownloads.size) return notify(activeAudioDownloads.has(downloadKey) ? 'Цей файл уже завантажується.' : 'Зачекайте завершення поточного завантаження.');
  const controller = new AbortController();
  directAudioDownloadController = controller;
  activeAudioDownloads.add(downloadKey);
  const downloadButton = $('[data-action="download-direct-audio"]');
  const cancelButton = $('[data-action="cancel-direct-audio-download"]');
  if (downloadButton) {
    downloadButton.disabled = true;
    downloadButton.textContent = 'Завантажуємо…';
  }
  if (cancelButton) cancelButton.hidden = false;
  notify('⏳ Починаємо завантаження аудіофайлу…');

  try {
    const response = await fetch(source.href, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Джерело повернуло помилку ${response.status}.`);
    const resolvedUrl = new URL(response.url || source.href);
    if (resolvedUrl.protocol !== 'https:' || isYouTubeMediaHost(resolvedUrl.hostname)) {
      throw new Error('Джерело переспрямувало на непідтримуване посилання.');
    }
    const format = directAudioFormat(resolvedUrl, response.headers.get('content-type'));
    if (!format) throw new Error('За цим посиланням не знайдено підтримуваний аудіофайл.');

    const expectedLength = Number(response.headers.get('content-length')) || 0;
    if (expectedLength > MAX_DIRECT_AUDIO_BYTES) throw new Error('Файл перевищує ліміт 120 МБ.');
    const chunks = [];
    let loaded = 0;
    let lastProgressAt = 0;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        if (loaded > MAX_DIRECT_AUDIO_BYTES) {
          await reader.cancel();
          throw new Error('Файл перевищує ліміт 120 МБ.');
        }
        chunks.push(value);
        const now = Date.now();
        if (now - lastProgressAt > 350) {
          updateDirectDownloadProgress(loaded, expectedLength);
          lastProgressAt = now;
        }
      }
    } else {
      const blob = await response.blob();
      loaded = blob.size;
      if (loaded > MAX_DIRECT_AUDIO_BYTES) throw new Error('Файл перевищує ліміт 120 МБ.');
      chunks.push(blob);
    }
    if (!loaded) throw new Error('Джерело повернуло порожній файл.');

    const audioBlob = new Blob(chunks, { type: format.type });
    if (!audioBlob.size || audioBlob.size !== loaded) throw new Error('Завантаження завершилося некоректно. Спробуйте ще раз.');
    updateDirectDownloadProgress(loaded, expectedLength || loaded);
    const encodedFilename = resolvedUrl.pathname.split('/').pop() || '';
    let urlFilename = encodedFilename;
    try { urlFilename = decodeURIComponent(encodedFilename); } catch { /* Use the encoded filename if decoding fails. */ }
    urlFilename = urlFilename.replace(/\.[^.]+$/, '');
    const title = safeAudioFilename(titleInput || urlFilename || 'Аудіофайл') || 'Аудіофайл';
    const artist = safeAudioFilename(artistInput);
    const extension = format.extension || 'mp3';
    const filename = safeAudioFilename(artist ? `${artist} — ${title}.${extension}` : `${title}.${extension}`);
    const audioFile = new File([audioBlob], filename, { type: format.type });
    const saved = await storeAudioFiles([audioFile], { notifyUser: false });
    if (!saved) throw new Error('Не вдалося зберегти аудіо. Перевірте вільне місце на пристрої.');

    const urlInput = $('#direct-audio-url');
    if (urlInput) urlInput.value = '';
    notify(`✅ «${title}» збережено на пристрої для офлайн-прослуховування.`);
  } catch (error) {
    if (error.name === 'AbortError') notify('Завантаження скасовано.');
    else {
      console.error('Не вдалося завантажити аудіофайл:', error);
      const message = error instanceof TypeError
        ? 'Джерело забороняє завантаження з цього застосунку (CORS). Використайте пряме посилання з дозволом для браузера.'
        : error.message || 'Не вдалося завантажити аудіофайл.';
      notify(`❌ ${message}`);
    }
  } finally {
    activeAudioDownloads.delete(downloadKey);
    if (directAudioDownloadController === controller) directAudioDownloadController = null;
    resetDirectDownloadProgress();
  }
}

function openYouTubePlayer(item) {
  const id = item?.id?.videoId || item?.id?.playlistId;
  if (!id || !/^[\w-]{8,80}$/.test(id)) return;
  const playlist = Boolean(item.id?.playlistId);
  const playerUrl = playlist
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(id)}&autoplay=1&playsinline=1`
    : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&controls=1&playsinline=1`;
  audio.pause();
  const root = $('#modal-root');
  root.innerHTML = `<div id="youtube-player-backdrop" class="action-modal youtube-player-backdrop"><section class="youtube-player-sheet" role="dialog" aria-modal="true" aria-label="Відтворення YouTube"><button class="account-close" data-action="close-youtube-player" aria-label="Закрити">${icon('close')}</button><div class="youtube-embed"><iframe src="${safeText(playerUrl)}" title="${safeText(item.snippet?.title || 'YouTube')}" allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><h2>${safeText(item.snippet?.title || 'YouTube')}</h2><p>${safeText(item.snippet?.channelTitle || 'YouTube')}</p></section></div>`;
  root.querySelector('#youtube-player-backdrop').addEventListener('click', (event) => {
    if (event.target.id === 'youtube-player-backdrop') closeYouTubePlayer();
  });
}

function closeYouTubePlayer() {
  $('#modal-root').innerHTML = '';
}

function openYouTubeResultMenu(item, kind, id) {
  if (!item) return;
  const resultKey = youtubeResultKey(kind, id);
  const inLibrary = youtubeResultKeys(state.youtubeLibrary).includes(resultKey);
  const isFavorite = youtubeResultKeys(state.youtubeFavorites).includes(resultKey);
  const image = item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || '';
  const art = image.startsWith('https://') ? `<img class="action-art ${kind === 'channel' ? 'youtube-result-art--round' : ''}" src="${safeText(image)}" alt="" loading="lazy">` : `<span class="action-art">${icon(kind === 'channel' ? 'artist' : kind === 'playlist' ? 'playlist' : 'music')}</span>`;
  const title = safeText(item?.snippet?.title || 'YouTube');
  const subtitle = safeText(item?.snippet?.channelTitle || 'Результат пошуку');
  const channelId = item.snippet?.channelId || (kind === 'channel' ? id : '');
  const channelTitle = safeText(item.snippet?.channelTitle || item.snippet?.title || '');
  const quickActions = `<div class="youtube-menu-quick"><button class="youtube-menu-quick-action" data-action="save-youtube-result" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('plusCircle')}<span>${inLibrary ? 'У медіатеці' : 'Додати'}</span></button><button class="youtube-menu-quick-action" data-action="toggle-youtube-favorite" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('star', isFavorite ? 'youtube-favorite-active' : '')}<span>${isFavorite ? 'В улюблених' : 'Додати до улюблених'}</span></button><button class="youtube-menu-quick-action" data-action="share-youtube-result" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('share')}<span>Поширити</span></button></div>`;
  const playlistActions = `<div class="youtube-menu-group"><button class="song-action-row youtube-menu-row" data-action="open-youtube-playlist-menu" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('playlistAdd')}<span>Додати до підбірки</span></button>${kind === 'video' ? `<button class="song-action-row youtube-menu-row" data-action="queue-youtube-result" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('queue')}<span>Відтворити далі</span></button><button class="song-action-row youtube-menu-row" data-action="youtube-create-station" data-kind="${safeText(kind)}" data-id="${safeText(id)}" data-channel="${safeText(channelId)}" data-title="${channelTitle}">${icon('station')}<span>Створити станцію</span></button>` : `<button class="song-action-row youtube-menu-row" data-action="open-youtube-result" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('play')}<span>Відтворити</span></button>`}</div>`;
  const creatorActions = `<div class="youtube-menu-group">${kind === 'video' ? `<button class="song-action-row youtube-menu-row" data-action="youtube-search-albums" data-kind="${safeText(kind)}" data-id="${safeText(id)}" data-channel="${safeText(channelId)}" data-title="${channelTitle}">${icon('albumFile')}<span>Перейти до альбому</span></button>` : ''}<button class="song-action-row youtube-menu-row" data-action="youtube-open-channel" data-kind="${safeText(kind)}" data-id="${safeText(id)}" data-channel="${safeText(channelId)}" data-title="${channelTitle}">${icon('artist')}<span>Перейти до виконавця</span></button><button class="song-action-row youtube-menu-row" data-action="youtube-about-creator" data-kind="${safeText(kind)}" data-id="${safeText(id)}" data-channel="${safeText(channelId)}" data-title="${channelTitle}">${icon('info')}<span>Переглянути дані про автора</span></button></div>`;
  const feedback = `<div class="youtube-menu-group youtube-menu-group--last"><button class="song-action-row youtube-menu-row" data-action="youtube-suggest-less" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('dislike')}<span>Пропонувати менше</span></button></div>`;
  $('#modal-root').innerHTML = `<div id="youtube-result-menu-backdrop" class="action-modal"><section class="action-sheet youtube-action-sheet" role="dialog" aria-modal="true" aria-label="Дії з результатом пошуку"><div class="action-track-head">${art}<div class="youtube-menu-copy"><strong>${title}</strong><small>${subtitle}</small></div></div>${quickActions}${playlistActions}${creatorActions}${feedback}</section></div>`;
  $('#youtube-result-menu-backdrop').addEventListener('click', (event) => {
    if (event.target.id === 'youtube-result-menu-backdrop') closeSongMenu();
  });
}

function openYouTubePlaylistMenu(item, kind, id) {
  const key = youtubeResultKey(kind, id);
  const isFavorite = youtubeResultKeys(state.youtubeFavorites).includes(key);
  const title = safeText(item?.snippet?.title || 'YouTube');
  $('#modal-root').innerHTML = `<div id="youtube-playlist-menu-backdrop" class="action-modal"><section class="action-sheet youtube-action-sheet" role="dialog" aria-modal="true" aria-label="Додати до підбірки"><div class="action-track-head"><span class="action-art">${icon('music')}</span><div class="youtube-menu-copy"><strong>${title}</strong><small>Додати до підбірки</small></div></div><button class="song-action-row youtube-menu-row" data-action="toggle-youtube-favorite" data-kind="${safeText(kind)}" data-id="${safeText(id)}">${icon('star', isFavorite ? 'youtube-favorite-active' : '')}<span>${isFavorite ? 'Вилучити з улюблених' : 'Улюблені пісні'}</span></button></section></div>`;
  $('#youtube-playlist-menu-backdrop').addEventListener('click', (event) => {
    if (event.target.id === 'youtube-playlist-menu-backdrop') closeSongMenu();
  });
}

function openYouTubeCreatorInfo(item, channelId, channelTitle) {
  const title = safeText(channelTitle || item?.snippet?.channelTitle || item?.snippet?.title || 'Невідомий канал');
  $('#modal-root').innerHTML = `<div id="youtube-creator-backdrop" class="action-modal"><section class="action-sheet youtube-action-sheet" role="dialog" aria-modal="true" aria-label="Дані про автора"><div class="action-track-head"><span class="action-art youtube-result-placeholder">${icon('artist')}</span><div class="youtube-menu-copy"><strong>${title}</strong><small>Канал YouTube</small></div></div><p class="youtube-creator-note">Це автор відео з глобального пошуку. Пісні відтворюються через офіційний програвач YouTube.</p>${channelId ? `<button class="song-action-row youtube-menu-row" data-action="youtube-open-channel" data-channel="${safeText(channelId)}" data-title="${title}">${icon('search')}<span>Знайти інші відео автора</span></button>` : ''}</section></div>`;
  $('#youtube-creator-backdrop').addEventListener('click', (event) => {
    if (event.target.id === 'youtube-creator-backdrop') closeSongMenu();
  });
}

function renderSearchBody() {
  const query = state.searchText.trim();
  if (!query) return `<div class="section-heading"><h2>Недавні пошуки</h2><button class="text-action text-action--red" data-action="clear-search">Очистити</button></div>
      <div class="recent-searches">${state.recentSearches.map((term) => `<button data-action="recent-search" data-term="${safeText(term)}">${icon('search')}<span>${safeText(term)}</span>${icon('more')}</button>`).join('') || '<div class="empty-state">Ваші пошуки з’являться тут.</div>'}</div>`;

  const normalizedQuery = query.toLocaleLowerCase();
  const tracks = prioritizePinned(allTracks().filter((track) => `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase().includes(normalizedQuery) && !state.hiddenSearchTrackIds.includes(`${normalizedQuery}:${track.id}`)));
  const artists = libraryArtists().filter((artist) => artist.title.toLocaleLowerCase().includes(normalizedQuery));
  const albums = libraryAlbums().filter((album) => `${album.title} ${album.artist}`.toLocaleLowerCase().includes(normalizedQuery));
  const tabs = [['top', 'Найкращі результати'], ['artists', 'Виконавці'], ['albums', 'Альбоми']];
  const tabMarkup = `<nav class="search-tabs" role="tablist" aria-label="Категорії пошуку">${tabs.map(([key, title]) => `<button class="search-tab ${state.searchCategory === key ? 'search-tab--active' : ''}" role="tab" aria-selected="${state.searchCategory === key}" data-action="search-category" data-category="${key}">${title}</button>`).join('')}</nav>`;
  const artistRows = artists.map((artist) => `<button class="search-result-entity" data-action="open-item" data-kind="artist" data-id="${safeText(artist.id)}">${artMarkup(artist.art, artist.title, 'search-result-art search-result-art--round')}<span class="search-result-copy"><strong>${safeText(artist.title)}</strong><small>Виконавець</small></span>${icon('back', 'chevron')}</button>`).join('');
  const trackRows = tracks.map((track) => `<div class="song-row search-song-row">${artMarkup(track.art, track.album, 'song-art')}<button class="song-main" data-action="play-track" data-id="${safeText(track.id)}"><span class="song-title">${safeText(track.title)}${track.explicit ? '<span class="explicit-mark">E</span>' : ''}</span><span class="song-artist">Пісня · ${safeText(track.artist)}</span></button><button class="icon-button song-more" data-action="search-track-menu" data-id="${safeText(track.id)}" aria-label="Додаткові дії">${icon('more')}</button></div>`).join('');
  const albumRows = albums.map((album) => `<button class="search-result-entity" data-action="open-item" data-kind="album" data-id="${safeText(album.id)}">${artMarkup(album.art, album.title, 'search-result-art')}<span class="search-result-copy"><strong>${safeText(album.title)}</strong><small>Альбом · ${safeText(album.artist)}</small></span>${icon('back', 'chevron')}</button>`).join('');
  const hasRemoteResults = state.youtubeSearchQuery === query && state.youtubeSearchCategory === state.searchCategory;
  const visibleYouTubeResults = state.youtubeResults.filter((item) => {
    const kind = item.id?.videoId ? 'video' : item.id?.channelId ? 'channel' : 'playlist';
    const id = item.id?.videoId || item.id?.channelId || item.id?.playlistId;
    return !state.hiddenYouTubeResultIds.includes(youtubeResultKey(kind, id));
  });
  const remoteStatus = hasRemoteResults && state.youtubeSearchStatus === 'loading' ? '<div class="search-loading"><span></span>Пошук YouTube…</div>'
    : hasRemoteResults && state.youtubeSearchStatus === 'offline' ? '<div class="empty-state">Немає інтернету. Показано результати з медіатеки пристрою.</div>'
      : hasRemoteResults && state.youtubeSearchStatus === 'error' ? `<div class="empty-state">${safeText(state.youtubeSearchError)}</div>`
        : hasRemoteResults && state.youtubeSearchStatus === 'ready' && !visibleYouTubeResults.length ? `<div class="empty-state">${state.youtubeResults.length ? 'Інші результати YouTube приховано.' : 'У YouTube нічого не знайдено.'}</div>` : '';
  const remoteRows = hasRemoteResults && state.youtubeSearchStatus === 'ready' ? visibleYouTubeResults.map(youtubeResultRow).join('') : '';
  const localResults = state.searchCategory === 'artists' ? artistRows || '<div class="empty-state">Виконавців у медіатеці пристрою немає.</div>'
    : state.searchCategory === 'albums' ? albumRows || '<div class="empty-state">Альбомів у медіатеці пристрою немає.</div>'
      : `${artistRows}${trackRows}${albumRows}${artistRows || trackRows || albumRows ? '' : '<div class="empty-state">Збігів у медіатеці пристрою немає.</div>'}`;
  return `${tabMarkup}<div class="search-result-list">${remoteRows}${remoteStatus}${localResults}</div>`;
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
  const youtubeFavorites = id === 'favorites' ? state.youtubeFavorites : [];
  list = prioritizePinned(list);
  const itemCount = list.length + youtubeFavorites.length;
  return `<header class="subpage-top"><button class="round-back" data-action="back">${icon('back')}</button><span></span></header>
    <section class="detail-heading">${kind === 'artist' ? artMarkup(item.art, item.title, 'detail-art detail-art--artist') : ''}<h1>${safeText(heading)}</h1>${kind !== 'artist' ? `<p>${safeText(item.artist || 'Ваша медіатека')}</p>` : ''}</section>
    ${itemCount ? `<div class="detail-actions"><button data-action="play-list" data-id="${safeText(id)}" data-kind="${safeText(kind)}">${icon('play')} Відтворити</button><button data-action="shuffle-list" data-id="${safeText(id)}" data-kind="${safeText(kind)}">${icon('shuffle')} Тасувати</button></div>` : ''}
    ${kind === 'artist' ? `<h2 class="letter-heading">Популярні пісні</h2>` : `<h2 class="letter-heading">${kind === 'playlist' ? 'Пісні' : 'A'}</h2>`}
    <div class="song-list song-list--detail">${list.map((track, i) => songRow(track, i, { showAlbum: false })).join('')}${youtubeFavorites.map((item) => youtubeResultRow(item, { saved: true })).join('') || (!list.length ? '<div class="empty-state">Тут поки немає пісень. Додайте власні аудіофайли, щоб слухати їх офлайн.</div>' : '')}</div>`;
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
    <section class="settings-connection-card" aria-label="Завантаження аудіофайлу"><div class="settings-connection-heading"><strong>Завантажити аудіо</strong><small>Вставте пряму HTTPS-посилання на MP3 або інший аудіофайл, який дозволено завантажувати. YouTube-посилання не підтримуються.</small></div>
      <input id="direct-audio-url" type="url" inputmode="url" autocapitalize="off" autocomplete="url" autocorrect="off" spellcheck="false" placeholder="https://example.com/song.mp3" aria-label="Пряма HTTPS-посилання на аудіофайл">
      <input id="direct-audio-title" type="text" autocomplete="off" placeholder="Назва пісні (необов’язково)" aria-label="Назва пісні">
      <input id="direct-audio-artist" type="text" autocomplete="off" placeholder="Виконавець (необов’язково)" aria-label="Виконавець">
      <div id="direct-audio-progress" class="direct-audio-progress" role="progressbar" aria-label="Прогрес завантаження" aria-valuemin="0" aria-valuemax="100" hidden><span id="direct-audio-progress-fill"></span></div>
      <small id="direct-audio-progress-label" class="direct-audio-progress-label" aria-live="polite"></small>
      <button class="settings-connection-save" data-action="download-direct-audio">Завантажити на пристрій</button>
      <button class="direct-audio-cancel" data-action="cancel-direct-audio-download" hidden>Скасувати завантаження</button>
    </section>
    <a class="settings-action-card profile-download" href="./Muzika.mobileconfig">${icon('home')}<span><strong>Додати ярлик на iPhone або iPad</strong><small>Завантажити профіль вебзастосунку</small></span>${icon('back', 'chevron')}</a>`;
}

const GOOGLE_CLIENT_ID = document.querySelector('meta[name="google-client-id"]')?.content.trim() || '';
let googleIdentityPromise;
let googleIdentityInitialized = false;

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
    ['home', 'Домівка', 'home'], ['new', 'Новинки', 'grid'], ['radio', 'Радіо', 'radio'], ['library', 'Медіатека', 'library'], ['search', 'Пошук', 'search']
  ];
  $('#tab-bar').innerHTML = tabs.map(([id, label, glyph]) => `<button class="tab-button ${state.tab === id ? 'active' : ''}" data-tab="${id}">${icon(glyph)}<span>${label}</span></button>`).join('');
}

function renderPlayer() {
  const track = currentTrack();
  $('#mini-player').innerHTML = track
    ? `<button class="player-track" data-action="now-playing">${artMarkup(track.art, track.album, 'player-art')}<span class="player-copy"><strong>${safeText(track.title)}</strong><small>${safeText(track.artist)}</small></span></button><button class="player-control" data-action="toggle-play" aria-label="${state.isPlaying ? 'Пауза' : 'Відтворити'}">${icon(state.isPlaying ? 'pause' : 'play')}</button><button class="player-control player-next" data-action="next-track" aria-label="Наступна пісня">${icon('next')}</button>`
    : `<div class="player-track player-track--empty">${artMarkup('local', '', 'player-art')}<span class="player-copy"><strong>Нічого не відтворюється</strong><small>Офлайн-медіатека</small></span></div><button class="player-control" disabled aria-label="Немає пісень">${icon('play')}</button><button class="player-control player-next" disabled aria-label="Немає наступної пісні">${icon('next')}</button>`;
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
  syncSystemMediaSession();
}

let mediaSessionTrackId = '';

function syncSystemMediaSession() {
  const mediaSession = navigator.mediaSession;
  if (!mediaSession) return;
  const track = currentTrack();
  if (!track?.local) {
    mediaSession.metadata = null;
    mediaSession.playbackState = 'none';
    mediaSessionTrackId = '';
    return;
  }
  if (mediaSessionTrackId !== track.id && typeof MediaMetadata === 'function') {
    mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Без назви',
      artist: track.artist || 'Невідомий виконавець',
      album: track.album || 'Music',
      artwork: [{
        src: new URL('./assets/icon.png', location.href).href,
        sizes: '512x512',
        type: 'image/png'
      }]
    });
    mediaSessionTrackId = track.id;
  }
  mediaSession.playbackState = audio.currentSrc ? (state.isPlaying ? 'playing' : 'paused') : 'none';
  if (audio.currentSrc && Number.isFinite(audio.duration) && audio.duration > 0 && typeof mediaSession.setPositionState === 'function') {
    try {
      mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(Math.max(audio.currentTime || 0, 0), audio.duration)
      });
    } catch { /* Some WebKit versions reject position updates for short or changing tracks. */ }
  }
}

function registerSystemMediaActions() {
  const mediaSession = navigator.mediaSession;
  if (!mediaSession?.setActionHandler) return;
  const handlers = {
    play: async () => {
      const track = currentTrack();
      if (!track?.local) return;
      if (state.currentTrackId !== track.id || !state.audioUrl || audio.ended) {
        await playTrack(track);
        return;
      }
      try { await audio.play(); } catch { /* Playback still requires a valid user or system gesture. */ }
    },
    pause: () => audio.pause(),
    previoustrack: () => { void playPreviousTrack(); },
    nexttrack: () => { void playNextTrack(); },
    seekto: (details) => {
      if (!currentTrack()?.local || !Number.isFinite(details.seekTime) || !Number.isFinite(audio.duration)) return;
      audio.currentTime = Math.min(Math.max(details.seekTime, 0), audio.duration);
      syncNowPlayingPlayback();
    },
    seekbackward: (details) => {
      if (!currentTrack()?.local || !Number.isFinite(audio.duration)) return;
      audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
      syncNowPlayingPlayback();
    },
    seekforward: (details) => {
      if (!currentTrack()?.local || !Number.isFinite(audio.duration)) return;
      audio.currentTime = Math.min(audio.duration, audio.currentTime + (details.seekOffset || 10));
      syncNowPlayingPlayback();
    }
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try { mediaSession.setActionHandler(action, handler); } catch { /* Unsupported actions vary across iOS versions. */ }
  }
  syncSystemMediaSession();
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
  if (tab !== 'search') cancelYouTubeSearch();
  state.tab = tab;
  state.screenStack = [];
  state.screen = { type: 'tab', tab };
  render();
  if (tab === 'search' && state.searchText.trim()) scheduleYouTubeSearch(state.searchText, state.searchCategory, { immediate: true });
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

  const contentRect = content.getBoundingClientRect();
  const preview = document.createElement('div');
  const isRtl = getComputedStyle($('.app-shell')).direction === 'rtl';
  const previewClasses = ['content'];
  if (previous.type === 'category') previewClasses.push('content--category-screen');
  if (previous.type === 'category' && ['songs', 'albums'].includes(previous.category)) previewClasses.push('content--category-detail');
  previewClasses.push('back-gesture-preview');
  if (isRtl) previewClasses.push('back-gesture-preview--rtl');
  preview.className = previewClasses.join(' ');
  preview.setAttribute('aria-hidden', 'true');
  preview.inert = true;
  preview.innerHTML = previousMarkup;
  Object.assign(preview.style, {
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

async function storeAudioFiles(files, { notifyUser = true } = {}) {
  const audioFiles = [...files].filter((file) => file.type.startsWith('audio/'));
  if (!audioFiles.length) {
    if (notifyUser) notify('Оберіть аудіофайл.');
    return false;
  }
  try {
    if (navigator.storage?.persist) {
      try { await navigator.storage.persist(); } catch { /* Keep saving when persistent storage is unavailable. */ }
    }
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
    if (notifyUser) notify(`Додано пісень: ${audioFiles.length}`);
    render();
    return true;
  } catch {
    if (notifyUser) notify('Не вдалося зберегти файли. Перевірте вільне місце на пристрої.');
    return false;
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
    case 'download-direct-audio': await downloadDirectAudio(); break;
    case 'cancel-direct-audio-download': directAudioDownloadController?.abort(); break;
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
      if (!list.length && id === 'favorites' && state.youtubeFavorites.length) {
        openYouTubePlayer(state.youtubeFavorites[0]);
        break;
      }
      await playTrack(list.find((track) => track.local));
      break;
    }
    case 'shuffle-list': {
      let list = allTracks().filter((track) => track.local);
      if (button.dataset.kind === 'artist') list = list.filter((track) => track.artist === id);
      if (button.dataset.kind === 'album') list = list.filter((track) => track.album === id);
      if (id === 'favorites') list = list.filter((track) => state.favorites.includes(track.id));
      if (id === 'recent') list = state.recentTrackIds.map((trackId) => allTracks().find((track) => track.id === trackId)).filter(Boolean);
      if (!list.length && id === 'favorites' && state.youtubeFavorites.length) {
        openYouTubePlayer(state.youtubeFavorites[Math.floor(Math.random() * state.youtubeFavorites.length)]);
        break;
      }
      const shuffled = list[Math.floor(Math.random() * list.length)];
      await playTrack(shuffled);
      break;
    }
    case 'clear-search': state.recentSearches = []; localStorage.removeItem('muzika-searches'); render(); break;
    case 'close-search':
      if (state.searchText.trim()) {
        cancelYouTubeSearch();
        state.searchText = '';
        state.searchCategory = 'top';
        render();
        $('#search-input')?.focus({ preventScroll: true });
      } else {
        cancelYouTubeSearch();
        state.searchCategory = 'top';
        state.tab = 'home';
        state.screenStack = [];
        state.screen = { type: 'tab', tab: 'home' };
        render();
      }
      break;
    case 'recent-search': state.searchText = term; state.searchCategory = 'top'; render(); scheduleYouTubeSearch(term, 'top', { immediate: true }); break;
    case 'search-category': state.searchCategory = button.dataset.category; $('#search-body').innerHTML = renderSearchBody(); scheduleYouTubeSearch(state.searchText, state.searchCategory, { immediate: true }); break;
    case 'open-youtube-result': {
      const item = findYouTubeResult(kind, id);
      if (!item) break;
      if (kind === 'channel') {
        state.searchText = item.snippet?.title || state.searchText;
        state.searchCategory = 'top';
        render();
        scheduleYouTubeSearch(state.searchText, 'top', { immediate: true, channelId: id });
      } else openYouTubePlayer(item);
      break;
    }
    case 'youtube-result-menu': openYouTubeResultMenu(findYouTubeResult(kind, id), kind, id); break;
    case 'save-youtube-result': saveYouTubeResult(findYouTubeResult(kind, id), kind, id); break;
    case 'toggle-youtube-favorite': toggleYouTubeFavorite(findYouTubeResult(kind, id), kind, id); break;
    case 'share-youtube-result': await shareYouTubeResult(findYouTubeResult(kind, id), kind, id); break;
    case 'open-youtube-playlist-menu': openYouTubePlaylistMenu(findYouTubeResult(kind, id), kind, id); break;
    case 'queue-youtube-result': {
      const item = findYouTubeResult(kind, id);
      if (!item) break;
      state.queue = [{ source: 'youtube', kind, id, item }, ...state.queue.filter((entry) => !(entry && typeof entry === 'object' && entry.source === 'youtube' && entry.kind === kind && entry.id === id))];
      closeSongMenu();
      notify('Відео додано в чергу. Воно відкриється після натискання «Далі».');
      break;
    }
    case 'youtube-create-station':
    case 'youtube-open-channel': {
      const channelId = button.dataset.channel || (kind === 'channel' ? id : '');
      const item = findYouTubeResult(kind, id);
      searchYouTubeChannel(channelId, button.dataset.title || item?.snippet?.channelTitle || item?.snippet?.title, 'top');
      break;
    }
    case 'youtube-search-albums': {
      const channelId = button.dataset.channel || '';
      const item = findYouTubeResult(kind, id);
      searchYouTubeChannel(channelId, button.dataset.title || item?.snippet?.channelTitle || item?.snippet?.title, 'albums');
      break;
    }
    case 'youtube-about-creator': {
      const item = findYouTubeResult(kind, id);
      const channelId = button.dataset.channel || (kind === 'channel' ? id : '');
      openYouTubeCreatorInfo(item, channelId, button.dataset.title || item?.snippet?.channelTitle || item?.snippet?.title);
      break;
    }
    case 'youtube-suggest-less': {
      const key = youtubeResultKey(kind, id);
      if (!state.hiddenYouTubeResultIds.includes(key)) state.hiddenYouTubeResultIds.push(key);
      closeSongMenu();
      refreshSearchResults();
      notify('Результат приховано з цього пошуку.');
      break;
    }
    case 'search-youtube-channel': {
      const item = findYouTubeResult('channel', id);
      if (!item) break;
      state.searchText = item.snippet?.title || state.searchText;
      state.searchCategory = 'top';
      render();
      scheduleYouTubeSearch(state.searchText, 'top', { immediate: true, channelId: id });
      break;
    }
    case 'close-youtube-player': closeYouTubePlayer(); break;
    case 'song-menu': {
      const track = allTracks().find((item) => item.id === id);
      if (track) openSongMenu(track);
      else notify('Відкрийте меню поруч із піснею, щоб керувати нею.');
      break;
    }
    case 'close-song-menu': closeSongMenu(); break;
    case 'search-track-menu': {
      const track = allTracks().find((item) => item.id === id);
      if (track) openSearchTrackMenu(track);
      break;
    }
    case 'share-local-track': await shareLocalTrack(id); break;
    case 'search-youtube-text': searchYouTubeText(button.dataset.title || state.searchText); break;
    case 'hide-search-track': {
      const key = `${state.searchText.trim().toLocaleLowerCase()}:${id}`;
      if (!state.hiddenSearchTrackIds.includes(key)) state.hiddenSearchTrackIds.push(key);
      closeSongMenu();
      refreshSearchResults();
      notify('Пісню приховано з результатів пошуку.');
      break;
    }
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
  state.searchCategory = 'top';
  scheduleYouTubeSearch(state.searchText, 'top');
});

content.addEventListener('keydown', (event) => {
  if (event.target.id === 'search-input' && event.key === 'Enter') {
    const query = state.searchText.trim();
    if (query) {
      rememberSearch(query);
      scheduleYouTubeSearch(query, state.searchCategory, { immediate: true });
    }
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
registerSystemMediaActions();

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
  tryLockPortraitOrientation();
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

function tryLockPortraitOrientation() {
  const orientation = window.screen?.orientation;
  if (typeof orientation?.lock !== 'function') return;
  try {
    orientation.lock('portrait-primary').catch(() => {});
  } catch {
    // Manifest orientation and the landscape fallback cover browsers that reject the lock.
  }
}

document.addEventListener('pointerdown', tryLockPortraitOrientation, { once: true, passive: true });
