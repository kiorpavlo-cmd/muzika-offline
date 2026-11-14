#!/usr/bin/env python3
"""Line-oriented JSON backend for the native macOS Audio Library Tagger UI."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
import traceback
import time
from datetime import datetime, timezone
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from pathlib import Path
from threading import Event, Lock, Thread
from typing import Any, Callable

import app as core


CACHE_VERSION = 1
MAX_CACHED_LIBRARIES = 8
CACHE_ROW_FIELDS = ("path", "file", "artist", "title", "album", "year", "genre", "status")
LOOKUP_CACHE_VERSION = 1
LOOKUP_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60
MAX_LOOKUP_CACHE_ENTRIES = 2500
_output_lock = Lock()
_search_lock = Lock()
_lookup_cache_lock = Lock()
_search_tasks: dict[str, Event] = {}


def emit(payload: dict[str, Any]) -> None:
    with _output_lock:
        sys.stdout.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
        sys.stdout.flush()


def candidate_to_dict(candidate: core.Candidate) -> dict[str, Any]:
    return {
        "mbid": candidate.mbid,
        "title": candidate.title,
        "artist": candidate.artist,
        "album": candidate.album,
        "year": candidate.year,
        "genre": candidate.genre,
        "release_id": candidate.release_id,
        "release_group_id": candidate.release_group_id,
        "mb_score": candidate.mb_score,
        "acoustid_score": candidate.acoustid_score,
        "confidence": candidate.confidence,
        "source": candidate.source,
    }


def candidate_from_dict(value: dict[str, Any]) -> core.Candidate:
    allowed = {key: value.get(key, default) for key, default in {
        "mbid": "", "title": "", "artist": "", "album": "", "year": "", "genre": "",
        "release_id": "", "release_group_id": "", "mb_score": 0.0, "acoustid_score": 0.0,
        "confidence": 0.0, "source": "MusicBrainz",
    }.items()}
    return core.Candidate(**allowed)


def track_to_dict(track: core.Track) -> dict[str, Any]:
    return {
        "path": str(track.path),
        "file": track.path.name,
        "artist": track.artist,
        "title": track.title,
        "album": track.album,
        "year": track.year,
        "genre": track.genre,
        "status": track.status,
    }


def scan_cache_file() -> Path:
    return core.settings_file().with_name("library_cache.json")


def folder_cache_key(folder: Path) -> str:
    return str(folder.expanduser().resolve())


def read_scan_cache() -> dict[str, Any]:
    try:
        data = json.loads(scan_cache_file().read_text(encoding="utf-8"))
        if data.get("version") == CACHE_VERSION and isinstance(data.get("libraries"), dict):
            return data
    except Exception:
        pass
    return {"version": CACHE_VERSION, "libraries": {}}


def save_scan_cache(folder: Path, rows: list[dict[str, Any]]) -> int:
    target = scan_cache_file()
    target.parent.mkdir(parents=True, exist_ok=True)
    data = read_scan_cache()
    key = folder_cache_key(folder)
    cached_rows = []
    for row in rows:
        if not isinstance(row, dict) or not row.get("path"):
            continue
        cached_rows.append({field: str(row.get(field) or "") for field in CACHE_ROW_FIELDS})
    libraries = data["libraries"]
    libraries[key] = {
        "folder": key,
        "cached_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rows": cached_rows,
    }
    ordered = sorted(
        libraries.items(),
        key=lambda item: str(item[1].get("cached_at", "")),
        reverse=True,
    )
    data["libraries"] = dict(ordered[:MAX_CACHED_LIBRARIES])
    temporary = target.with_name(target.name + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, target)
    return len(cached_rows)


def load_scan_cache(folder: Path) -> dict[str, Any]:
    entry = read_scan_cache()["libraries"].get(folder_cache_key(folder))
    if not isinstance(entry, dict) or not isinstance(entry.get("rows"), list):
        return {"found": False, "rows": []}
    return {
        "found": True,
        "rows": entry["rows"],
        "cached_at": str(entry.get("cached_at") or ""),
    }


def lookup_cache_file() -> Path:
    return core.settings_file().with_name("lookup_cache.json")


def lookup_cache_key(path: Path, source: dict[str, str], has_api_key: bool) -> str:
    try:
        resolved = str(path.expanduser().resolve())
        stat = path.stat()
        file_state = [stat.st_size, getattr(stat, "st_mtime_ns", int(stat.st_mtime * 1_000_000_000))]
    except OSError:
        resolved = str(path.expanduser())
        file_state = []
    identity = {
        "path": resolved,
        "file": file_state,
        "source": {key: core.normalize_match_text(source.get(key, "")) for key in ("artist", "title", "album")},
        "acoustid_enabled": has_api_key,
    }
    packed = json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(packed.encode("utf-8")).hexdigest()


def load_lookup_cache(key: str) -> list[core.Candidate] | None:
    try:
        payload = json.loads(lookup_cache_file().read_text(encoding="utf-8"))
        if payload.get("version") != LOOKUP_CACHE_VERSION:
            return None
        entry = payload.get("entries", {}).get(key)
        if not isinstance(entry, dict):
            return None
        saved_at = float(entry.get("saved_at") or 0)
        if time.time() - saved_at > LOOKUP_CACHE_TTL_SECONDS:
            return None
        values = entry.get("candidates")
        if not isinstance(values, list):
            return None
        candidates = [candidate_from_dict(value) for value in values if isinstance(value, dict)]
        return candidates or None
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return None


def save_lookup_cache(key: str, candidates: list[core.Candidate]) -> None:
    if not candidates:
        return
    with _lookup_cache_lock:
        _save_lookup_cache_locked(key, candidates)


def _save_lookup_cache_locked(key: str, candidates: list[core.Candidate]) -> None:
    target = lookup_cache_file()
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
        if payload.get("version") != LOOKUP_CACHE_VERSION or not isinstance(payload.get("entries"), dict):
            payload = {"version": LOOKUP_CACHE_VERSION, "entries": {}}
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        payload = {"version": LOOKUP_CACHE_VERSION, "entries": {}}
    entries = payload["entries"]
    entries[key] = {
        "saved_at": time.time(),
        "candidates": [candidate_to_dict(candidate) for candidate in candidates],
    }
    if len(entries) > MAX_LOOKUP_CACHE_ENTRIES:
        newest = sorted(entries.items(), key=lambda item: float(item[1].get("saved_at") or 0), reverse=True)
        payload["entries"] = dict(newest[:MAX_LOOKUP_CACHE_ENTRIES])
    temporary = target.with_name(target.name + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, target)


def merge_and_rank_candidates(
    acoustic_candidates: list[core.Candidate],
    text_candidates: list[core.Candidate],
    source: dict[str, str],
) -> list[core.Candidate]:
    merged = {candidate.mbid: candidate for candidate in acoustic_candidates}
    for text_candidate in text_candidates:
        acoustic = merged.get(text_candidate.mbid)
        if acoustic is None:
            merged[text_candidate.mbid] = text_candidate
            continue
        acoustic.title = text_candidate.title or acoustic.title
        acoustic.artist = text_candidate.artist or acoustic.artist
        acoustic.album = text_candidate.album or acoustic.album
        acoustic.year = text_candidate.year or acoustic.year
        acoustic.genre = text_candidate.genre or acoustic.genre
        acoustic.release_id = text_candidate.release_id or acoustic.release_id
        acoustic.release_group_id = text_candidate.release_group_id or acoustic.release_group_id
        acoustic.mb_score = text_candidate.mb_score

    candidates = list(merged.values())
    has_text = bool(source.get("title") or source.get("artist"))
    for candidate in candidates:
        text_score = core.text_confidence(candidate, source)
        if candidate.acoustid_score:
            candidate.confidence = (0.72 * candidate.acoustid_score + 0.28 * text_score) if has_text else candidate.acoustid_score
        else:
            candidate.confidence = text_score
    return sorted(candidates, key=lambda item: (item.confidence, item.acoustid_score, item.mb_score), reverse=True)


def provider_error_message(provider: str, error: Exception) -> str:
    status = getattr(error, "code", None)
    if status == 503:
        return f"{provider} временно недоступен (HTTP 503)"
    if status == 429:
        return f"{provider} ограничил частоту запросов (HTTP 429)"
    if "timed out" in str(error).lower():
        return f"{provider} не ответил вовремя"
    return f"{provider}: {error}"


def find_candidates(
    path: Path,
    api_key: str,
    cancel_event: Event | None = None,
    progress: Callable[[str], None] | None = None,
) -> tuple[list[core.Candidate], str]:
    def report(message: str) -> None:
        if progress:
            progress(message)

    if cancel_event and cancel_event.is_set():
        return [], ""
    track = core.read_track(path)
    source = track.source_values()
    cache_key = lookup_cache_key(path, source, bool(api_key))
    cached = load_lookup_cache(cache_key)
    if cached:
        report("Использую сохранённые результаты поиска.")
        return merge_and_rank_candidates(cached, [], source), ""

    provider_warnings: list[str] = []
    acoustic_candidates: list[core.Candidate] = []
    if api_key and core.find_fpcalc():
        report("Проверяю звучание трека через AcoustID…")
        try:
            acoustic_candidates = core.acoustid_search(path, api_key, cancel_event)
        except Exception as exc:
            acoustic_candidates = []
            if not (cancel_event and cancel_event.is_set()):
                provider_warnings.append(provider_error_message("AcoustID", exc))
                report("AcoustID не ответил. Продолжаю поиск по названию и исполнителю…")
    if cancel_event and cancel_event.is_set():
        return [], ""

    text_candidates: list[core.Candidate] = []
    if source.get("title"):
        report("Ищу совпадения в MusicBrainz…")
        try:
            text_candidates = core.musicbrainz_search(source, cancel_event)
        except Exception as exc:
            if not (cancel_event and cancel_event.is_set()):
                provider_warnings.append(provider_error_message("MusicBrainz", exc))
                report("MusicBrainz не ответил. Продолжаю поиск через Apple Music…")
    if cancel_event and cancel_event.is_set():
        return [], ""

    ranked = merge_and_rank_candidates(acoustic_candidates, text_candidates, source)
    if not ranked or ranked[0].confidence < 0.90:
        report("Уверенного совпадения пока нет. Проверяю Apple Music…")
        try:
            catalog_candidates = core.apple_catalog_search(source, cancel_event)
        except Exception:
            catalog_candidates = []
        if cancel_event and cancel_event.is_set():
            return [], ""
        ranked = merge_and_rank_candidates(ranked, catalog_candidates, source)

    # Hide obvious false positives: a title-only near-match with a different
    # artist should not be presented as if it were the requested recording.
    filtered: list[core.Candidate] = []
    for candidate in ranked:
        title_match = core.text_similarity(source.get("title", ""), candidate.title) if source.get("title") else 1.0
        artist_match = core.text_similarity(source.get("artist", ""), candidate.artist) if source.get("artist") and candidate.artist else 1.0
        if source.get("title") and title_match < 0.36:
            continue
        if source.get("artist") and candidate.artist and artist_match < 0.28 and title_match < 0.90:
            continue
        if candidate.confidence < 0.43 and candidate.acoustid_score < 0.78:
            continue
        filtered.append(candidate)

    report(f"Собираю результаты: подходящих вариантов — {len(filtered)}.")
    save_lookup_cache(cache_key, filtered)
    warning = "; ".join(provider_warnings)
    if not filtered and warning:
        warning = f"Поиск завершён не полностью: {warning}. Совпадения не подтверждены — повторите поиск позже."
    return filtered, warning


def discover_audio_paths(
    folder: Path,
    progress: Callable[[dict[str, Any]], None] | None = None,
) -> list[Path]:
    if not folder.is_dir():
        raise ValueError("Выбранная папка не найдена.")
    paths: list[Path] = []
    last_report = 0.0
    if progress:
        progress({"phase": "discover", "found": 0})
    for directory, dirnames, filenames in os.walk(folder):
        dirnames[:] = [name for name in dirnames if not name.startswith(".")]
        for filename in filenames:
            if os.path.splitext(filename)[1].lower() in core.AUDIO_EXTENSIONS:
                paths.append(Path(directory) / filename)
                now = time.monotonic()
                if progress and (len(paths) % 25 == 0 or now - last_report >= 0.25):
                    progress({"phase": "discover", "found": len(paths)})
                    last_report = now
    return paths


def scan_folder(
    folder: Path,
    progress: Callable[[dict[str, Any]], None] | None = None,
) -> list[dict[str, Any]]:
    paths = discover_audio_paths(folder, progress)
    total = len(paths)
    if progress:
        progress({"phase": "read", "index": 0, "total": total, "found": total})
    if not paths:
        return []

    rows: list[dict[str, Any] | None] = [None] * total
    worker_count = min(4, total)
    pending: dict[Any, int] = {}
    next_index = completed = 0
    report_every = max(1, min(10, total // 100 or 1))
    with ThreadPoolExecutor(max_workers=worker_count, thread_name_prefix="tag-scan") as pool:
        while next_index < min(total, worker_count * 2):
            pending[pool.submit(core.read_track, paths[next_index])] = next_index
            next_index += 1

        while pending:
            done, _ = wait(pending, return_when=FIRST_COMPLETED)
            for future in done:
                index = pending.pop(future)
                path = paths[index]
                try:
                    rows[index] = track_to_dict(future.result())
                except Exception as exc:
                    rows[index] = track_to_dict(core.Track(path=path, status=f"Ошибка чтения: {exc}"))
                completed += 1
                if progress and (completed == 1 or completed % report_every == 0 or completed == total):
                    progress({
                        "phase": "read",
                        "index": completed,
                        "total": total,
                        "found": total,
                        "file": path.name,
                    })
                if next_index < total:
                    pending[pool.submit(core.read_track, paths[next_index])] = next_index
                    next_index += 1
    return [row for row in rows if row is not None]


def auto_process(folder: Path, api_key: str, request_id: str) -> dict[str, int]:
    files = discover_audio_paths(folder, lambda data: emit({
        "id": request_id,
        "event": "progress",
        "data": data,
    }))
    updated = skipped = errors = 0
    for index, path in enumerate(files, start=1):
        values: dict[str, str] | None = None
        renamed_path = path
        try:
            track = core.read_track(path)
            source = track.source_values()
            candidates: list[core.Candidate] = []
            if api_key:
                try:
                    candidates = core.acoustid_search(path, api_key)
                except Exception:
                    candidates = []
            if not candidates:
                candidates = core.musicbrainz_search(source)
            else:
                candidates = merge_and_rank_candidates(candidates, [], source)
                if candidates[0].confidence < 0.91 and source.get("title"):
                    try:
                        text_matches = core.musicbrainz_search(source)
                    except Exception:
                        text_matches = []
                    candidates = merge_and_rank_candidates(candidates, text_matches, source)
            if not candidates:
                skipped += 1
                row_status = "Совпадение не найдено"
            else:
                candidate = candidates[0]
                confidence = candidate.confidence or core.text_confidence(candidate, source)
                threshold = 0.97 if not source.get("artist") or not source.get("title") else 0.91
                if confidence < threshold:
                    skipped += 1
                    why = "нужны исполнитель и название" if not source.get("artist") or not source.get("title") else f"сомнительно ({confidence:.0%})"
                    row_status = f"Пропущено: {why}"
                else:
                    row_status, values, updated, skipped, renamed_path = apply_auto_match(candidate, path, folder, updated, skipped)
        except Exception as exc:
            errors += 1
            row_status = f"Ошибка: {exc}"
            renamed_path = path
        emit({"id": request_id, "event": "progress", "data": {
            "index": index, "total": len(files), "path": str(path), "status": row_status,
            "new_path": str(renamed_path), "values": values, "updated": updated, "skipped": skipped, "errors": errors,
        }})
    return {"updated": updated, "skipped": skipped, "errors": errors}


def apply_auto_match(candidate: core.Candidate, path: Path, folder: Path, updated: int, skipped: int) -> tuple[str, dict[str, str], int, int, Path]:
    try:
        candidate = core.enrich_candidate(candidate)
    except Exception:
        pass
    cover, mime = core.download_cover(candidate)
    values = candidate.values()
    result, _saved = core.write_metadata(path, values, cover, mime, folder, overwrite=False)
    if result == "Записано":
        updated += 1
    elif result == "Уже заполнено":
        skipped += 1
    renamed_path = core.rename_audio_file(
        path, values.get("title", ""), values.get("artist", ""), values.get("album", "")
    )
    if renamed_path != path:
        result = f"{result} · Файл переименован: {renamed_path.name}"
    return result, values, updated, skipped, renamed_path


def handle(request: dict[str, Any]) -> dict[str, Any] | None:
    request_id = str(request.get("id", ""))
    action = request.get("action")
    if action == "settings":
        return {"folder": str(core.load_settings().get("folder") or Path.home() / "Music"),
                "api_key": str(core.load_settings().get("acoustid_key") or "")}
    if action == "acoustid_status":
        return {"fpcalc": core.find_fpcalc() or ""}
    if action == "save_settings":
        current = core.load_settings()
        key = str(request.get("api_key", current.get("acoustid_key", ""))).strip()
        folder = str(request.get("folder", current.get("folder", ""))).strip()
        core.save_settings(key, folder)
        return {"saved": True}
    if action == "load_cache":
        folder_text = str(request.get("folder", "")).strip()
        if not folder_text:
            return {"found": False, "rows": []}
        folder = Path(folder_text).expanduser()
        return load_scan_cache(folder)
    if action == "save_cache":
        folder_text = str(request.get("folder", "")).strip()
        if not folder_text:
            raise ValueError("Не выбрана папка медиатеки.")
        folder = Path(folder_text).expanduser()
        rows = request.get("rows", [])
        if not isinstance(rows, list):
            raise ValueError("Некорректный список файлов для сохранения.")
        return {"saved": save_scan_cache(folder, rows)}
    if action == "scan":
        folder = Path(str(request.get("folder", ""))).expanduser()
        rows = scan_folder(folder, lambda data: emit({
            "id": request_id,
            "event": "progress",
            "data": data,
        }))
        current = core.load_settings()
        core.save_settings(str(current.get("acoustid_key") or ""), str(folder))
        cache_error = ""
        try:
            save_scan_cache(folder, rows)
        except Exception as exc:
            cache_error = str(exc)
        return {"rows": rows, "cache_saved": not cache_error, "cache_error": cache_error}
    if action == "search":
        candidates, warning = find_candidates(Path(str(request["path"])), str(request.get("api_key", "")).strip())
        return {"candidates": [candidate_to_dict(item) for item in candidates], "warning": warning}
    if action == "cancel_search":
        target_id = str(request.get("target_id", ""))
        with _search_lock:
            cancel_event = _search_tasks.get(target_id)
        if cancel_event:
            cancel_event.set()
        return {"cancelled": cancel_event is not None}
    if action == "select_candidate":
        candidate = candidate_from_dict(request.get("candidate", {}))
        error = ""
        try:
            candidate = core.enrich_candidate(candidate)
        except Exception as exc:
            error = str(exc)
        cover, mime = core.download_cover(candidate)
        return {
            "candidate": candidate_to_dict(candidate),
            "values": candidate.values(),
            "cover": base64.b64encode(cover).decode("ascii") if cover else "",
            "cover_mime": mime,
            "warning": error,
        }
    if action == "write":
        path = Path(str(request["path"]))
        folder = Path(str(request.get("folder", path.parent)))
        cover_text = str(request.get("cover", ""))
        cover = base64.b64decode(cover_text) if cover_text else None
        values = {key: str(value).strip() for key, value in request.get("values", {}).items()}
        result, saved = core.write_metadata(
            path,
            values,
            cover,
            str(request.get("cover_mime", "")),
            folder,
            overwrite=True,
            create_backup=bool(request.get("create_backup", True)),
        )
        renamed_path = core.rename_audio_file(
            path, values.get("title", ""), values.get("artist", ""), values.get("album", "")
        )
        if renamed_path != path:
            result = f"{result} · Файл переименован: {renamed_path.name}"
        return {"status": result, "backup": str(saved) if saved else "", "path": str(renamed_path), "values": values}
    if action == "auto":
        summary = auto_process(Path(str(request["folder"])).expanduser(), str(request.get("api_key", "")).strip(), request_id)
        return summary
    raise ValueError(f"Неизвестное действие: {action}")


def start_search(request: dict[str, Any]) -> None:
    request_id = str(request.get("id", ""))
    cancel_event = Event()
    with _search_lock:
        _search_tasks[request_id] = cancel_event

    def run() -> None:
        try:
            candidates, warning = find_candidates(
                Path(str(request["path"])),
                str(request.get("api_key", "")).strip(),
                cancel_event,
                lambda message: emit({
                    "id": request_id,
                    "event": "progress",
                    "data": {"phase": "search", "message": message},
                }),
            )
            if cancel_event.is_set():
                emit({"id": request_id, "event": "error", "error": "Поиск остановлен: выбран другой трек."})
            else:
                emit({
                    "id": request_id,
                    "event": "response",
                    "result": {"candidates": [candidate_to_dict(item) for item in candidates], "warning": warning},
                })
        except Exception as exc:
            emit({"id": request_id, "event": "error", "error": str(exc)})
        finally:
            with _search_lock:
                _search_tasks.pop(request_id, None)

    Thread(target=run, name=f"tag-search-{request_id}", daemon=True).start()


def main() -> None:
    for line in sys.stdin:
        try:
            request = json.loads(line)
            request_id = str(request.get("id", ""))
            if request.get("action") == "search":
                start_search(request)
                continue
            result = handle(request)
            emit({"id": request_id, "event": "response", "result": result or {}})
        except Exception as exc:
            emit({"id": str(locals().get("request", {}).get("id", "")), "event": "error", "error": str(exc)})


if __name__ == "__main__":
    main()
