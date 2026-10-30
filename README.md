# ascii-scenes

A Claude Code mod that draws a small animated ASCII scene in a band above the prompt, so the chat is a little less dull. It has 12 scenes: cat, mouse, chicken, cow, a helper bot (it shows a progress bar while Claude is working), sea, mountain, forest, traffic, koi pond, night sky and snow.

## Install

At the prompt of a terminal session:

```
/plugin install ascii-scenes --marketplace NguyenT01/claude-ascii-scenes
```

From a shell:

```
claude plugin install ascii-scenes --marketplace NguyenT01/claude-ascii-scenes
```

Answer `y` to add the marketplace, then pick a scope.

## Use

- Buttons under the scene: `< prev`, `next >`, `size` (6, 8 or 10 rows), `auto` (rotate every ~2 minutes), `hide`.
- Slash command: `/scene <name>` (`cat`, `mouse`, `chicken`, `cow`, `bot`, `sea`, `mountain`, `forest`, `road`, `koi`, `night`, `snow`), `/scene next`, `/scene prev`, `/scene auto`, `/scene size`, `/scene off`, `/scene on`.

## Add a scene

Scenes live in `hooks/scenes.ts`. Each one is a function `(canvas, frame, ctx) => void` that draws characters with `put`, `txt` and `spr`, then gets listed in `SCENES`. The band redraws about five times a second.
