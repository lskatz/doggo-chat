"""Tests for validate_save: schema checks and semver migration."""

from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import validate_save as vs  # noqa: E402


# -- SemVer --------------------------------------------------------------------


class TestSemVer:
    def test_parses_valid_versions(self):
        assert vs.SemVer.parse("1.0.0") == vs.SemVer(1, 0, 0)
        assert vs.SemVer.parse("0.1.2") == vs.SemVer(0, 1, 2)
        assert vs.SemVer.parse("12.345.6789") == vs.SemVer(12, 345, 6789)

    @pytest.mark.parametrize("bad", ["1.0", "1.0.0.0", "v1.0.0", "abc", "1.0.0-alpha", ""])
    def test_rejects_invalid(self, bad):
        with pytest.raises(ValueError):
            vs.SemVer.parse(bad)

    def test_str_roundtrip(self):
        assert str(vs.SemVer.parse("3.4.5")) == "3.4.5"

    def test_compatibility_same_major(self):
        a = vs.SemVer.parse("1.0.0")
        b = vs.SemVer.parse("1.99.99")
        assert a.is_compatible_with(b)
        assert b.is_compatible_with(a)

    def test_incompatibility_different_major(self):
        a = vs.SemVer.parse("1.5.0")
        b = vs.SemVer.parse("2.0.0")
        assert not a.is_compatible_with(b)


# -- Helpers -------------------------------------------------------------------


def _good_save() -> dict:
    return {
        "version": vs.CURRENT_VERSION,
        "saved_at": int(time.time()),
        "dog": {
            "name": "Biscuit",
            "breed": "golden_retriever",
            "gender": "female",
            "size": "large",
            "fur": "long",
            "coat_color": "golden",
            "markings": "solid",
            "eye_color": "brown",
            "ears": "floppy",
            "tail": "straight",
            "collar": "classic_red",
            "clothes": "none",
            "age_stage": "adult",
        },
        "stats": {"hunger": 80.0, "thirst": 70.0, "bladder": 30.0, "energy": 90.0},
        "personality": "friendly",
        "tricks": ["sit", "shake"],
        "history": [],
    }


# -- validate ------------------------------------------------------------------


class TestValidate:
    def test_good_save_passes(self):
        result = vs.validate(_good_save())
        assert result.ok, result.errors
        assert result.errors == []

    def test_non_dict_input(self):
        result = vs.validate("not a save")  # type: ignore[arg-type]
        assert not result.ok

    def test_missing_top_level_field(self):
        s = _good_save()
        del s["personality"]
        result = vs.validate(s)
        assert not result.ok
        assert any("personality" in e for e in result.errors)

    def test_wrong_type_top_level(self):
        s = _good_save()
        s["tricks"] = "not a list"
        result = vs.validate(s)
        assert not result.ok

    def test_invalid_version_string(self):
        s = _good_save()
        s["version"] = "v1"
        result = vs.validate(s)
        assert not result.ok

    def test_missing_dog_field(self):
        s = _good_save()
        del s["dog"]["breed"]
        result = vs.validate(s)
        assert not result.ok
        assert any("dog.breed" in e for e in result.errors)

    def test_missing_stat(self):
        s = _good_save()
        del s["stats"]["hunger"]
        result = vs.validate(s)
        assert not result.ok
        assert any("hunger" in e for e in result.errors)

    def test_stat_out_of_range_is_warning_not_error(self):
        s = _good_save()
        s["stats"]["hunger"] = 150.0
        result = vs.validate(s)
        assert result.ok
        assert any("hunger" in w for w in result.warnings)

    def test_negative_stat_is_warning_not_error(self):
        s = _good_save()
        s["stats"]["thirst"] = -5
        result = vs.validate(s)
        assert result.ok
        assert any("thirst" in w for w in result.warnings)

    def test_stat_wrong_type_is_error(self):
        s = _good_save()
        s["stats"]["energy"] = "full"
        result = vs.validate(s)
        assert not result.ok


# -- migrate -------------------------------------------------------------------


class TestMigrate:
    def test_current_version_passes_through(self):
        s = _good_save()
        out = vs.migrate(s)
        assert out["version"] == vs.CURRENT_VERSION

    def test_no_version_raises(self):
        s = _good_save()
        del s["version"]
        with pytest.raises(ValueError):
            vs.migrate(s)

    def test_incompatible_major_raises(self):
        s = _good_save()
        # Construct a version with a different major from CURRENT_VERSION
        cur = vs.SemVer.parse(vs.CURRENT_VERSION)
        s["version"] = f"{cur.major + 5}.0.0"
        with pytest.raises(ValueError, match="incompatible"):
            vs.migrate(s)

    def test_compatible_older_version_bumps_to_current(self):
        s = _good_save()
        cur = vs.SemVer.parse(vs.CURRENT_VERSION)
        # Same major, older minor — should bump forward (no registered migration => no-op bump)
        s["version"] = f"{cur.major}.0.0" if cur.minor > 0 else f"{cur.major}.0.0"
        out = vs.migrate(s)
        assert out["version"] == vs.CURRENT_VERSION

    def test_does_not_mutate_input(self):
        s = _good_save()
        cur = vs.SemVer.parse(vs.CURRENT_VERSION)
        s["version"] = f"{cur.major}.0.0"
        snapshot = dict(s)
        vs.migrate(s)
        assert s == snapshot

    def test_migration_chain_runs(self):
        """A registered migration runs and is applied."""
        # Use a sentinel field added by the migration
        @vs.register_migration("0.0.99")
        def _bump(d):
            new = dict(d)
            new["version"] = vs.CURRENT_VERSION
            new["__migrated__"] = True
            return new

        try:
            s = _good_save()
            cur = vs.SemVer.parse(vs.CURRENT_VERSION)
            # Skip if current major is 0 — migration is registered for 0.0.99
            # which is only same-major-compatible when CURRENT_VERSION major is 0.
            if cur.major != 0:
                pytest.skip("registered migration not in same major as CURRENT_VERSION")
            s["version"] = "0.0.99"
            out = vs.migrate(s)
            assert out["version"] == vs.CURRENT_VERSION
            assert out.get("__migrated__") is True
        finally:
            vs.MIGRATIONS.pop("0.0.99", None)
