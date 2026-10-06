---
name: populate-verify-walk
description: >-
  Populate a toolkit-verify static app with a finalized walkthrough
  (walk.mp4, timeline.jsonl, walk index.html) and wire data/checklist.js.
  Use when the user says populate, add walk, install walkthrough, or
  attach a kit run to a verify leaf.
---

# Populate verify walk

Copy a finalized kit run into a cloned `${slug}-verify` app and wire one checklist leaf. Do not film, assemble, or restyle.

For chrome fingerprints, EVENTS porting, checklist shape, and run layouts, see [reference.md](reference.md).

## Hard rules

- Only populate when the user names the leaf and says the walk is finalized.
- Never mark `status: "done"` unless the user asks.
- Never delete source `.mov` files.
- Never rewrite kit run source except to copy a slim report into `walks/`.
- Never invent events, timestamps, or videos.
- Do not change pages-poc or walkthrough kit source unless asked.
- After copy, set `<base href="/walks/<dir>/">` on the verify copy.
- Leaf with `walk` and no status override → in-progress (app derives this).
- Repos titles are repo folder names; Toolkit leaf titles stay as in the template unless the user relabels (e.g. "run explore container").

## Inputs

Collect all of these before writing files. Refuse if any required input is missing.

- Path to the verify app (cloned template, e.g. `toolkits/<slug>/<slug>-verify/`).
- Checklist leaf id or title (e.g. `tests/setup/explore-container-runs` or Repos `ABDM-FE`).
- Path to the finalized run folder. Typical kit layout:
  `instruments/walkthrough/runs/terminal/<repo-or-op>/<timestamp>/`
  containing `walk.mp4`, `timeline.jsonl` / cues, `index.html`.
- Walk dir name under `walks/` (default: slug of the leaf).
- `kind`: `terminal` | `session`.

Refuse if `walk.mp4` or the walk report (`index.html`) is missing from the run folder.

## Procedure

1. Confirm the three inputs (verify app, leaf, finalized run). Refuse if mp4 or report is missing.
2. Create `walks/<dir>/`.
3. Copy `walk.mp4` and `timeline.jsonl` if present (slim copy — no `.mov`).
4. Copy walk `index.html` from the run *or* stamp the template `_walk-shell` with that run's `EVENTS` / title / duration / date. Prefer the run's index.html if it already has the current chrome (queued seek, gutter, #171717 panes). If the run report is stale chrome, port EVENTS into the template shell rather than shipping old rounded green UI.
5. Ensure `<base href="/walks/<dir>/">` and `?wide=1` still works.
6. In `data/checklist.js`, set on that leaf:
   `walk: { dir: "walks/<dir>", kind: "…" }`
   Do not add `status: "done"` unless asked.
7. For a new Repos repo, append a `check` leaf if it does not exist.
8. Do not populate other leaves in the same turn unless the user listed them.
9. Serve or tell the user to refresh `npx serve`. Spot-check the leaf: iframe loads, step 1 highlights, Open report works.

## What this skill is not

- Not filming, ffmpeg concat, or identity `filmMs` assembly. Point at `instruments/walkthrough/TERMINAL.md` and `BROWSER.md` if asked.
- Not deploying to GitHub / Cloudflare / workers.dev.
- Not restyling the app chrome.

## Harness copy

Optional copy for Claude in the DataAnnotation harness:

`toolkits/<slug>/worker-toolkit-*/.claude/skills/populate-verify-walk/`

Keep `SKILL.md` and `reference.md` identical to the copies in this template.
