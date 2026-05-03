"""Tests for generate_thumbnails: SVG rendering for breed × color combos."""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import generate_thumbnails as gt  # noqa: E402


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    (tmp_path / "breeds.yml").write_text(
        """
- id: foo
  name: Foo
  body_type: round
- id: bar
  name: Bar
  body_type: slim
""",
        encoding="utf-8",
    )
    (tmp_path / "colors.yml").write_text(
        """
coat_colors:
  - id: golden
    name: Golden
    hex: "#E0AE6F"
  - id: black
    name: Black
    hex: "#2B2B2B"
""",
        encoding="utf-8",
    )
    return tmp_path


# -- render_thumbnail ----------------------------------------------------------


class TestRenderThumbnail:
    def test_returns_well_formed_svg(self):
        svg = gt.render_thumbnail({"id": "x", "body_type": "round"}, "#000000")
        # Must parse as XML
        root = ET.fromstring(svg)
        assert root.tag == "{http://www.w3.org/2000/svg}svg"

    def test_color_appears_in_output(self):
        svg = gt.render_thumbnail({"id": "x", "body_type": "round"}, "#ABCDEF")
        assert "#ABCDEF" in svg

    def test_unknown_body_type_falls_back_to_round(self):
        # Should not raise
        svg_unknown = gt.render_thumbnail({"id": "x", "body_type": "alien"}, "#000")
        svg_round = gt.render_thumbnail({"id": "x", "body_type": "round"}, "#000")
        # Both should be the same shape
        assert svg_unknown == svg_round

    def test_different_body_types_produce_different_output(self):
        a = gt.render_thumbnail({"id": "x", "body_type": "stocky"}, "#000")
        b = gt.render_thumbnail({"id": "x", "body_type": "slim"}, "#000")
        assert a != b

    def test_svg_has_correct_viewbox(self):
        svg = gt.render_thumbnail({"id": "x", "body_type": "round"}, "#000")
        assert f"viewBox=\"0 0 {gt.THUMB_SIZE} {gt.THUMB_SIZE}\"" in svg


# -- build ---------------------------------------------------------------------


class TestBuild:
    def test_writes_one_file_per_combo(self, data_dir, tmp_path):
        out = tmp_path / "out"
        written = gt.build(data_dir, out)
        # 2 breeds × 2 colors = 4 files
        assert len(written) == 4
        for path in written:
            assert path.exists()
            assert path.suffix == ".svg"

    def test_filenames_follow_convention(self, data_dir, tmp_path):
        out = tmp_path / "out"
        written = gt.build(data_dir, out)
        names = sorted(p.name for p in written)
        assert names == sorted([
            "foo__golden.svg",
            "foo__black.svg",
            "bar__golden.svg",
            "bar__black.svg",
        ])

    def test_creates_output_dir(self, data_dir, tmp_path):
        out = tmp_path / "deeply" / "nested" / "out"
        gt.build(data_dir, out)
        assert out.is_dir()

    def test_files_are_valid_svg(self, data_dir, tmp_path):
        out = tmp_path / "out"
        written = gt.build(data_dir, out)
        for path in written:
            ET.fromstring(path.read_text())  # raises if malformed
