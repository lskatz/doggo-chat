"""Tests for build_sounds: directory scanning and manifest emission."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import build_sounds  # noqa: E402


@pytest.fixture
def sounds_dir(tmp_path: Path) -> Path:
    """Build a `sounds/` subdir mirroring the real layout."""
    root = tmp_path / "sounds"
    for cat in build_sounds.CATEGORIES:
        (root / cat).mkdir(parents=True, exist_ok=True)
    return root


def _touch(p: Path) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(b"\x00")


# -- scan_category -------------------------------------------------------------


class TestScanCategory:
    def test_empty_category_returns_empty(self, sounds_dir):
        assert build_sounds.scan_category(sounds_dir, "bark") == []

    def test_returns_only_audio_files(self, sounds_dir):
        _touch(sounds_dir / "bark" / "woof1.mp3")
        _touch(sounds_dir / "bark" / "woof2.ogg")
        _touch(sounds_dir / "bark" / "notes.txt")
        _touch(sounds_dir / "bark" / "image.png")
        result = build_sounds.scan_category(sounds_dir, "bark")
        assert any(p.endswith("woof1.mp3") for p in result)
        assert any(p.endswith("woof2.ogg") for p in result)
        assert not any(p.endswith(".txt") for p in result)
        assert not any(p.endswith(".png") for p in result)

    def test_returns_paths_sorted(self, sounds_dir):
        for name in ("c.mp3", "a.mp3", "b.mp3"):
            _touch(sounds_dir / "bark" / name)
        result = build_sounds.scan_category(sounds_dir, "bark")
        assert result == sorted(result)

    def test_returns_relative_to_assets(self, sounds_dir):
        _touch(sounds_dir / "music" / "idle" / "calm.mp3")
        result = build_sounds.scan_category(sounds_dir, "music/idle")
        assert result == ["sounds/music/idle/calm.mp3"]

    def test_missing_category_returns_empty(self, sounds_dir):
        # Category dir doesn't exist
        assert build_sounds.scan_category(sounds_dir, "does/not/exist") == []

    def test_ignores_subdirectories(self, sounds_dir):
        # A directory with audio extension in name should be ignored — only files
        (sounds_dir / "bark" / "subdir.mp3").mkdir()
        _touch(sounds_dir / "bark" / "real.mp3")
        result = build_sounds.scan_category(sounds_dir, "bark")
        assert result == ["sounds/bark/real.mp3"]

    def test_case_insensitive_extensions(self, sounds_dir):
        _touch(sounds_dir / "bark" / "loud.MP3")
        _touch(sounds_dir / "bark" / "soft.WAV")
        result = build_sounds.scan_category(sounds_dir, "bark")
        assert len(result) == 2


# -- build_manifest ------------------------------------------------------------


class TestBuildManifest:
    def test_all_categories_present(self, sounds_dir):
        m = build_sounds.build_manifest(sounds_dir)
        assert set(m.keys()) == set(build_sounds.CATEGORIES)
        assert all(v == [] for v in m.values())

    def test_populated_manifest(self, sounds_dir):
        _touch(sounds_dir / "bark" / "a.mp3")
        _touch(sounds_dir / "happy" / "yip.ogg")
        _touch(sounds_dir / "music" / "idle" / "ambient.mp3")
        m = build_sounds.build_manifest(sounds_dir)
        assert len(m["bark"]) == 1
        assert len(m["happy"]) == 1
        assert len(m["music/idle"]) == 1
        assert m["whine"] == []


# -- render_js / build ---------------------------------------------------------


class TestRender:
    def test_render_es_module_shape(self):
        js = build_sounds.render_js({"bark": []})
        assert "export const SOUND_MANIFEST" in js
        assert "Object.freeze" in js
        assert "export default SOUND_MANIFEST" in js

    def test_render_js_payload_is_json(self):
        manifest = {"bark": ["sounds/bark/a.mp3"], "whine": []}
        js = build_sounds.render_js(manifest)
        m = re.search(r"Object\.freeze\((.*)\);\nexport default", js, re.DOTALL)
        assert m
        parsed = json.loads(m.group(1))
        assert parsed == manifest

    def test_build_writes_file(self, sounds_dir, tmp_path):
        _touch(sounds_dir / "bark" / "a.mp3")
        out = tmp_path / "out" / "sounds.js"
        result = build_sounds.build(sounds_dir, out)
        assert result == out
        assert out.exists()
        assert "SOUND_MANIFEST" in out.read_text()
