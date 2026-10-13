#!/usr/bin/env python3
"""Manually mirror only the selected public collection and its CSS dependencies."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import re
import stat
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).absolute().parent
PUBLIC = ROOT / "public"
MANIFEST = "manifest-sha256.json"
FONT_NOTICES = (
    "fonts/nocturne/bodoni-moda-OFL.txt",
    "fonts/nocturne/source-sans-3-OFL.txt",
    "fonts/nocturne/ibm-plex-mono-OFL.txt",
    "fonts/nocturne/provenance.json",
)
PRIVATE_PARTS = {"private", "work", "checkpoints", "checkpoint", "conversations", "conversation", "memories"}
ALLOWED_TYPES = {".html", ".css", ".js", ".mjs", ".json", ".txt", ".md", ".csv", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".woff", ".woff2"}
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)
CSS_IMPORT = re.compile(r"@import\s+(['\"])(.*?)\1", re.IGNORECASE)


def no_links(path):
    """Check every existing component, including ancestors and Windows junctions."""
    for item in (path, *path.parents):
        try:
            attributes = getattr(item.lstat(), "st_file_attributes", 0)
        except FileNotFoundError:
            attributes = 0
        if item.is_symlink() or attributes & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400):
            raise ValueError(f"Symlinks and junctions are outside the mirror scope: {item}")


def relative_name(value):
    name = PurePosixPath(value)
    if not value or "\\" in value or ":" in value or name.is_absolute() or any(
        part in {"", ".", ".."} or part.startswith(".") or part.lower() in PRIVATE_PARTS
        for part in value.split("/")
    ):
        raise ValueError(f"Unsafe or private relative path: {value!r}")
    if name.suffix.lower() not in ALLOWED_TYPES:
        raise ValueError(f"File type is outside the public collection allowlist: {value}")
    if "checkpoint" in name.name.lower() or "conversation" in name.name.lower():
        raise ValueError(f"Private operational filename is outside the mirror scope: {value}")
    return name.as_posix()


def safe_path(root, name):
    name = relative_name(name)
    path = root.joinpath(*PurePosixPath(name).parts)
    no_links(path)
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError(f"Path escapes the specified root: {name}")
    return path


def tree_files(root):
    no_links(root)
    if not root.is_dir():
        raise ValueError(f"Required directory is missing: {root}")
    found = []
    for current, directories, files in os.walk(root, followlinks=False):
        for name in directories + files:
            no_links(Path(current) / name)
        for name in files:
            path = Path(current) / name
            if not path.is_file():
                raise ValueError(f"Not a regular file: {path}")
            found.append(path)
    return sorted(found)


def css_reference(css_name, raw):
    parsed = urlsplit(raw.strip())
    if parsed.scheme == "data" or (not parsed.path and parsed.fragment):
        return None
    if parsed.scheme or parsed.netloc:
        raise ValueError(f"External CSS dependency requires separate review: {raw}")
    decoded = unquote(parsed.path)
    base = "" if decoded.startswith("/") else posixpath.dirname(css_name)
    name = posixpath.normpath(posixpath.join(base, decoded.lstrip("/")))
    return relative_name(name)


def collect(source):
    files = {}
    for path in tree_files(source / "open-hours"):
        name = relative_name(path.relative_to(source).as_posix())
        files[name] = safe_path(source, name)
    if "open-hours/index.html" not in files:
        raise ValueError("Source must contain the curated open-hours/index.html edition.")
    for name in FONT_NOTICES:
        path = safe_path(source, name)
        if not path.is_file():
            raise ValueError(f"Required font notice or provenance file is missing: {name}")
        files[name] = path
    pending = ["portfolio-theme.css"]
    visited = set()
    while pending:
        name = pending.pop()
        if name in visited:
            continue
        visited.add(name)
        path = safe_path(source, name)
        if not path.is_file():
            raise ValueError(f"Required public styling dependency is missing: {name}")
        files[name] = path
        if path.suffix.lower() == ".css":
            css = re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.DOTALL)
            for _, raw in CSS_URL.findall(css) + CSS_IMPORT.findall(css):
                target = css_reference(name, raw)
                if target is not None:
                    pending.append(target)
    return files


def record(name, data):
    return {"path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="The portfolio public directory (containing open-hours/ and portfolio-theme.css).")
    parser.add_argument("--dry-run", action="store_true", help="Validate the scope and print planned relative files without copying.")
    args = parser.parse_args()
    source = args.source.expanduser().absolute()
    no_links(source)
    no_links(PUBLIC)
    if source.resolve().is_relative_to(PUBLIC.resolve()) or PUBLIC.resolve().is_relative_to(source.resolve()):
        raise ValueError("Source and destination must be separate, non-nested directories.")
    files = collect(source)
    entry = safe_path(PUBLIC, "index.html")
    if not entry.is_file():
        raise ValueError("The mirror root public/index.html scaffold is missing.")
    planned = set(files) | {"index.html"}
    existing = {p.relative_to(PUBLIC).as_posix() for p in tree_files(PUBLIC)}
    unexpected = existing - planned - {MANIFEST}
    if unexpected:
        raise ValueError("Review/remove stale or unexpected public files before sync: " + ", ".join(sorted(unexpected)))
    for name in sorted(planned):
        safe_path(PUBLIC, name)
    if args.dry_run:
        print(json.dumps({"files": sorted(planned), "manifest": MANIFEST, "copy_count": len(files)}, indent=2))
        return
    records = []
    for name, path in sorted(files.items()):
        data = path.read_bytes()
        target = safe_path(PUBLIC, name)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        if target.read_bytes() != data:
            raise OSError(f"Copied bytes failed verification: {name}")
        records.append(record(name, data))
    records.append(record("index.html", entry.read_bytes()))
    records.sort(key=lambda item: item["path"])
    manifest = {"version": 1, "algorithm": "SHA-256", "files": records}
    safe_path(PUBLIC, MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Mirrored {len(files)} files; verified {len(records)} public files. No publication performed.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print(f"Sync stopped: {error}", file=sys.stderr)
        raise SystemExit(1)
