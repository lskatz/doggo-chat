# Custom Sounds

Drop your own audio files into the directories below, then re-run
`python scripts/build_sounds.py` (or push — the GitHub Action does it for you).

Supported formats: `.mp3`, `.ogg`, `.wav`, `.m4a`, `.webm`.

## Sound effect categories

These play once when something happens. The runtime picks one at random from
whatever's in the folder.

| Folder                | Plays when…                              |
| --------------------- | ---------------------------------------- |
| `bark/`               | Fetch, tricks                            |
| `whine/`              | Scolded, accident, lonely                |
| `happy/`              | Pet, water, outside, brush, treat        |
| `eating/`             | Fed                                      |

## Background music categories

These loop while a state is active. Music is muted by default until the
player makes a gesture (browser autoplay policy).

| Folder                | Loops during…           |
| --------------------- | ----------------------- |
| `music/idle/`         | Normal play             |
| `music/play/`         | After playing fetch     |
| `music/sleep/`        | While the dog is asleep |

## Tips

- Keep SFX short (< 2 seconds).
- Keep music loops seamless — most players use 30 second to 2 minute loops.
- File names don't matter; the runtime picks randomly.
- Empty folders are fine — nothing plays for that category.

## Licensing

Make sure you have rights to any audio you ship. If you publish this game
publicly, the sounds become part of your distribution.
