/* Next toolkit: copy this folder, replace CHECKLIST + walks/*, change TOOLKIT.
   After copying a walk report, keep <base href="/walks/<dir>/"> in that report's
   index.html so walk.mp4 still resolves if the static server drops a trailing slash.

   Leaf status is derived: no walk → todo, walk present → in-progress.
   Override a leaf with status: "review" | "done" here, then redeploy.
   The status dropdown is locked; localStorage is not the source of truth. */
window.TOOLKIT = {
  name: "YOUR-TOOLKIT-SLUG",
  slug: "YOUR-TOOLKIT-SLUG",
  version: "",
  subtitle: "worker-toolkit-YOUR-TOOLKIT-SLUG",
  kind: "Worker toolkit verification"
};

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function withIds(nodes, prefix) {
  return nodes.map((node) => {
    const slug = node.slug || slugify(node.title);
    const id = prefix ? prefix + "/" + slug : slug;
    const next = { ...node, id };
    delete next.slug;
    if (node.children) next.children = withIds(node.children, id);
    return next;
  });
}

const check = (title, body) => ({ kind: "check", title, body });
const note = (body, title) => ({ kind: "note", title: title || "Note", body });
const group = (title, children, extra) => ({ kind: "group", title, children, ...extra });

window.CHECKLIST = withIds([
  {
    kind: "part",
    title: "Structure",
    slug: "structure",
    children: [
      group("{toolkit-root}/", [
        check("README.md", "the end-to-end walkthrough"),
        check("CLAUDE.md / AGENTS.md", "instructions the authoring agent reads (AGENTS.md is the same content for non-Claude agents)"),
        check("toolkit.json", "which repo, which commit, toolkit version, default host ports"),
        check(".env.example", "the two values you supply (API key + base URL)"),
        { kind: "check", title: ".devcontainer/", slug: "devcontainer-authoring", body: "Authoring container: Dockerfile, devcontainer.json, post-create.sh" },
        check("explore/", "Explore container (its own dev container workspace)"),
        { kind: "check", title: ".devcontainer/", slug: "devcontainer-explore", body: "Dockerfile, devcontainer.json, initialize.js, post-create.sh, post-start.sh" },
        check("run-app.sh", "boots the real application (aliased run-app)"),
        check("instance.js", "runs additional Explore containers, each with its own working tree and port"),
        check("welcome.sh", "the banner: app URL, demo login, current commit, next steps"),
        check("plugins/create-snapshot/", "the snapshot command"),
        check("snapshots/", "snapshot output, shared with the Authoring container"),
        check("corpus-viewer/", "searchable reference-data UI (only toolkits that ship a data corpus)"),
        check("repo/", "the source codebase, full history, at the default commit"),
        check("data/", "reference-data corpus + its prebuilt index (corpus toolkits only)"),
        check("scripts/", "the command-line surface"),
        check("task-shared/", "the grading and environment assets every task copies"),
        check("harbor-tasks/", "where tasks live; _task-scaffold/ is the template"),
        check(".claude/skills/", "authoring skills (writing grader guidance, self-check detectors, re-grading)"),
        check("fixes/", "where your toolkit patch gets written")
      ]),
      group("explore/", [
        check("initialize.js", "runs on the host before the container starts"),
        check("post-create.sh", "runs once, when the container is first created"),
        check("post-start.sh", "runs on every start; brings the database back up"),
        check("run-app.sh", "boots the application"),
        check("instance.js", "runs additional Explore containers"),
        check("welcome.sh", "the banner you see on entry")
      ]),
      group("scripts/", [
        check("scripts/build-workspace.sh {slug}"),
        check("scripts/snapshot-to-task.ts"),
        check("scripts/harbor-run {task}"),
        check("scripts/harbor-regrade"),
        check("scripts/copy-reference-run.ts {trial}"),
        check("scripts/submit-task.ts {slug}"),
        check("scripts/check-workspace-sync.sh {task}"),
        check("scripts/check-task-infra.ts {slug}"),
        check("scripts/guidance-target.sh {slug}"),
        check("scripts/collect-fixes.sh")
      ]),
      group("task-shared/", []),
      group("harbor-tasks/_task-scaffold/", [])
    ]
  },
  {
    kind: "part",
    title: "Toolkit",
    slug: "tests",
    children: [
      group("Setup", [
        { kind: "check", title: "explore container runs" },
        { kind: "check", title: "authoring container runs" },
        { kind: "check", title: "app live in-browser" },
        { kind: "check", title: "test suite runs" },
        { kind: "check", title: "claude authenticates" }
      ], {
        brief: {
          todo: true,
          doc: "Testing a worker toolkit",
          section: "Look for blockers first",
          url: "https://docs.google.com/document/d/1vAYln2Onf2Ypj9_gqQWeRMPZ3DiONt4Bi4jj7mbFRU0/edit?pli=1&tab=t.0#heading=h.3oj53s6hxyy1",
          excerpt: "A blocker is anything that would stop a worker getting started at all: the container won't build, dependencies won't install, the app is dead in the browser, the test suite can't run, or the agent can't authenticate. A workaround still counts as a blocker."
        }
      }),
      group("Task Creation", [
        { kind: "check", title: "claude explores code" },
        { kind: "check", title: "create snapshot" },
        { kind: "check", title: "build task (snapshot)" },
        { kind: "check", title: "build task (manual)" },
        { kind: "check", title: "run trails" },
        { kind: "check", title: "run detectors" }
      ], {
        brief: {
          todo: true,
          doc: "Testing a worker toolkit",
          section: "Look for blockers first",
          url: "https://docs.google.com/document/d/1vAYln2Onf2Ypj9_gqQWeRMPZ3DiONt4Bi4jj7mbFRU0/edit?pli=1&tab=t.0#heading=h.3oj53s6hxyy1",
          excerpt: "A blocker is anything that would stop a worker getting started at all: the container won't build, dependencies won't install, the app is dead in the browser, the test suite can't run, or the agent can't authenticate. A workaround still counts as a blocker."
        }
      })
    ]
  },
  {
    kind: "part",
    title: "Repos",
    slug: "repos",
    // Add one check per repo from toolkit.json.repos (polyglot)
    // or toolkit.json.repo (monolith). title = repo folder name.
    children: []
  }
]);
