# Doggo Chat

A virtual-pet game for kids, served as a static site on GitHub Pages.
Adopt a dog, customize them, and care for them through button-driven
interactions. Save state ships as a downloadable JSON file with semver
versioning.

## How it's built

```
YAML data    →   Python build scripts   →   JS modules / SVG thumbnails
(/_data/)        (/scripts/)                 (/assets/js/, /assets/images/)
                       │
                       ▼
                 Jekyll wraps the static files into _site/
                       │
                       ▼
                 GitHub Actions deploys to GitHub Pages
```

- **Source of truth** is YAML in `_data/` (breeds, personalities, accessories, colors).
- **Python** (`scripts/`) compiles YAML into a single ES module, scans
  `assets/sounds/` to build a sound manifest, and emits SVG thumbnails for
  every breed × coat color combination.
- **Vanilla JS modules** (`assets/js/`) drive the runtime: dog rendering,
  needs simulation, action buttons, save/load, sound.
- **Jekyll** is just a thin wrapper that produces the deployable `_site/`.

No bundler, no framework, no `localStorage`. State lives in memory and
saves are downloaded JSON files.

## Quick start

### Run the build pipeline

```bash
pip install -e '.[dev]'
python scripts/build_data.py
python scripts/build_sounds.py
python scripts/generate_thumbnails.py
```

### Serve locally

```bash
bundle install
bundle exec jekyll serve
# → http://localhost:4000
```

### Run tests

```bash
pytest tests/
```

## Repo layout

```
doggo-chat/
├── _config.yml                    # Jekyll config
├── _data/                         # YAML source — edit these
│   ├── breeds.yml
│   ├── personalities.yml
│   ├── accessories.yml
│   └── colors.yml
├── _layouts/default.html          # HTML shell
├── index.html                     # Entry point (Jekyll page)
├── assets/
│   ├── css/main.css               # Paper-illustrated theme
│   ├── js/                        # Runtime modules
│   │   ├── main.js                # App controller
│   │   ├── dog.js                 # SVG dog renderer
│   │   ├── stats.js               # Needs simulation, mood
│   │   ├── actions.js             # Button definitions
│   │   ├── save.js                # JSON save/load + semver
│   │   ├── sound.js               # SFX & music with custom slots
│   │   ├── data.js                # GENERATED from _data/
│   │   └── sounds.js              # GENERATED from assets/sounds/
│   ├── sounds/                    # Drop your own audio here
│   │   └── README.md              # ← see this for the categories
│   └── images/thumbnails/         # GENERATED breed × color previews
├── scripts/                       # Python build scripts
│   ├── build_data.py              # YAML → assets/js/data.js
│   ├── build_sounds.py            # scan → assets/js/sounds.js
│   ├── generate_thumbnails.py     # SVG previews
│   └── validate_save.py           # Save schema + semver migration
├── tests/                         # pytest suite — all passing
├── .github/workflows/deploy.yml   # CI: test → build → deploy
├── pyproject.toml
├── Gemfile                        # Jekyll deps
└── LICENSE
```

## Save format

Saves are JSON files. Schema lives in `scripts/validate_save.py` (Python)
and `assets/js/save.js` (JS). Both share these rules:

- **Same MAJOR version** → migratable (or pass-through if no changes).
- **Different MAJOR version** → rejected with a clear user-facing message.

Current version: `1.0.0`. To bump the schema later, register a migration in
both `validate_save.py::MIGRATIONS` and `save.js`. Tests in
`tests/test_validate_save.py` cover the migration framework.

## Customizing for your kid

- **Dog options**: edit `_data/breeds.yml`, `_data/colors.yml`, `_data/accessories.yml`.
- **Personality flavor**: edit reaction phrases in `_data/personalities.yml`.
  Decay multipliers in the same file lightly affect how fast each stat drops
  — `1.0` is normal, `1.3` means 30% faster decay.
- **Sound effects and music**: drop audio files into the categorized folders
  under `assets/sounds/`. See `assets/sounds/README.md` for the categories.
- **Stat tuning**: the per-hour decay rates live in `assets/js/stats.js`
  under `BASE_RATES`. Change them and rebuild.

## Failure mode

The dog never dies, runs away, or gets permanently harmed. If neglected:

- Stats drop. The dog visibly looks sad in the SVG (different mouth, posture).
- Bladder fills → dog has an accident, which clears the bladder. Coming back
  later allows scolding (mild — just a sad face), but mostly the dog is just
  happy to see you.
- Coming back after a long absence → start with a "welcome back" mood.

## Deployment

Push to `main`. GitHub Actions runs:

1. `pytest tests/` — Python tests must pass.
2. The Python build pipeline.
3. Jekyll build.
4. Deploy to GitHub Pages.

Make sure GitHub Pages is set to "GitHub Actions" in repo settings.

## License

MIT — see `LICENSE`.
