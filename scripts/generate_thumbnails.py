"""Generate small SVG thumbnails for breed × coat color combinations.

The generated files are written to `assets/images/thumbnails/`.
Each file is named `{breed_id}__{color_id}.svg` and is 80x80.

This is intentionally simple — the runtime renders the fully detailed dog;
these are just preview chips for the customization UI.
"""

from __future__ import annotations

from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "_data"
OUTPUT_DIR = REPO_ROOT / "assets" / "images" / "thumbnails"

THUMB_SIZE = 80

BODY_SHAPES = {
    "stocky": dict(rx=26, ry=18),
    "slim": dict(rx=28, ry=14),
    "round": dict(rx=24, ry=22),
}


def render_thumbnail(breed: dict, color_hex: str) -> str:
    """Return a self-contained SVG string for one breed × color thumbnail."""
    shape = BODY_SHAPES.get(breed.get("body_type", "round"), BODY_SHAPES["round"])
    body_rx = shape["rx"]
    body_ry = shape["ry"]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {THUMB_SIZE} {THUMB_SIZE}" width="{THUMB_SIZE}" height="{THUMB_SIZE}">
  <rect width="{THUMB_SIZE}" height="{THUMB_SIZE}" fill="#FAF6EE" rx="8"/>
  <ellipse cx="40" cy="50" rx="{body_rx}" ry="{body_ry}" fill="{color_hex}"/>
  <circle cx="40" cy="32" r="14" fill="{color_hex}"/>
  <circle cx="36" cy="30" r="2" fill="#1a1a1a"/>
  <circle cx="44" cy="30" r="2" fill="#1a1a1a"/>
  <ellipse cx="40" cy="36" rx="2" ry="1.4" fill="#1a1a1a"/>
</svg>
"""


def load_breeds(data_dir: Path) -> list[dict]:
    with (data_dir / "breeds.yml").open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_colors(data_dir: Path) -> list[dict]:
    with (data_dir / "colors.yml").open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)["coat_colors"]


def build(
    data_dir: Path = DATA_DIR, output_dir: Path = OUTPUT_DIR
) -> list[Path]:
    """Generate all thumbnails. Returns the list of written paths."""
    output_dir.mkdir(parents=True, exist_ok=True)
    breeds = load_breeds(data_dir)
    colors = load_colors(data_dir)
    written: list[Path] = []
    for breed in breeds:
        for color in colors:
            path = output_dir / f"{breed['id']}__{color['id']}.svg"
            path.write_text(render_thumbnail(breed, color["hex"]), encoding="utf-8")
            written.append(path)
    return written


def main() -> int:
    paths = build()
    print(f"generate_thumbnails: wrote {len(paths)} thumbnails")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
