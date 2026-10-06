# populate-verify-walk reference

## Typical finalized run folders

Do not modify these folders. Copy a slim report out of them.

**Terminal / hand-filmed**

`instruments/walkthrough/runs/terminal/<op-or-repo>/<timestamp>/`

Expected: `walk.mp4`, `index.html`, often `timeline.jsonl`. Sibling `.mov` and `cues.txt` stay in the run tree.

**Browser**

`instruments/walkthrough/runs/<app>/<walk>/<timestamp>/`

Expected: `walk.mp4`, `index.html`, `timeline.jsonl`. Optional `steps/*.png`. Do not copy screenshots unless the user asks.

Refuse if `walk.mp4` or `index.html` is missing. Incomplete runs (report only, no mp4) are not finalized.

## Chrome freshness

Current walk chrome (from `_walk-shell/index.html`) must include all of:

- `pendingEventIndex`
- `flushPendingSeek`
- `window.__flushWalkSeek`
- `Loading film…` (`.film.waiting::after`)
- pane background `#171717`
- square panes (`border-radius:0`) and `2px` borders
- step gutter `.row { grid-template-columns:2ch max-content 1fr }`
- `.n { text-align:right; font-variant-numeric:tabular-nums }`
- `tick()` that returns early while `pendingEventIndex != null || v.seeking || !canSeek()`
- early `wide=1` script that adds `html.wide`

If the run report is missing any of those, do not copy it as-is. Stamp `_walk-shell` instead.

## Stamp `_walk-shell`

1. Copy `<verify>/_walk-shell/index.html` → `<verify>/walks/<dir>/index.html`.
2. Set `<base href="/walks/<dir>/">`.
3. Set `<title>` and `<header> .meta strong` to the leaf title (or run title).
4. Set duration and date from the run header, `timeline.jsonl` last event, or `walk.mp4` metadata. Do not invent a duration that is not in the source.
5. Replace `const EVENTS = [];` with the run's `EVENTS` array.

### Extract EVENTS from a stale report

Prefer the inline `const EVENTS = [...]` in the run `index.html`. If that is missing, build EVENTS from `timeline.jsonl` (one object per line, `t` in ms, keep `source`, `level`, `text`). Do not invent events.

Keep `function filmMs(t) { return t; }` unless the run already has a non-identity `filmMs` that the user asked to preserve. Do not invent a new mapping.

## Checklist leaf shape

`data/checklist.js` helpers: `check`, `group`, `withIds`. IDs are `${parent}/${slugify(title)}` unless a `slug` is set.

**Existing Toolkit leaf** — add only the walk field:

```js
{
  kind: "check",
  title: "explore container runs",
  walk: { dir: "walks/explore-first-boot", kind: "terminal" }
}
```

Do not add `status: "done"` unless the user asked.

**New Repos leaf** — title is the repo folder name:

```js
{
  kind: "check",
  title: "breezy-complete",
  walk: { dir: "walks/breezy-complete", kind: "terminal" }
}
```

Append under the `repos` part `children` array. If the leaf already exists, only set `walk`.

**`kind`**

- `terminal` — toolkit ops and hand-filmed repo boots
- `session` — browser kit walks (e.g. app live in-browser)

## Polyglot vs monolith Repos

- Polyglot: `toolkit.json.repos` is a list. One Repos leaf per repo folder name.
- Monolith: `toolkit.json.repo` is a string (e.g. `breezy-complete`). One Repos leaf with that title.

Do not invent extra repo leaves.

## After copy

- Verify `<base href="/walks/<dir>/">` on the verify copy only.
- Confirm `walks/<dir>/` has `index.html` + `walk.mp4` (and `timeline.jsonl` if the run had it).
- Confirm no `.mov` was copied.
- Confirm other leaves were not edited.
- Tell the user to refresh `npx serve` and open the leaf: iframe loads, step 1 highlights, Open report works.

## Harness copy

```
toolkits/<slug>/worker-toolkit-*/.claude/skills/populate-verify-walk/
```

Copy both `SKILL.md` and this `reference.md`. Do not rewrite them for the harness.
