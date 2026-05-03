"""Tests for build_data: YAML loading, validation, and JS module emission."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import build_data  # noqa: E402


def _write(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


@pytest.fixture
def good_data_dir(tmp_path: Path) -> Path:
    _write(
        tmp_path / "breeds.yml",
        """
- id: foo
  name: Foo
  body_type: round
- id: bar
  name: Bar
  body_type: slim
""",
    )
    _write(
        tmp_path / "personalities.yml",
        """
- id: p1
  name: P1
  decay:
    hunger: 1.0
    thirst: 1.0
    bladder: 1.0
    energy: 1.0
""",
    )
    _write(
        tmp_path / "accessories.yml",
        """
collars:
  - id: none
    name: None
clothes:
  - id: none
    name: None
tricks:
  - id: sit
    name: Sit
""",
    )
    _write(
        tmp_path / "colors.yml",
        """
coat_colors:
  - id: golden
    name: Golden
    hex: "#E0AE6F"
markings:
  - id: solid
    name: Solid
eye_colors:
  - id: brown
    name: Brown
    hex: "#3E2A1A"
""",
    )
    return tmp_path


# -- load_all ------------------------------------------------------------------


class TestLoadAll:
    def test_loads_all_expected(self, good_data_dir):
        data = build_data.load_all(good_data_dir)
        assert set(data.keys()) == set(build_data.EXPECTED_FILES.keys())
        assert len(data["breeds"]) == 2

    def test_missing_file_raises(self, good_data_dir):
        (good_data_dir / "breeds.yml").unlink()
        with pytest.raises(FileNotFoundError):
            build_data.load_all(good_data_dir)


# -- validate ------------------------------------------------------------------


class TestValidate:
    def test_good_data_no_errors(self, good_data_dir):
        data = build_data.load_all(good_data_dir)
        assert build_data.validate(data) == []

    def test_empty_breeds(self):
        bad = {
            "breeds": [],
            "personalities": [{"id": "x", "decay": {"hunger": 1, "thirst": 1, "bladder": 1, "energy": 1}}],
            "accessories": {"collars": [], "clothes": [], "tricks": []},
            "colors": {"coat_colors": [], "markings": [], "eye_colors": []},
        }
        errors = build_data.validate(bad)
        assert any("non-empty" in e for e in errors)

    def test_duplicate_breed_ids(self):
        bad = {
            "breeds": [
                {"id": "x", "name": "X", "body_type": "round"},
                {"id": "x", "name": "X2", "body_type": "slim"},
            ],
            "personalities": [{"id": "p", "decay": {"hunger": 1, "thirst": 1, "bladder": 1, "energy": 1}}],
            "accessories": {"collars": [], "clothes": [], "tricks": []},
            "colors": {"coat_colors": [], "markings": [], "eye_colors": []},
        }
        errors = build_data.validate(bad)
        assert any("duplicate" in e for e in errors)

    def test_personality_missing_decay_stat(self):
        bad = {
            "breeds": [{"id": "x", "name": "X", "body_type": "round"}],
            "personalities": [{"id": "p", "decay": {"hunger": 1, "thirst": 1}}],
            "accessories": {"collars": [], "clothes": [], "tricks": []},
            "colors": {"coat_colors": [], "markings": [], "eye_colors": []},
        }
        errors = build_data.validate(bad)
        assert any("decay.bladder" in e for e in errors)
        assert any("decay.energy" in e for e in errors)

    def test_accessories_missing_slot(self):
        bad = {
            "breeds": [{"id": "x", "name": "X", "body_type": "round"}],
            "personalities": [{"id": "p", "decay": {"hunger": 1, "thirst": 1, "bladder": 1, "energy": 1}}],
            "accessories": {"collars": []},
            "colors": {"coat_colors": [], "markings": [], "eye_colors": []},
        }
        errors = build_data.validate(bad)
        assert any("clothes" in e for e in errors)
        assert any("tricks" in e for e in errors)


# -- render_js / build ---------------------------------------------------------


class TestRender:
    def test_render_js_is_valid_es_module_shape(self, good_data_dir):
        data = build_data.load_all(good_data_dir)
        js = build_data.render_js(data)
        assert "export const DOGGO_DATA" in js
        assert "export default DOGGO_DATA" in js
        assert "Object.freeze" in js

    def test_render_js_round_trip_via_json(self, good_data_dir):
        data = build_data.load_all(good_data_dir)
        js = build_data.render_js(data)
        # Extract the JSON payload between Object.freeze( and );
        m = re.search(r"Object\.freeze\((.*)\);\nexport default", js, re.DOTALL)
        assert m, "could not locate JSON payload"
        parsed = json.loads(m.group(1))
        assert parsed["breeds"][0]["id"] == "foo"

    def test_build_writes_file(self, good_data_dir, tmp_path):
        out_path = tmp_path / "out" / "data.js"
        result = build_data.build(good_data_dir, out_path)
        assert result == out_path
        assert out_path.exists()
        assert "DOGGO_DATA" in out_path.read_text()

    def test_build_fails_on_invalid_data(self, tmp_path):
        # Only write breeds.yml so the others are missing -> FileNotFoundError
        _write(tmp_path / "breeds.yml", "[]")
        with pytest.raises(FileNotFoundError):
            build_data.build(tmp_path, tmp_path / "data.js")

    def test_build_fails_on_validation_errors(self, good_data_dir, tmp_path):
        _write(good_data_dir / "breeds.yml", "[]")  # empty breeds
        with pytest.raises(ValueError, match="validation failed"):
            build_data.build(good_data_dir, tmp_path / "data.js")
