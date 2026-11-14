#!/usr/bin/env python3
"""Desktop music tag helper for macOS. Metadata lookups use MusicBrainz/AcoustID."""

from __future__ import annotations

import base64
import difflib
from io import BytesIO
import json
import mimetypes
import os
import queue
import re
import shutil
import subprocess
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from mutagen import File as MutagenFile
from mutagen.flac import FLAC, Picture
from mutagen.id3 import APIC, ID3, ID3NoHeaderError
from mutagen.mp4 import MP4, MP4Cover
from PIL import Image, ImageOps


APP_NAME = "Audio Library Tagger"
APP_VERSION = "0.1"
USER_AGENT = f"{APP_NAME}/{APP_VERSION} (macOS desktop application)"
MUSICBRAINZ = "https://musicbrainz.org/ws/2"
COVER_ART = "https://coverartarchive.org"
ACOUSTID = "https://api.acoustid.org/v2/lookup"
APPLE_SEARCH = "https://itunes.apple.com/search"
AUDIO_EXTENSIONS = {
    ".mp3", ".m4a", ".mp4", ".flac", ".ogg", ".oga", ".opus",
    ".wav", ".aiff", ".aif", ".wma", ".ape", ".wv", ".mpc", ".tta",
}
COVER_SIZE = 632

_mb_lock = threading.Lock()
_mb_last_request = 0.0


class SearchCancelled(Exception):
    """Raised when the UI switches to a different track during search."""


@dataclass
class Track:
    path: Path
    artist: str = ""
    title: str = ""
    album: str = ""
    year: str = ""
    genre: str = ""
    status: str = ""

    def source_values(self) -> dict[str, str]:
        values = {
            "artist": self.artist,
            "title": self.title,
            "album": self.album,
            "year": self.year,
            "genre": self.genre,
        }
        guessed = guess_from_filename(self.path)
        for key in ("artist", "title", "album"):
            if not values[key] and guessed.get(key):
                values[key] = guessed[key]
        return values


@dataclass
class Candidate:
    mbid: str
    title: str
    artist: str
    album: str = ""
    year: str = ""
    genre: str = ""
    release_id: str = ""
    release_group_id: str = ""
    mb_score: float = 0.0
    acoustid_score: float = 0.0
    confidence: float = 0.0
    source: str = "MusicBrainz"
    raw: dict[str, Any] = field(default_factory=dict)

    def values(self) -> dict[str, str]:
        return {
            "artist": self.artist,
            "title": self.title,
            "album": self.album,
            "year": self.year,
            "genre": self.genre,
        }


def clean_text(value: Any) -> str:
    if isinstance(value, list):
        value = value[0] if value else ""
    if value is None:
        return ""
    return str(value).strip()


def first_tag(tags: Any, key: str) -> str:
    if not tags:
        return ""
    try:
        return clean_text(tags.get(key, ""))
    except Exception:
        return ""


def guess_from_filename(path: Path) -> dict[str, str]:
    stem = path.stem.strip()
    stem = re.sub(r"^\s*\d{1,3}\s*[._ -]+\s*", "", stem)
    parts = re.split(r"\s+(?:-|–|—)\s+", stem, maxsplit=2)
    if len(parts) >= 2:
        return {"artist": parts[0].strip(), "title": parts[-1].strip(), "album": ""}
    return {"artist": "", "title": stem, "album": ""}


def read_track(path: Path) -> Track:
    track = Track(path=path)
    try:
        audio = MutagenFile(str(path), easy=True)
        if audio is not None:
            tags = audio.tags
            track.artist = first_tag(tags, "artist")
            track.title = first_tag(tags, "title")
            track.album = first_tag(tags, "album")
            track.year = first_tag(tags, "date")[:4]
            track.genre = first_tag(tags, "genre")
    except Exception as exc:
        track.status = f"Ошибка чтения: {exc}"
    if not track.title:
        guess = guess_from_filename(path)
        track.title = guess["title"]
        if not track.artist:
            track.artist = guess["artist"]
    if not track.status:
        track.status = "Готово" if all((track.artist, track.title, track.album)) else "Нужны теги"
    return track


def _request(url: str, data: bytes | None = None, content_type: str = "", timeout: float = 25) -> bytes:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json, image/*, */*"}
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def _musicbrainz_request(url: str, cancel_event: threading.Event | None = None) -> bytes:
    global _mb_last_request
    last_error: Exception | None = None
    for attempt in range(4):
        if cancel_event and cancel_event.is_set():
            raise SearchCancelled()
        try:
            # Keep the lock through the request so simultaneous UI requests can
            # never exceed MusicBrainz's one-request-per-second limit.
            while not _mb_lock.acquire(timeout=0.15):
                if cancel_event and cancel_event.is_set():
                    raise SearchCancelled()
            try:
                delay = 1.05 - (time.monotonic() - _mb_last_request)
                while delay > 0:
                    if cancel_event and cancel_event.is_set():
                        raise SearchCancelled()
                    time.sleep(min(delay, 0.15))
                    delay = 1.05 - (time.monotonic() - _mb_last_request)
                if cancel_event and cancel_event.is_set():
                    raise SearchCancelled()
                _mb_last_request = time.monotonic()
                return _request(url, timeout=12)
            finally:
                _mb_lock.release()
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 3:
                raise
            retry_after = exc.headers.get("Retry-After", "") if exc.headers else ""
            try:
                pause = min(max(float(retry_after), 1.1), 12.0)
            except (TypeError, ValueError):
                pause = min(1.5 * (2 ** attempt), 8.0)
            if cancel_event:
                deadline = time.monotonic() + pause
                while time.monotonic() < deadline:
                    if cancel_event.is_set():
                        raise SearchCancelled()
                    time.sleep(min(0.15, deadline - time.monotonic()))
            else:
                time.sleep(pause)
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt == 3:
                raise
            pause = min(1.5 * (2 ** attempt), 8.0)
            if cancel_event:
                deadline = time.monotonic() + pause
                while time.monotonic() < deadline:
                    if cancel_event.is_set():
                        raise SearchCancelled()
                    time.sleep(min(0.15, deadline - time.monotonic()))
            else:
                time.sleep(pause)
    raise RuntimeError("MusicBrainz временно недоступен") from last_error


def artist_credit_name(credit: Any) -> str:
    if not isinstance(credit, list):
        return ""
    names: list[str] = []
    for index, item in enumerate(credit):
        if isinstance(item, str):
            names.append(item)
        elif isinstance(item, dict):
            name = item.get("name") or (item.get("artist") or {}).get("name")
            if name:
                names.append(str(name))
                joinphrase = item.get("joinphrase")
                if joinphrase is not None:
                    names.append(str(joinphrase))
                elif index < len(credit) - 1:
                    names.append(", ")
    return "".join(names).strip()


def tags_to_genre(raw_tags: Any) -> str:
    if isinstance(raw_tags, list):
        ranked = []
        for tag in raw_tags:
            if isinstance(tag, dict) and tag.get("name"):
                ranked.append((int(tag.get("count", 0) or 0), str(tag["name"])))
        ranked.sort(key=lambda item: (-item[0], item[1].lower()))
        return ranked[0][1] if ranked else ""
    return ""


def release_info(releases: Any, preferred_album: str = "") -> tuple[str, str, str]:
    if not isinstance(releases, list) or not releases:
        return "", "", ""
    records = [r for r in releases if isinstance(r, dict)]
    if preferred_album:
        exact = [r for r in records if str(r.get("title", "")).casefold() == preferred_album.casefold()]
        if exact:
            records = exact
    records.sort(key=lambda r: str(r.get("date", "9999")))
    release = records[0]
    date = str(release.get("date") or "")
    year_match = re.match(r"(\d{4})", date)
    return str(release.get("title") or ""), year_match.group(1) if year_match else "", str(release.get("id") or "")


def candidate_from_mb_record(record: dict[str, Any], preferred_album: str = "") -> Candidate | None:
    title = str(record.get("title") or "").strip()
    mbid = str(record.get("id") or "")
    if not title or not mbid:
        return None
    artist = artist_credit_name(record.get("artist-credit"))
    album, year, release_id = release_info(record.get("releases"), preferred_album)
    return Candidate(
        mbid=mbid,
        title=title,
        artist=artist,
        album=album,
        year=year,
        genre=tags_to_genre(record.get("tags")),
        release_id=release_id,
        mb_score=float(record.get("score", 0) or 0),
        source="MusicBrainz",
        raw=record,
    )


_CYRILLIC_TO_LATIN = str.maketrans({
    "а": "a", "б": "b", "в": "v", "г": "g", "ґ": "g", "д": "d", "е": "e",
    "ё": "e", "є": "ye", "ж": "zh", "з": "z", "и": "i", "і": "i", "ї": "yi",
    "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p",
    "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e",
    "ю": "yu", "я": "ya",
})


def normalize_match_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value).casefold())
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.replace("&", " and ")
    value = re.sub(r"[^\w]+", " ", value, flags=re.UNICODE)
    return " ".join(value.split())


def transliterate_match_text(value: str) -> str:
    return normalize_match_text(value).translate(_CYRILLIC_TO_LATIN)


def text_similarity(left: str, right: str) -> float:
    left_forms = {normalize_match_text(left), transliterate_match_text(left)}
    right_forms = {normalize_match_text(right), transliterate_match_text(right)}
    left_forms.discard("")
    right_forms.discard("")
    if not left_forms or not right_forms:
        return 0.0
    best = 0.0
    for left_form in left_forms:
        left_tokens = set(left_form.split())
        for right_form in right_forms:
            if left_form == right_form:
                return 1.0
            right_tokens = set(right_form.split())
            overlap = 2 * len(left_tokens & right_tokens) / max(len(left_tokens) + len(right_tokens), 1)
            sequence = difflib.SequenceMatcher(None, left_form, right_form).ratio()
            best = max(best, sequence * 0.75 + overlap * 0.25)
    return min(best, 1.0)


def text_confidence(candidate: Candidate, source: dict[str, str]) -> float:
    # A perfect title with an unrelated artist used to score surprisingly high.
    # Geometric scoring makes disagreement on either identifying field matter.
    weights = {"title": 0.64, "artist": 0.30, "album": 0.06}
    matches: list[tuple[float, float]] = []
    for key, weight in weights.items():
        source_value = source.get(key, "").strip()
        candidate_value = getattr(candidate, key).strip()
        if source_value and candidate_value:
            matches.append((text_similarity(source_value, candidate_value), weight))
    if not matches:
        return 0.0
    used = sum(weight for _score, weight in matches)
    local = 1.0
    for score, weight in matches:
        local *= max(score, 0.01) ** (weight / used)
    if candidate.mb_score:
        local = local * 0.95 + (candidate.mb_score / 100.0) * 0.05
    return min(local, 1.0)


def escape_lucene(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').strip()


def musicbrainz_search(source: dict[str, str], cancel_event: threading.Event | None = None) -> list[Candidate]:
    title = source.get("title", "").strip()
    if not title:
        return []
    artist = source.get("artist", "").strip()
    album = source.get("album", "").strip()
    artist_variants = [artist]
    artist_parts = re.split(r"\s+(?:feat(?:uring)?\.?|ft\.?|with|and|x)\s+|[,;/&]+", artist, flags=re.IGNORECASE)
    for part in artist_parts:
        part = part.strip()
        if len(part) > 1 and part not in artist_variants:
            artist_variants.append(part)

    query_sets: list[tuple[str, str, str]] = []
    for query_index, query_title in enumerate((title, transliterate_match_text(title))):
        if not query_title:
            continue
        for artist_index, artist_variant in enumerate(artist_variants):
            query_artist = artist_variant if query_index == 0 else transliterate_match_text(artist_variant)
            if not query_artist:
                continue
            if album and query_index == 0 and artist_index == 0:
                query_sets.append((query_title, query_artist, album))
            query_sets.append((query_title, query_artist, ""))
            if artist_index >= 1:
                break
        query_sets.append((query_title, "", ""))

    unique_queries: list[tuple[str, str, str]] = []
    for item in query_sets:
        if item not in unique_queries:
            unique_queries.append(item)

    by_id: dict[str, Candidate] = {}
    for query_title, query_artist, query_album in unique_queries:
        if cancel_event and cancel_event.is_set():
            break
        terms = [f'recording:"{escape_lucene(query_title)}"']
        if query_artist:
            terms.append(f'artist:"{escape_lucene(query_artist)}"')
        if query_album:
            terms.append(f'release:"{escape_lucene(query_album)}"')
        query = urllib.parse.urlencode({"query": " AND ".join(terms), "fmt": "json", "limit": 20})
        try:
            payload = json.loads(_musicbrainz_request(f"{MUSICBRAINZ}/recording/?{query}", cancel_event))
        except SearchCancelled:
            break
        for record in payload.get("recordings", []):
            candidate = candidate_from_mb_record(record, album)
            if candidate:
                candidate.confidence = text_confidence(candidate, source)
                previous = by_id.get(candidate.mbid)
                if previous is None or (candidate.confidence, candidate.mb_score) > (previous.confidence, previous.mb_score):
                    by_id[candidate.mbid] = candidate
        best = max((item.confidence for item in by_id.values()), default=0.0)
        if best >= 0.92:
            break

    return sorted(by_id.values(), key=lambda c: (c.confidence, c.mb_score), reverse=True)[:20]


def apple_catalog_search(source: dict[str, str], cancel_event: threading.Event | None = None) -> list[Candidate]:
    """Search Apple's public catalog as a no-key metadata fallback.

    Apple's catalog art is intentionally not downloaded or embedded here; it is
    licensed by Apple for promoting the corresponding store content. Cover art
    for local files continues to come from MusicBrainz/Cover Art Archive.
    """
    title = source.get("title", "").strip()
    artist = source.get("artist", "").strip()
    if not title:
        return []
    term = " ".join(value for value in (artist, title) if value)
    by_id: dict[str, Candidate] = {}
    for country in ("ua", "lt", "us"):
        if cancel_event and cancel_event.is_set():
            break
        query = urllib.parse.urlencode({
            "term": term,
            "entity": "song",
            "limit": 25,
            "country": country,
        })
        request = urllib.request.Request(
            f"{APPLE_SEARCH}?{query}",
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                payload = json.loads(response.read(4_000_000))
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            continue
        for result in payload.get("results", []):
            result_id = str(result.get("trackId") or "")
            track_title = str(result.get("trackName") or "").strip()
            track_artist = str(result.get("artistName") or "").strip()
            if not result_id or not track_title:
                continue
            candidate = Candidate(
                mbid=f"apple:{result_id}",
                title=track_title,
                artist=track_artist,
                album=str(result.get("collectionName") or "").strip(),
                year=str(result.get("releaseDate") or "")[:4],
                genre=str(result.get("primaryGenreName") or "").strip(),
                source="Apple Music",
                raw={"track_id": result_id},
            )
            title_match = text_similarity(title, candidate.title)
            artist_match = text_similarity(artist, candidate.artist) if artist and candidate.artist else 0.0
            # Drop broad search results that only happen to share one common word.
            if title_match < 0.48:
                continue
            if artist and candidate.artist and artist_match < 0.28 and title_match < 0.96:
                continue
            candidate.confidence = text_confidence(candidate, source)
            previous = by_id.get(candidate.mbid)
            if previous is None or candidate.confidence > previous.confidence:
                by_id[candidate.mbid] = candidate
        # The Ukrainian storefront is the most useful for Ukrainian-language
        # tracks; query other catalogs only if it did not yield a plausible item.
        if by_id and max(item.confidence for item in by_id.values()) >= 0.86:
            break
    return sorted(by_id.values(), key=lambda item: item.confidence, reverse=True)[:20]


def acoustid_search(path: Path, api_key: str, cancel_event: threading.Event | None = None) -> list[Candidate]:
    fpcalc = find_fpcalc()
    if not fpcalc:
        raise RuntimeError("Не найдена команда fpcalc. Установите Chromaprint: brew install chromaprint")
    if cancel_event and cancel_event.is_set():
        return []
    if cancel_event:
        proc = subprocess.Popen([fpcalc, "-json", str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        deadline = time.monotonic() + 90
        while True:
            try:
                stdout, stderr = proc.communicate(timeout=0.2)
                break
            except subprocess.TimeoutExpired:
                if cancel_event.is_set():
                    proc.terminate()
                    try:
                        proc.communicate(timeout=1)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        proc.communicate()
                    return []
                if time.monotonic() >= deadline:
                    proc.kill()
                    proc.communicate()
                    raise subprocess.TimeoutExpired([fpcalc, "-json", str(path)], 90)
        returncode = proc.returncode
    else:
        proc = subprocess.run([fpcalc, "-json", str(path)], capture_output=True, text=True, timeout=90)
        stdout, stderr, returncode = proc.stdout, proc.stderr, proc.returncode
    if returncode != 0:
        raise RuntimeError(stderr.strip() or "fpcalc не смог прочитать файл")
    if cancel_event and cancel_event.is_set():
        return []
    fingerprint_data = json.loads(stdout)
    form = urllib.parse.urlencode({
        "client": api_key,
        "duration": str(round(float(fingerprint_data["duration"]))),
        "fingerprint": fingerprint_data["fingerprint"],
        "meta": "recordings+releasegroups+compress",
        "format": "json",
    }).encode("utf-8")
    payload = json.loads(_request(ACOUSTID, data=form, content_type="application/x-www-form-urlencoded", timeout=12))
    if cancel_event and cancel_event.is_set():
        return []
    if payload.get("status") != "ok":
        raise RuntimeError(str(payload.get("error", "Ошибка AcoustID")))
    candidates: list[Candidate] = []
    for result in payload.get("results", []):
        score = float(result.get("score", 0) or 0)
        for recording in result.get("recordings", []):
            title = str(recording.get("title") or "").strip()
            mbid = str(recording.get("id") or "")
            if not title or not mbid:
                continue
            groups = recording.get("releasegroups", [])
            group = groups[0] if groups else {}
            album = str(group.get("title") or "") if isinstance(group, dict) else ""
            date = str(group.get("first-release-date") or "") if isinstance(group, dict) else ""
            year_match = re.match(r"(\d{4})", date)
            candidates.append(Candidate(
                mbid=mbid,
                title=title,
                artist=artist_credit_name(recording.get("artists")) or artist_credit_name(recording.get("artist-credit")),
                album=album,
                year=year_match.group(1) if year_match else "",
                release_group_id=str(group.get("id") or "") if isinstance(group, dict) else "",
                acoustid_score=score,
                confidence=score,
                source="AcoustID",
                raw=recording,
            ))
    # Several AcoustIDs may point to the same MusicBrainz recording.
    unique: dict[str, Candidate] = {}
    for candidate in candidates:
        if candidate.mbid not in unique or candidate.acoustid_score > unique[candidate.mbid].acoustid_score:
            unique[candidate.mbid] = candidate
    return sorted(unique.values(), key=lambda c: c.acoustid_score, reverse=True)


def find_fpcalc() -> str | None:
    candidates = [shutil.which("fpcalc"), "/opt/homebrew/bin/fpcalc", "/usr/local/bin/fpcalc"]
    for candidate in candidates:
        if candidate and os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


def enrich_candidate(candidate: Candidate) -> Candidate:
    if candidate.source == "Apple Music" or candidate.mbid.startswith("apple:"):
        # Apple's Search API art is licensed for promoting its store content,
        # so resolve a likely MusicBrainz recording and use Cover Art Archive
        # for artwork that can be embedded in the user's local audio file.
        source = candidate.values()
        matches = musicbrainz_search(source)
        plausible: list[Candidate] = []
        for match in matches:
            title_match = text_similarity(source.get("title", ""), match.title)
            artist_match = text_similarity(source.get("artist", ""), match.artist) if source.get("artist") and match.artist else 1.0
            if title_match >= 0.84 and artist_match >= 0.72 and (match.release_id or match.release_group_id):
                plausible.append(match)
        if plausible:
            artwork_match = max(plausible, key=lambda item: text_confidence(item, source))
            candidate.release_id = artwork_match.release_id
            candidate.release_group_id = artwork_match.release_group_id
            candidate.year = candidate.year or artwork_match.year
            candidate.genre = candidate.genre or artwork_match.genre
        return candidate
    query = urllib.parse.urlencode({"inc": "artists+releases+tags", "fmt": "json"})
    payload = json.loads(_musicbrainz_request(f"{MUSICBRAINZ}/recording/{candidate.mbid}?{query}"))
    candidate.title = str(payload.get("title") or candidate.title)
    candidate.artist = artist_credit_name(payload.get("artist-credit")) or candidate.artist
    album, year, release_id = release_info(payload.get("releases"), candidate.album)
    candidate.album = album or candidate.album
    candidate.year = year or candidate.year
    candidate.release_id = release_id or candidate.release_id
    candidate.genre = tags_to_genre(payload.get("tags")) or candidate.genre
    candidate.raw = payload
    return candidate


def download_cover(candidate: Candidate) -> tuple[bytes | None, str]:
    entity = "release" if candidate.release_id else "release-group"
    entity_id = candidate.release_id or candidate.release_group_id
    if not entity_id:
        return None, ""
    url = f"{COVER_ART}/{entity}/{urllib.parse.quote(entity_id)}/front-500"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
        with urllib.request.urlopen(request, timeout=25) as response:
            data = response.read(12_000_000)
        return normalize_cover(data), "image/webp"
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None, ""
    except (OSError, ValueError):
        return None, ""


def normalize_cover(data: bytes) -> bytes:
    """Return a 632x632 WebP cover while keeping the full artwork visible."""
    if not data:
        raise ValueError("Пустое изображение обложки")
    with Image.open(BytesIO(data)) as source:
        source.seek(0)
        artwork = ImageOps.exif_transpose(source).convert("RGBA")
    artwork.thumbnail((COVER_SIZE, COVER_SIZE), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (COVER_SIZE, COVER_SIZE), (0, 0, 0, 0))
    offset = ((COVER_SIZE - artwork.width) // 2, (COVER_SIZE - artwork.height) // 2)
    canvas.alpha_composite(artwork, offset)
    output = BytesIO()
    canvas.save(output, format="WEBP", quality=94, method=6, exact=True)
    return output.getvalue()


def cover_as_jpeg(data: bytes) -> bytes:
    """Make the compatible JPEG fallback required by MP4/M4A cover atoms."""
    with Image.open(BytesIO(data)) as source:
        image = source.convert("RGBA")
    background = Image.new("RGBA", image.size, (255, 255, 255, 255))
    background.alpha_composite(image)
    output = BytesIO()
    background.convert("RGB").save(output, format="JPEG", quality=94, optimize=True)
    return output.getvalue()


def has_cover(path: Path) -> bool:
    try:
        audio = MutagenFile(str(path), easy=False)
        if audio is None or audio.tags is None:
            return False
        tags = audio.tags
        if isinstance(audio, FLAC):
            return bool(audio.pictures)
        if isinstance(audio, MP4):
            return bool(tags.get("covr"))
        if hasattr(tags, "getall"):
            return bool(tags.getall("APIC"))
        return bool(tags.get("metadata_block_picture"))
    except Exception:
        return False


def backup_path(path: Path, root: Path) -> Path:
    base = Path.home() / "Library" / "Application Support" / APP_NAME / "backups"
    run_folder = datetime.now().strftime("%Y%m%d-%H%M%S")
    try:
        relative = path.relative_to(root)
    except ValueError:
        relative = Path(path.name)
    destination = base / run_folder / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    # A collision can happen when two files with the same relative path are handled in the same second.
    if destination.exists():
        destination = destination.with_name(f"{destination.stem}-{int(time.time() * 1000)}{destination.suffix}")
    shutil.copy2(path, destination)
    return destination


def rename_audio_file(path: Path, title: str, artist: str = "", album: str = "") -> Path:
    """Name a track after its title, using metadata and Unicode spaces on collisions."""
    title = unicodedata.normalize("NFC", title or path.stem)
    artist = unicodedata.normalize("NFC", artist or "")
    album = unicodedata.normalize("NFC", album or "")

    def safe_stem(value: str) -> str:
        value = re.sub(r"[/\\:\x00-\x1f]", " - ", value)
        value = " ".join(value.split()).strip(" .")
        # Leave room for the extension and a duplicate suffix on common filesystems.
        encoded: list[str] = []
        size = 0
        for char in value:
            width = len(char.encode("utf-8"))
            if size + width > 190:
                break
            encoded.append(char)
            size += width
        return "".join(encoded).rstrip(" .") or "Без названия"

    title_stem = safe_stem(title)
    artist_stem = safe_stem(artist) if artist.strip() else ""
    album_stem = safe_stem(album) if album.strip() else ""
    extension = path.suffix

    def normalized_name(value: str) -> str:
        return unicodedata.normalize("NFC", value).casefold()

    try:
        siblings = [entry.name for entry in path.parent.iterdir() if entry.name != path.name]
    except OSError:
        siblings = []
    occupied = {normalized_name(name) for name in siblings}
    current_key = normalized_name(path.name)

    desired_stems = [title_stem]
    if artist_stem and normalized_name(artist_stem) != normalized_name(title_stem):
        desired_stems.append(safe_stem(f"{title_stem} — {artist_stem}"))
    if album_stem:
        with_album = safe_stem(
            f"{title_stem} — {artist_stem} — {album_stem}" if artist_stem else f"{title_stem} — {album_stem}"
        )
        if normalized_name(with_album) not in {normalized_name(stem) for stem in desired_stems}:
            desired_stems.append(with_album)

    target: Path | None = None
    for stem in desired_stems:
        name = f"{stem}{extension}"
        key = normalized_name(name)
        if key == current_key:
            # Same file on a case-insensitive or Unicode-normalizing volume.
            if name == path.name:
                return path
            target = path.with_name(name)
            break
        if key not in occupied:
            target = path.with_name(name)
            break

    if target is None:
        base = desired_stems[-1]
        # Keep duplicate names digit-free. A trailing sequence of distinct Unicode
        # spaces remains visually unobtrusive while being a different filename.
        space_chars = ("\u00a0", "\u2007", "\u2009", "\u202f", "\u205f", "\u3000")

        def space_variant(index: int) -> str:
            length = 1
            while index >= len(space_chars) ** length:
                index -= len(space_chars) ** length
                length += 1
            result: list[str] = []
            for _ in range(length):
                index, digit = divmod(index, len(space_chars))
                result.append(space_chars[digit])
            return "".join(result)

        index = 0
        while True:
            name = f"{base}{space_variant(index)}{extension}"
            if normalized_name(name) not in occupied and normalized_name(name) != current_key:
                target = path.with_name(name)
                break
            index += 1

    if target == path or target.name == path.name:
        return path
    if normalized_name(target.name) == current_key:
        temporary = path.with_name(f".tagger-rename-{time.time_ns()}{extension}")
        path.rename(temporary)
        temporary.rename(target)
        return target
    path.rename(target)
    return target


def embed_cover(path: Path, data: bytes, mime: str) -> str:
    suffix = path.suffix.lower()
    if suffix in {".mp3", ".wav", ".aiff", ".aif"}:
        try:
            tags = ID3(str(path))
        except ID3NoHeaderError:
            tags = ID3()
        tags.delall("APIC")
        tags.add(APIC(encoding=3, mime=mime, type=3, desc="Cover", data=data))
        tags.save(str(path), v2_version=3)
        return ""
    if suffix == ".flac":
        audio = FLAC(str(path))
        audio.clear_pictures()
        picture = Picture()
        picture.type = 3
        picture.mime = mime
        picture.desc = "Cover"
        picture.data = data
        audio.add_picture(picture)
        audio.save()
        return ""
    if suffix in {".m4a", ".mp4"}:
        audio = MP4(str(path))
        audio.tags["covr"] = [MP4Cover(cover_as_jpeg(data), imageformat=MP4Cover.FORMAT_JPEG)]
        audio.save()
        return "Для совместимости M4A обложка сохранена в JPEG; в остальных поддерживаемых форматах — WebP."
    if suffix in {".ogg", ".oga", ".opus"}:
        audio = MutagenFile(str(path), easy=False)
        if audio is None:
            return "Обложка не записана: формат не поддержан."
        picture = Picture()
        picture.type = 3
        picture.mime = mime
        picture.desc = "Cover"
        picture.data = data
        encoded = base64.b64encode(picture.write()).decode("ascii")
        audio["metadata_block_picture"] = [encoded]
        audio.save()
        return ""
    return "Теги записаны; этот формат не поддерживает встраивание обложки в приложении."


def write_metadata(path: Path, values: dict[str, str], cover: bytes | None, cover_mime: str,
                   root: Path, overwrite: bool, create_backup: bool = True) -> tuple[str, Path | None]:
    if cover:
        cover = normalize_cover(cover)
        cover_mime = "image/webp"
    audio = MutagenFile(str(path), easy=True)
    if audio is None:
        raise RuntimeError("Mutagen не распознал аудиоформат")
    if audio.tags is None:
        audio.add_tags()
    to_write: dict[str, str] = {}
    for key, tag_name in (("artist", "artist"), ("title", "title"), ("album", "album"),
                          ("year", "date"), ("genre", "genre")):
        value = values.get(key, "").strip()
        if not value:
            continue
        existing = first_tag(audio.tags, tag_name)
        if overwrite or not existing:
            to_write[tag_name] = value
    add_cover = bool(cover and (overwrite or not has_cover(path)))
    if not to_write and not add_cover:
        return "Уже заполнено", None
    saved_copy = backup_path(path, root) if create_backup else None
    for key, value in to_write.items():
        audio[key] = [value]
    if to_write:
        audio.save()
    warning = ""
    if add_cover and cover:
        warning = embed_cover(path, cover, cover_mime or "image/jpeg")
    return warning or "Записано", saved_copy


def settings_file() -> Path:
    return Path.home() / "Library" / "Application Support" / APP_NAME / "settings.json"


def load_settings() -> dict[str, Any]:
    try:
        return json.loads(settings_file().read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_settings(api_key: str, folder: str) -> None:
    target = settings_file()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"acoustid_key": api_key, "folder": folder}, ensure_ascii=False, indent=2), encoding="utf-8")


class AudioTaggerApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("iPod")
        self.root.geometry("1180x760")
        self.root.minsize(950, 620)
        self.events: queue.Queue[tuple[str, Any]] = queue.Queue()
        self.tracks: dict[str, Track] = {}
        self.item_paths: dict[str, str] = {}
        self.selected_path: str | None = None
        self.root_folder = Path(load_settings().get("folder") or Path.home() / "Music")
        self.current_candidate: Candidate | None = None
        self.current_cover: bytes | None = None
        self.current_cover_mime = ""
        self.busy = False
        self._build_ui()
        self.folder_var.set(str(self.root_folder))
        self.key_var.set(str(load_settings().get("acoustid_key") or ""))
        self.root.after(100, self._poll_events)

    def _build_ui(self) -> None:
        top = ttk.Frame(self.root, padding=(10, 10, 10, 4))
        top.pack(fill="x")
        self.folder_var = tk.StringVar()
        ttk.Label(top, text="Папка с музыкой:").pack(side="left")
        ttk.Entry(top, textvariable=self.folder_var).pack(side="left", fill="x", expand=True, padx=8)
        self.choose_button = ttk.Button(top, text="Выбрать папку", command=self.choose_folder)
        self.choose_button.pack(side="left")
        self.scan_button = ttk.Button(top, text="Сканировать", command=self.scan_folder)
        self.scan_button.pack(side="left", padx=(6, 0))

        settings = ttk.Frame(self.root, padding=(10, 4, 10, 8))
        settings.pack(fill="x")
        self.key_var = tk.StringVar()
        ttk.Label(settings, text="Ключ AcoustID (необязательно):").pack(side="left")
        ttk.Entry(settings, textvariable=self.key_var, show="•", width=34).pack(side="left", padx=8)
        ttk.Button(settings, text="Сохранить ключ", command=self.save_key).pack(side="left")
        ttk.Label(settings, text="Для поиска по звучанию нужны Chromaprint (fpcalc) и ключ.", foreground="#555").pack(side="left", padx=10)

        body = ttk.Panedwindow(self.root, orient="horizontal")
        body.pack(fill="both", expand=True, padx=10, pady=4)
        list_frame = ttk.Frame(body)
        detail_frame = ttk.Frame(body, padding=10)
        body.add(list_frame, weight=4)
        body.add(detail_frame, weight=2)

        columns = ("artist", "title", "album", "year", "genre", "status")
        self.table = ttk.Treeview(list_frame, columns=columns, show="tree headings", selectmode="browse")
        self.table.heading("#0", text="Файл")
        self.table.column("#0", width=205, minwidth=125)
        for key, title, width in (("artist", "Исполнитель", 140), ("title", "Название", 160),
                                  ("album", "Альбом", 150), ("year", "Год", 55),
                                  ("genre", "Жанр", 105), ("status", "Статус", 115)):
            self.table.heading(key, text=title)
            self.table.column(key, width=width, minwidth=55)
        yscroll = ttk.Scrollbar(list_frame, orient="vertical", command=self.table.yview)
        xscroll = ttk.Scrollbar(list_frame, orient="horizontal", command=self.table.xview)
        self.table.configure(yscrollcommand=yscroll.set, xscrollcommand=xscroll.set)
        self.table.grid(row=0, column=0, sticky="nsew")
        yscroll.grid(row=0, column=1, sticky="ns")
        xscroll.grid(row=1, column=0, sticky="ew")
        list_frame.rowconfigure(0, weight=1)
        list_frame.columnconfigure(0, weight=1)
        self.table.bind("<<TreeviewSelect>>", self.on_select)

        ttk.Label(detail_frame, text="Теги выбранного файла", font=("TkDefaultFont", 14, "bold")).pack(anchor="w", pady=(0, 10))
        self.fields: dict[str, tk.StringVar] = {}
        labels = (("artist", "Исполнитель"), ("title", "Название"), ("album", "Альбом"),
                  ("year", "Год"), ("genre", "Жанр"))
        for key, label in labels:
            line = ttk.Frame(detail_frame)
            line.pack(fill="x", pady=4)
            ttk.Label(line, text=label, width=12).pack(side="left")
            var = tk.StringVar()
            self.fields[key] = var
            ttk.Entry(line, textvariable=var).pack(side="left", fill="x", expand=True)

        self.match_button = ttk.Button(detail_frame, text="Найти совпадение", command=self.search_selected)
        self.match_button.pack(fill="x", pady=(12, 4))
        self.write_button = ttk.Button(detail_frame, text="Записать теги", command=self.write_selected)
        self.write_button.pack(fill="x", pady=4)
        ttk.Separator(detail_frame).pack(fill="x", pady=10)
        self.auto_button = ttk.Button(detail_frame, text="Автообработка папки", command=self.auto_process)
        self.auto_button.pack(fill="x", pady=4)
        ttk.Label(detail_frame, text="Пакетный режим заполняет только пустые поля и пропускает сомнительные совпадения.",
                  wraplength=270, foreground="#555").pack(anchor="w", pady=(4, 0))
        self.cover_label = ttk.Label(detail_frame, text="Обложка: не выбрана", foreground="#555")
        self.cover_label.pack(anchor="w", pady=(10, 0))

        bottom = ttk.Frame(self.root, padding=(10, 4, 10, 10))
        bottom.pack(fill="x")
        self.progress = ttk.Progressbar(bottom, mode="determinate")
        self.progress.pack(fill="x", pady=(0, 5))
        self.status_var = tk.StringVar(value="Выберите папку и нажмите «Сканировать».")
        ttk.Label(bottom, textvariable=self.status_var).pack(anchor="w")

    def choose_folder(self) -> None:
        selected = filedialog.askdirectory(initialdir=self.folder_var.get() or str(Path.home() / "Music"), title="Выберите папку с музыкой")
        if selected:
            self.folder_var.set(selected)

    def save_key(self) -> None:
        save_settings(self.key_var.get().strip(), self.folder_var.get().strip())
        self.status_var.set("Настройки сохранены на этом Mac.")

    def scan_folder(self) -> None:
        folder = Path(self.folder_var.get()).expanduser()
        if not folder.is_dir():
            messagebox.showerror("Папка не найдена", "Выберите существующую папку с аудиофайлами.")
            return
        if self.busy:
            return
        self.root_folder = folder
        self.tracks.clear()
        self.item_paths.clear()
        self.table.delete(*self.table.get_children())
        count = 0
        for directory, dirnames, filenames in os.walk(folder):
            dirnames[:] = [name for name in dirnames if not name.startswith(".")]
            for filename in filenames:
                path = Path(directory) / filename
                if path.suffix.lower() not in AUDIO_EXTENSIONS:
                    continue
                track = read_track(path)
                key = str(path)
                self.tracks[key] = track
                item = self.table.insert("", "end", text=path.name, values=(track.artist, track.title, track.album,
                                                                             track.year, track.genre, track.status))
                self.item_paths[item] = key
                count += 1
        save_settings(self.key_var.get().strip(), str(folder))
        self.status_var.set(f"Найдено аудиофайлов: {count}.")
        self.progress["value"] = 0

    def on_select(self, _event: Any = None) -> None:
        selected = self.table.selection()
        if not selected:
            return
        path = self.item_paths.get(selected[0])
        if not path:
            return
        self.selected_path = path
        track = self.tracks[path]
        for key, var in self.fields.items():
            var.set(getattr(track, key))
        self.current_candidate = None
        self.current_cover = None
        self.current_cover_mime = ""
        self.cover_label.configure(text="Обложка: не выбрана")

    def _set_track_status(self, path: str, status: str, values: dict[str, str] | None = None) -> None:
        track = self.tracks.get(path)
        if not track:
            return
        track.status = status
        if values:
            for key in ("artist", "title", "album", "year", "genre"):
                if key in values and values[key]:
                    setattr(track, key, values[key])
        item = next((iid for iid, item_path in self.item_paths.items() if item_path == path), None)
        if item:
            self.table.item(item, values=(track.artist, track.title, track.album, track.year, track.genre, track.status))

    def search_selected(self) -> None:
        path = self.selected_path
        if not path or self.busy:
            return
        track = self.tracks[path]
        source = track.source_values()
        key = self.key_var.get().strip()
        self.busy = True
        self.status_var.set("Ищу совпадения…")
        self._set_buttons(True)
        def worker() -> None:
            try:
                candidates: list[Candidate] = []
                if key and find_fpcalc():
                    try:
                        candidates = acoustid_search(track.path, key)
                    except Exception:
                        candidates = []
                if not candidates:
                    candidates = musicbrainz_search(source)
                for candidate in candidates:
                    if candidate.source == "MusicBrainz":
                        candidate.confidence = text_confidence(candidate, source)
                self.events.put(("search_done", (path, candidates, "")))
            except Exception as exc:
                self.events.put(("search_done", (path, [], str(exc))))
        threading.Thread(target=worker, daemon=True).start()

    def show_candidates(self, path: str, candidates: list[Candidate]) -> None:
        if not candidates:
            self.status_var.set("Совпадений не найдено. Проверьте имя файла и теги.")
            return
        dialog = tk.Toplevel(self.root)
        dialog.title("Выберите совпадение")
        dialog.geometry("850x330")
        dialog.transient(self.root)
        ttk.Label(dialog, text="Выберите запись, которая соответствует этому аудиофайлу.", padding=10).pack(anchor="w")
        columns = ("artist", "album", "year", "confidence", "source")
        tree = ttk.Treeview(dialog, columns=columns, show="tree headings", height=9, selectmode="browse")
        tree.heading("#0", text="Композиция")
        tree.column("#0", width=210)
        for key, title, width in (("artist", "Исполнитель", 160), ("album", "Альбом", 170),
                                  ("year", "Год", 60), ("confidence", "Уверенность", 90), ("source", "Источник", 95)):
            tree.heading(key, text=title)
            tree.column(key, width=width)
        tree.pack(fill="both", expand=True, padx=10, pady=4)
        mapping: dict[str, Candidate] = {}
        for candidate in candidates:
            confidence = candidate.acoustid_score if candidate.acoustid_score else candidate.confidence
            item = tree.insert("", "end", text=candidate.title, values=(candidate.artist, candidate.album,
                                                                           candidate.year, f"{confidence:.0%}", candidate.source))
            mapping[item] = candidate
        if candidates:
            first = tree.get_children()[0]
            tree.selection_set(first)

        def choose(_event: Any = None) -> None:
            selected = tree.selection()
            if not selected:
                return
            candidate = mapping[selected[0]]
            dialog.destroy()
            self._choose_candidate(path, candidate)

        tree.bind("<Double-1>", choose)
        actions = ttk.Frame(dialog, padding=10)
        actions.pack(fill="x")
        ttk.Button(actions, text="Выбрать", command=choose).pack(side="right")
        ttk.Button(actions, text="Отмена", command=dialog.destroy).pack(side="right", padx=6)
        dialog.grab_set()

    def _choose_candidate(self, path: str, candidate: Candidate) -> None:
        self.selected_path = path
        self.current_candidate = candidate
        self.current_cover = None
        self.current_cover_mime = ""
        for key, var in self.fields.items():
            var.set(getattr(candidate, key))
        self.cover_label.configure(text="Обложка: загружается, если доступна…")
        self.busy = True
        self._set_buttons(True)
        self.status_var.set("Получаю год, жанр и обложку…")
        def worker() -> None:
            try:
                enriched = enrich_candidate(candidate)
                cover, mime = download_cover(enriched)
                self.events.put(("candidate_done", (path, enriched, cover, mime, "")))
            except Exception as exc:
                cover, mime = download_cover(candidate)
                self.events.put(("candidate_done", (path, candidate, cover, mime, str(exc))))
        threading.Thread(target=worker, daemon=True).start()

    def write_selected(self) -> None:
        path = self.selected_path
        if not path or self.busy:
            return
        values = {key: var.get().strip() for key, var in self.fields.items()}
        cover = self.current_cover
        mime = self.current_cover_mime
        self.busy = True
        self._set_buttons(True)
        self.status_var.set("Записываю теги и резервную копию…")
        def worker() -> None:
            try:
                result, saved = write_metadata(Path(path), values, cover, mime, self.root_folder, overwrite=True)
                self.events.put(("write_done", (path, values, result, str(saved) if saved else "", "")))
            except Exception as exc:
                self.events.put(("write_done", (path, values, "", "", str(exc))))
        threading.Thread(target=worker, daemon=True).start()

    def auto_process(self) -> None:
        if self.busy:
            return
        if not self.tracks:
            messagebox.showinfo("Сначала сканируйте", "Выберите папку и нажмите «Сканировать».")
            return
        if not messagebox.askyesno("Автообработка", "Обработать всю папку? Программа заполнит пустые теги только для уверенных совпадений. Перед изменением каждого файла будет сохранена копия."):
            return
        tracks = list(self.tracks.values())
        api_key = self.key_var.get().strip()
        self.busy = True
        self._set_buttons(True)
        self.progress.configure(maximum=max(len(tracks), 1), value=0)
        self.status_var.set("Автообработка началась…")
        def worker() -> None:
            updated = skipped = errors = 0
            for index, track in enumerate(tracks, start=1):
                path = str(track.path)
                try:
                    source = track.source_values()
                    candidates: list[Candidate] = []
                    if api_key and find_fpcalc():
                        try:
                            candidates = acoustid_search(track.path, api_key)
                        except Exception:
                            candidates = []
                    if not candidates:
                        candidates = musicbrainz_search(source)
                    if not candidates:
                        skipped += 1
                        self.events.put(("auto_row", (index, path, "Совпадение не найдено", None)))
                        continue
                    candidate = candidates[0]
                    if candidate.acoustid_score < 0.90:
                        candidate.confidence = text_confidence(candidate, source)
                        if not source.get("artist") or not source.get("title") or candidate.confidence < 0.92:
                            skipped += 1
                            reason = "нужны исполнитель и название" if not source.get("artist") or not source.get("title") else f"сомнительно ({candidate.confidence:.0%})"
                            self.events.put(("auto_row", (index, path, f"Пропущено: {reason}", None)))
                            continue
                    try:
                        candidate = enrich_candidate(candidate)
                    except Exception:
                        pass
                    cover, mime = download_cover(candidate)
                    result, saved = write_metadata(track.path, candidate.values(), cover, mime, self.root_folder, overwrite=False)
                    if result == "Записано":
                        updated += 1
                    elif result == "Уже заполнено":
                        skipped += 1
                    self.events.put(("auto_row", (index, path, result, candidate.values())))
                except Exception as exc:
                    errors += 1
                    self.events.put(("auto_row", (index, path, f"Ошибка: {exc}", None)))
                finally:
                    self.events.put(("auto_progress", (index, len(tracks), updated, skipped, errors)))
            self.events.put(("auto_done", (updated, skipped, errors)))
        threading.Thread(target=worker, daemon=True).start()

    def _set_buttons(self, disabled: bool) -> None:
        state = "disabled" if disabled else "normal"
        for button in (self.choose_button, self.scan_button, self.match_button, self.write_button, self.auto_button):
            button.configure(state=state)

    def _poll_events(self) -> None:
        try:
            while True:
                kind, payload = self.events.get_nowait()
                if kind == "search_done":
                    path, candidates, error = payload
                    self.busy = False
                    self._set_buttons(False)
                    if error:
                        self.status_var.set(f"Ошибка поиска: {error}")
                    else:
                        self.show_candidates(path, candidates)
                        self.status_var.set(f"Найдено вариантов: {len(candidates)}.")
                elif kind == "candidate_done":
                    path, candidate, cover, mime, error = payload
                    self.current_candidate = candidate
                    if self.selected_path == path:
                        for key, var in self.fields.items():
                            value = getattr(candidate, key)
                            if value:
                                var.set(value)
                        self.current_cover = cover
                        self.current_cover_mime = mime
                        self.cover_label.configure(text="Обложка: найдена" if cover else "Обложка: в архиве не найдена")
                    self._set_track_status(path, f"Совпадение выбрано ({candidate.source})")
                    self.busy = False
                    self._set_buttons(False)
                    self.status_var.set("Данные готовы. Проверьте поля и нажмите «Записать теги»." + (f" MusicBrainz: {error}" if error else ""))
                elif kind == "write_done":
                    path, values, result, saved, error = payload
                    self.busy = False
                    self._set_buttons(False)
                    if error:
                        self.status_var.set(f"Ошибка записи: {error}")
                        messagebox.showerror("Ошибка записи", error)
                    else:
                        self._set_track_status(path, result, values)
                        extra = f" Резервная копия: {saved}" if saved else ""
                        self.status_var.set(result + extra)
                elif kind == "auto_row":
                    _index, path, status, values = payload
                    self._set_track_status(path, status, values)
                elif kind == "auto_progress":
                    index, total, updated, skipped, errors = payload
                    self.progress.configure(maximum=total, value=index)
                    self.status_var.set(f"Обработка {index}/{total} · записано: {updated} · пропущено: {skipped} · ошибок: {errors}")
                elif kind == "auto_done":
                    updated, skipped, errors = payload
                    self.busy = False
                    self._set_buttons(False)
                    self.status_var.set(f"Готово. Записано: {updated}, пропущено: {skipped}, ошибок: {errors}.")
                    messagebox.showinfo("Автообработка завершена", f"Записано: {updated}\nПропущено: {skipped}\nОшибок: {errors}")
        except queue.Empty:
            pass
        self.root.after(100, self._poll_events)


def main() -> None:
    root = tk.Tk()
    try:
        ttk.Style().theme_use("aqua")
    except tk.TclError:
        pass
    AudioTaggerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
