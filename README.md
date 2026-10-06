# toolkit-verify-template

Static verification app for a worker toolkit. Clone this folder, rename it to `${toolkit-slug}-verify`, and fill it as you onboard the toolkit.

This is a cleaned fork of `swingbell-polyglot-verify`. That app stays the golden reference. Do not fork swingbell history into a new verify app.

## Serve locally

From this folder (or a clone):

```bash
npx serve
```

Open the printed URL. You should see Toolkit and Repos tabs, unstarted leaves, and no walk iframes until a walk is attached.

## Instantiate a toolkit

1. Clone this template to `toolkits/<slug>/<slug>-verify/` (beside the toolkit, not inside `worker-toolkit-*`).
2. Set `window.TOOLKIT` in `data/checklist.js` from that toolkit's `toolkit.json`:
   - `name` / `slug`: toolkit folder or `repo`
   - `subtitle`: worker-toolkit directory name
   - `version`: `version` or `buildSha` if present
3. Add Repos leaves from `toolkit.json.repos` (polyglot) or the single `toolkit.json.repo` (monolith). Titles only — no `walk`, no `status: "done"`.
4. Film / assemble walks in `instruments/walkthrough/runs/…` using the walkthrough kit (`TERMINAL.md`, `BROWSER.md`). This template does not assemble films.
5. Only when a walk is finalized, run the `populate-verify-walk` skill.

Changing `window.TOOLKIT.slug` (and `name`) updates the masthead subtitle and the document title.

## When to run populate-verify-walk

Use the skill when you have a finalized kit run folder (`walk.mp4`, `timeline.jsonl` / cues, `index.html`) and a named checklist leaf. The skill copies a slim report into `walks/<dir>/` and sets `walk: { dir, kind }` on that leaf. It does not mark `status: "done"` unless you ask.

The skill ships with this template:

- `.cursor/skills/populate-verify-walk/`
- `.claude/skills/populate-verify-walk/`

Open the cloned verify app as the Cursor / Claude project so those skills load.

### Harness Claude (DataAnnotation)

Teammates without Cursor can copy the same skill into the worker toolkit:

```
toolkits/<slug>/worker-toolkit-*/.claude/skills/populate-verify-walk/
```

Keep `SKILL.md` and `reference.md` identical to the copies in this template.

## Hosting

Any static host works (`npx serve`, GitHub Pages, Cloudflare Pages). After copying a walk report, keep `<base href="/walks/<dir>/">` so `walk.mp4` still resolves if the server drops a trailing slash.

Do not commit `*.mov`, local creds, or `.env` files. Do not commit large source recordings. Populated `walk.mp4` files belong in the instantiated `${slug}-verify` app, not in this template.

## GitHub

Clone this template as a clean tree. Do not fork-and-keep swingbell-verify history. Prefer a clean initial commit of the stripped app (no walks, no secrets).

## Next toolkit example (breezy-complete)

Document only — instantiate when you start that toolkit:

1. Clone this template → `toolkits/breezy-complete/breezy-complete-verify/`
2. Set `TOOLKIT` from `worker-toolkit-breezy-complete-09_30_2026/toolkit.json` (slug `breezy-complete`, subtitle `worker-toolkit-breezy-complete-09_30_2026`, version `1.0.0`)
3. Repos: one leaf titled `breezy-complete` (monolith `repo`, not a `repos` array)
4. Film Toolkit leaves against that worker-toolkit path
5. Invoke `populate-verify-walk` one finalized leaf at a time
6. Copy the skill into the worker toolkit `.claude/skills/` if harness Claude needs it
