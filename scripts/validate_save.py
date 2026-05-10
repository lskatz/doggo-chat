"""Save-file schema validation and semver migration.

The save format is JSON with a top-level `version` field (semver). This module
validates a save dict against the current schema and applies migrations from
older compatible versions.

Compatibility rule: same MAJOR version is migratable; different MAJOR is rejected.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable

CURRENT_VERSION = "1.1.0"

_SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


@dataclass(frozen=True)
class SemVer:
    major: int
    minor: int
    patch: int

    @classmethod
    def parse(cls, s: str) -> "SemVer":
        m = _SEMVER_RE.match(s)
        if not m:
            raise ValueError(f"Invalid semver: {s!r}")
        return cls(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"

    def is_compatible_with(self, other: "SemVer") -> bool:
        """Same MAJOR version => migratable."""
        return self.major == other.major


@dataclass
class ValidationResult:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# -- Schema --------------------------------------------------------------------
# A simple, explicit schema. We avoid heavy schema libs to keep deps minimal.

REQUIRED_TOP_LEVEL = {
    "version": str,
    "saved_at": (int, float),  # unix timestamp
    "dog": dict,
    "stats": dict,
    "personality": str,
    "tricks": list,
    "history": list,
}

REQUIRED_DOG_FIELDS = {
    "name": str,
    "breed": str,
    "gender": str,
    "size": str,
    "fur": str,
    "coat_color": str,
    "markings": str,
    "eye_color": str,
    "ears": str,
    "tail": str,
    "collar": str,
    "clothes": str,
    "age_stage": str,
}

REQUIRED_STATS = {"hunger", "thirst", "bladder", "energy"}


def validate(save: dict[str, Any]) -> ValidationResult:
    """Validate a save dict structurally. Does not check against catalogs."""
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(save, dict):
        return ValidationResult(False, ["save must be an object"])

    for key, expected_type in REQUIRED_TOP_LEVEL.items():
        if key not in save:
            errors.append(f"missing required field: {key}")
            continue
        if not isinstance(save[key], expected_type):
            errors.append(
                f"field {key!r} must be {expected_type}, got {type(save[key]).__name__}"
            )

    if "version" in save and isinstance(save["version"], str):
        try:
            SemVer.parse(save["version"])
        except ValueError as e:
            errors.append(str(e))

    if "dog" in save and isinstance(save["dog"], dict):
        for field_name, ftype in REQUIRED_DOG_FIELDS.items():
            if field_name not in save["dog"]:
                errors.append(f"dog.{field_name} is required")
            elif not isinstance(save["dog"][field_name], ftype):
                errors.append(f"dog.{field_name} must be {ftype.__name__}")

    if "stats" in save and isinstance(save["stats"], dict):
        for stat in REQUIRED_STATS:
            if stat not in save["stats"]:
                errors.append(f"stats.{stat} is required")
                continue
            v = save["stats"][stat]
            if not isinstance(v, (int, float)):
                errors.append(f"stats.{stat} must be a number")
            elif not 0 <= v <= 100:
                warnings.append(f"stats.{stat}={v} outside expected 0..100 range")

    return ValidationResult(ok=not errors, errors=errors, warnings=warnings)


# -- Migrations ----------------------------------------------------------------

Migration = Callable[[dict[str, Any]], dict[str, Any]]
MIGRATIONS: dict[str, Migration] = {}


def register_migration(from_version: str) -> Callable[[Migration], Migration]:
    """Register a migration FROM `from_version` to the next known version.

    Migrations are chained in semver order until reaching CURRENT_VERSION.
    """

    def deco(fn: Migration) -> Migration:
        MIGRATIONS[from_version] = fn
        return fn

    return deco


def migrate(save: dict[str, Any]) -> dict[str, Any]:
    """Migrate a save dict toward CURRENT_VERSION. Idempotent. Returns a new dict."""
    if "version" not in save:
        raise ValueError("save has no version field; cannot migrate")
    save_v = SemVer.parse(save["version"])
    target_v = SemVer.parse(CURRENT_VERSION)
    if not save_v.is_compatible_with(target_v):
        raise ValueError(
            f"save version {save_v} is incompatible with current {target_v} "
            f"(major version mismatch)"
        )

    current = dict(save)
    seen: set[str] = set()
    while current["version"] != CURRENT_VERSION:
        v = current["version"]
        if v in seen:
            raise RuntimeError(f"migration cycle detected at {v}")
        seen.add(v)
        if v not in MIGRATIONS:
            # No migration registered: bump version forward as no-op.
            # This is safe because we're inside the same major.
            current["version"] = CURRENT_VERSION
            break
        current = MIGRATIONS[v](current)
    return current
