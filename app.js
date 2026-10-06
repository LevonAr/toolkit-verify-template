(function () {
  const checklist = window.CHECKLIST || [];
  const toolkit = window.TOOLKIT || {};
  const outlineEl = document.getElementById("outline");
  const outlineScroll = document.getElementById("outline-scroll");
  const detailEl = document.getElementById("detail");
  const stageEl = document.getElementById("stage");
  const closeBtn = document.getElementById("pane-close");
  const detailBarTitle = document.getElementById("detail-bar-title");
  const leafCountEl = document.getElementById("leaf-count");
  const tabBar = document.querySelector(".tab-bar");
  const sidebarBtn = document.getElementById("sidebar-toggle");
  const SHOW_PART_TABS = true;
  const HIDDEN_PARTS = new Set(["structure"]);
  if (stageEl) stageEl.classList.toggle("hide-part-tabs", !SHOW_PART_TABS);

  const byId = new Map();
  const parentOf = new Map();

  function walk(nodes, parent) {
    for (const node of nodes) {
      byId.set(node.id, node);
      if (parent) parentOf.set(node.id, parent.id);
      if (node.children) walk(node.children, node);
    }
  }
  walk(checklist, null);

  function ancestors(id) {
    const chain = [];
    let cur = parentOf.get(id);
    while (cur) {
      chain.unshift(cur);
      cur = parentOf.get(cur);
    }
    return chain;
  }

  function pathIds(id) {
    return ancestors(id).concat(id);
  }

  function flatten(nodes, out) {
    for (const node of nodes) {
      out.push(node);
      if (node.children) flatten(node.children, out);
    }
    return out;
  }

  const all = flatten(checklist, []);
  const parts = checklist.filter((n) => n.kind === "part");
  const walks = all.filter((n) => n.walk);
  const checks = all.filter((n) => n.kind === "check" || n.kind === "blind-spot");

  function visibleTab(tab) {
    if (tab && !HIDDEN_PARTS.has(tab) && parts.some((p) => p.slug === tab || p.id === tab)) return tab;
    return "tests";
  }

  function partByTab(tab) {
    const slug = visibleTab(tab);
    return parts.find((p) => p.slug === slug || p.id === slug)
      || parts.find((p) => !HIDDEN_PARTS.has(p.id))
      || parts[0];
  }

  function activeRoots() {
    const part = partByTab(state.tab);
    return part && part.children ? part.children : [];
  }

  function tabForId(id) {
    const chain = pathIds(id);
    const part = parts.find((p) => chain.includes(p.id));
    return part ? part.id : "tests";
  }

  const state = {
    tab: "tests",
    expanded: new Set(),
    activeId: null,
    layout: "full",
    sidebar: "expanded"
  };
  const startPart = partByTab(state.tab);
  if (startPart) state.expanded.add(startPart.id);

  const STORE_KEY = "verify-landing-status:" + (toolkit.slug || "toolkit");
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
  catch (e) { overrides = {}; }

  function hasWalk(node) {
    return !!(node && node.walk && node.walk.dir);
  }

  function leafOverride(node) {
    const raw = node.status;
    if (raw === "done" || raw === "completed") return "done";
    if (raw === "review" || raw === "in-review") return "review";
    if (raw === "progress" || raw === "in-progress") return "progress";
    if (raw === "todo") return "todo";
    return null;
  }

  function nodeStatus(node) {
    if (!node) return "todo";
    if (isLeaf(node)) {
      return leafOverride(node) || (hasWalk(node) ? "progress" : "todo");
    }
    const kids = (node.children || []).map(nodeStatus);
    if (!kids.length) return "todo";
    if (kids.every((s) => s === "done")) return "done";
    if (kids.some((s) => s === "review")) return "review";
    if (kids.some((s) => s === "progress" || s === "done")) return "progress";
    return "todo";
  }

  function setOverride(id, value) {
    if (!value) delete overrides[id];
    else overrides[id] = value;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(overrides)); } catch (e) {}
  }

  function statusLabel(s) {
    if (s === "done") return "Completed";
    if (s === "review") return "In Review";
    if (s === "progress") return "In Progress";
    return "Todo";
  }

  function renderLeafCount() {
    if (!leafCountEl) return;
    const leaves = flatten(activeRoots(), []).filter(isLeaf);
    leafCountEl.textContent = String(leaves.length);
  }

  function paintTabs() {
    if (!tabBar) return;
    tabBar.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.setAttribute("aria-selected", btn.getAttribute("data-tab") === state.tab ? "true" : "false");
    });
  }

  function setTab(tab) {
    const next = visibleTab(tab);
    if (state.tab === next) return;
    state.tab = next;
    const part = partByTab(next);
    if (part) state.expanded.add(part.id);
    paintTabs();
    renderOutline();
    renderLeafCount();
  }

  document.title = (toolkit.name || "Toolkit") + " — Verification";
  const subtitleEl = document.querySelector(".app-subtitle-name");
  if (subtitleEl) subtitleEl.textContent = toolkit.slug || toolkit.name || "YOUR-TOOLKIT-SLUG";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hashFor(id) {
    return "#" + encodeURIComponent(id);
  }

  function idFromHash() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch (e) {
      return raw;
    }
  }

  function expandPath(id) {
    for (const step of pathIds(id)) state.expanded.add(step);
  }

  function expandAncestors(id) {
    for (const step of ancestors(id)) state.expanded.add(step);
  }

  function isLeaf(node) {
    return !(node && node.children && node.children.length);
  }

  function isOutlineBranch(node) {
    return !!(node && (node.kind === "group" || node.kind === "part" || !isLeaf(node)));
  }

  function firstLeaf(node) {
    if (!node) return null;
    if (isLeaf(node)) return node;
    for (const child of node.children || []) {
      const found = firstLeaf(child);
      if (found) return found;
    }
    return null;
  }

  function visibleOutlineIds() {
    const ids = [];
    function visit(nodes) {
      for (const node of nodes) {
        ids.push(node.id);
        if (!isLeaf(node) && state.expanded.has(node.id)) visit(node.children);
      }
    }
    visit(activeRoots());
    return ids;
  }

  function chevronSvg(open) {
    return open
      ? `<svg class="pgv-chevron-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9l5.5 6 5.5-6" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg class="pgv-chevron-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5l6 5.5-6 5.5" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  /* GitLab Pajamas pipeline icons (status_created / running / pending / success). */
  function statusSvg(s) {
    const paths = {
      todo: `<path d="M7 0a7 7 0 1 1 0 14A7 7 0 0 1 7 0zm0 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1z"/><circle cx="7" cy="7" r="3.25"/>`,
      progress: `<path d="M7 0a7 7 0 1 1 0 14A7 7 0 0 1 7 0zm0 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1z"/><path d="M7 3c2.2 0 4 1.8 4 4s-1.8 4-4 4c-1.3 0-2.5-.7-3.3-1.7L7 7V3"/>`,
      review: `<path d="M7 0a7 7 0 1 1 0 14A7 7 0 0 1 7 0zm0 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1z"/><path d="M4.7 5.3c0-.2.1-.3.3-.3h.9c.2 0 .3.1.3.3v3.4c0 .2-.1.3-.3.3H5c-.2 0-.3-.1-.3-.3V5.3m3 0c0-.2.1-.3.3-.3h.9c.2 0 .3.1.3.3v3.4c0 .2-.1.3-.3.3H8c-.2 0-.3-.1-.3-.3V5.3"/>`,
      done: `<path d="M7 0a7 7 0 1 1 0 14A7 7 0 0 1 7 0zm0 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1z"/><path d="M6.278 7.697L5.045 6.464a.296.296 0 0 0-.42-.002l-.613.614a.298.298 0 0 0 .002.42l1.91 1.909a.5.5 0 0 0 .703.005l.265-.265L9.997 6.04a.291.291 0 0 0-.009-.408l-.614-.614a.29.29 0 0 0-.408-.009L6.278 7.697z"/>`
    };
    return `<svg class="pgv-status-svg" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">${paths[s] || paths.todo}</svg>`;
  }

  function renderOutline() {
    outlineEl.innerHTML = `<ul class="pgv-tree">${renderOutlineNodes(activeRoots())}</ul>`;
  }

  function renderOutlineNodes(nodes) {
    return nodes.map((node) => {
      const isBranch = isOutlineBranch(node);
      const open = state.expanded.has(node.id);
      const isActive = node.id === state.activeId;
      const st = nodeStatus(node);
      const rowCls = [
        "pgv-row",
        isBranch ? "branch" : "leaf",
        isActive ? "active" : "",
        hasWalk(node) ? "has-walk" : "",
        "is-" + st
      ].filter(Boolean).join(" ");
      const action = isBranch
        ? `data-toggle="${escapeHtml(node.id)}" aria-expanded="${String(open)}"`
        : `data-goto="${escapeHtml(node.id)}"${isActive ? ` aria-current="location"` : ""}`;
      const label = isBranch
        ? `${open ? "Collapse" : "Expand"} ${escapeHtml(node.title)}`
        : escapeHtml(node.title);
      const chevron = isBranch
        ? `<span class="pgv-chevron">${chevronSvg(open)}</span>`
        : "";
      const kids = isBranch && open && node.children && node.children.length
        ? `<ul class="pgv-branch">${renderOutlineNodes(node.children)}</ul>`
        : "";
      return `<li class="pgv-node" data-tree-id="${escapeHtml(node.id)}">
        <button type="button" class="${rowCls}" ${action} aria-label="${label}" title="${escapeHtml(node.title)}">
          <span class="pgv-status status-${st}" data-node-status="${escapeHtml(node.id)}">${statusSvg(st)}</span>
          <span class="pgv-title">${escapeHtml(node.title)}</span>
          ${hasWalk(node) ? `<span class="film">walk</span>` : ""}
          ${chevron}
        </button>
        ${kids}
      </li>`;
    }).join("");
  }

  function briefFor(node) {
    if (!node) return null;
    for (const id of pathIds(node.id).reverse()) {
      const step = byId.get(id);
      if (step && step.brief && step.brief.url) return step.brief;
    }
    return null;
  }

  function warnTriangleSvg() {
    return `<svg class="brief-warn-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M8 1.6 15.4 14.5H.6L8 1.6z"/>
      <path fill="#3d2e00" d="M7.35 6.2h1.3v4.1h-1.3zm0 5h1.3v1.35h-1.3z"/>
    </svg>`;
  }

  const SHOW_BRIEF = false;

  function renderBriefToggle(brief) {
    if (!SHOW_BRIEF || !brief) return "";
    const warn = brief.todo ? warnTriangleSvg() : "";
    return `<button type="button" class="brief-toggle" aria-expanded="false" aria-controls="brief-panel">${warn}Brief</button>`;
  }

  function renderBriefPanel(brief) {
    if (!SHOW_BRIEF || !brief) return "";
    const url = escapeHtml(brief.url);
    const todo = brief.todo ? `<div class="brief-todo">
        <div class="brief-todo-head">${warnTriangleSvg()}<span>TODO</span></div>
        <ul class="brief-todo-list">
          <li>replace placeholder title with correct title</li>
          <li>replace placeholder excerpt with correct excerpt</li>
          <li>replace placeholder section link with correct section link</li>
          <li>polish Brief UI</li>
        </ul>
      </div>` : "";
    return `<div class="brief-panel" id="brief-panel" hidden>
      ${todo}
      <p class="brief-doc">${escapeHtml(brief.doc || "")}</p>
      <a class="brief-section" href="${url}" target="_blank" rel="noopener">${escapeHtml(brief.section || "Brief")}</a>
      ${brief.excerpt ? `<p class="brief-excerpt">${escapeHtml(brief.excerpt)}</p>` : ""}
      <a class="brief-open" href="${url}" target="_blank" rel="noopener">Open in brief</a>
    </div>`;
  }

  function renderWalkMeta(node) {
    if (hasWalk(node)) {
      const src = node.walk.dir.replace(/\/?$/, "/");
      return `<span class="node-sub-meta">Walkthrough<span data-walk-meta></span></span>
        <a class="node-sub-link" href="${escapeHtml(src)}" target="_blank" rel="noopener">Open report<svg class="node-sub-ext" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.2 3.5H4.6A1.6 1.6 0 0 0 3 5.1v6.3A1.6 1.6 0 0 0 4.6 13h6.3a1.6 1.6 0 0 0 1.6-1.6V9.8"/><path d="M8.8 3.5h3.7V7.2"/><path d="M8.2 7.8 12.5 3.5"/></svg></a>`;
    }
    if (!isLeaf(node) || node.kind === "note" || node.kind === "blind-spot") return "";
    return `<span class="node-sub-meta">Walkthrough · not captured</span>`;
  }

  function renderWalk(node) {
    if (hasWalk(node)) {
      const src = node.walk.dir.replace(/\/?$/, "/");
      const frameSrc = walkIsWide() ? src + "?wide=1" : src;
      return `<div class="evidence">
        <iframe src="${escapeHtml(frameSrc)}" title="Walkthrough for ${escapeHtml(node.title)}" allow="autoplay"></iframe>
      </div>`;
    }
    if (!isLeaf(node) || node.kind === "note" || node.kind === "blind-spot") return "";
    return `<div class="evidence evidence-empty">
      <div class="skeleton">
        <div class="skeleton-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2"/>
            <path d="M8 9h8M8 12h5"/>
            <circle cx="17" cy="16" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <b>No walkthrough yet</b>
        <p>A terminal or browser capture will fill this pane when this check is filmed.</p>
      </div>
    </div>`;
  }

  function statusOption(value, label, iconStatus, selected) {
    return `<button type="button" class="status-menu-item${selected ? " is-selected" : ""}" role="option" data-value="${escapeHtml(value)}" aria-selected="${selected ? "true" : "false"}">
      <span class="pgv-status status-${iconStatus}">${statusSvg(iconStatus)}</span>
      <span>${escapeHtml(label)}</span>
    </button>`;
  }

  function statusControl(node) {
    const st = nodeStatus(node);
    return `<span class="status-badge status-${st}">
      <span class="pgv-status status-${st}">${statusSvg(st)}</span>
      <span class="status-badge-label">${escapeHtml(statusLabel(st))}</span>
    </span>`;
  }

  function headingTag(kind, depth) {
    if (kind === "part") return "h2";
    if (kind === "group") return "h3";
    return depth > 3 ? "h5" : "h4";
  }

  function renderDetailItem(node) {
    if (!node) {
      detailEl.innerHTML = "";
      return;
    }
    const tag = headingTag(node.kind, 3);
    const brief = briefFor(node);
    detailEl.innerHTML = `<section class="node node-${escapeHtml(node.kind)} node-solo" data-node-id="${escapeHtml(node.id)}">
      <div class="node-head" data-head-id="${escapeHtml(node.id)}">
        <${tag}>${escapeHtml(node.title)}</${tag}>
        ${renderBriefToggle(brief)}
      </div>
      <div class="node-sub">
        ${statusControl(node)}
        ${renderWalkMeta(node)}
      </div>
      ${renderBriefPanel(brief)}
      ${renderWalk(node)}
    </section>`;
    bindWalkFrames();
  }

  function sidebarCollapseSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/><path d="M15.2 9.2 12.5 12l2.7 2.8"/></svg>`;
  }

  function sidebarExpandSvg() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/><path d="M12.5 9.2 15.2 12l-2.7 2.8"/></svg>`;
  }

  function walkIsWide() {
    return state.layout === "split";
  }

  function sizeWalkFrame(frame) {
    const doc = frame.contentDocument;
    if (!doc || !doc.documentElement || doc.location.href === "about:blank") return;
    const video = doc.querySelector("video");
    const main = doc.querySelector("main");
    let h = 0;
    if (video) {
      const box = video.getBoundingClientRect();
      if (box.height > 1) h = box.height;
      else if (video.videoWidth && video.videoHeight && box.width > 1) {
        h = box.width * (video.videoHeight / video.videoWidth);
      }
    }
    if (main) h = Math.max(h, main.getBoundingClientRect().height);
    if (h > 1) frame.style.height = Math.ceil(h) + "px";
  }

  function syncWalkChrome(frame) {
    const doc = frame.contentDocument;
    if (!doc || !doc.documentElement || doc.location.href === "about:blank") return;
    const header = doc.querySelector("header");
    const metaEl = frame.closest(".node-solo") && frame.closest(".node-solo").querySelector("[data-walk-meta]");
    if (header && metaEl) {
      const bits = [...header.querySelectorAll(".meta span")].map((el) => el.textContent.trim()).filter(Boolean);
      const video = doc.querySelector("video");
      if (video && (!Number.isFinite(video.duration) || video.duration <= 0)) {
        video.addEventListener("loadedmetadata", () => syncWalkChrome(frame), { once: true });
      }
      const isDur = (bit) => /^\d+(?:\.\d+)?s$/.test(bit);
      let duration = bits.find(isDur) || "";
      const rest = bits.filter((bit) => !isDur(bit));
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        duration = video.duration.toFixed(1) + "s";
      }
      const ordered = rest.concat(duration).filter(Boolean);
      metaEl.textContent = ordered.length ? " · " + ordered.join(" · ") : "";
    }
    doc.documentElement.classList.toggle("wide", walkIsWide());
    sizeWalkFrame(frame);
  }

  function playWalkFilm(frame) {
    const doc = frame.contentDocument;
    if (!doc || !doc.documentElement || doc.location.href === "about:blank") return;
    const video = doc.querySelector("video");
    if (!video) return;
    video.playsInline = true;
    const start = () => {
      syncWalkChrome(frame);
      try {
        if (doc.defaultView && typeof doc.defaultView.__flushWalkSeek === "function") {
          doc.defaultView.__flushWalkSeek();
        }
      } catch (e) {}
      video.play().catch(() => {});
    };
    if (video.readyState >= 2) start();
    else video.addEventListener("loadeddata", start, { once: true });
    video.addEventListener("loadedmetadata", () => syncWalkChrome(frame));
  }

  function bindWalkFrames() {
    detailEl.querySelectorAll("iframe").forEach((frame) => {
      const run = () => {
        syncWalkChrome(frame);
        playWalkFilm(frame);
        const doc = frame.contentDocument;
        const video = doc && doc.querySelector("video");
        if (video && !frame._walkResizeBound) {
          frame._walkResizeBound = true;
          video.addEventListener("loadedmetadata", () => sizeWalkFrame(frame));
          video.addEventListener("loadeddata", () => sizeWalkFrame(frame));
          if (window.ResizeObserver) new ResizeObserver(() => sizeWalkFrame(frame)).observe(video);
        }
      };
      frame.addEventListener("load", run);
      try { run(); } catch (e) {}
    });
  }

  function setSidebar(collapsed) {
    state.sidebar = collapsed ? "collapsed" : "expanded";
    stageEl.setAttribute("data-sidebar", state.sidebar);
    if (sidebarBtn) {
      sidebarBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      sidebarBtn.setAttribute("aria-label", collapsed ? "Expand checklist" : "Collapse checklist");
      sidebarBtn.innerHTML = collapsed ? sidebarExpandSvg() : sidebarCollapseSvg();
    }
    try { localStorage.setItem("verify-sidebar", state.sidebar); } catch (e) {}
    detailEl.querySelectorAll("iframe").forEach((frame) => {
      try { syncWalkChrome(frame); } catch (err) {}
    });
  }

  function setLayout(mode) {
    state.layout = mode === "split" ? "split" : "full";
    stageEl.setAttribute("data-layout", state.layout);
    if (state.layout === "split") setSidebar(state.sidebar === "collapsed");
  }

  function closeDetail() {
    setLayout("full");
    detailEl.innerHTML = "";
    if (detailBarTitle) detailBarTitle.textContent = "Evidence";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  function crumbSep() {
    return `<svg class="crumb-sep" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.2 3.2a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 1 1-1.06-1.06L9.69 8 6.2 4.26a.75.75 0 0 1 0-1.06z"/></svg>`;
  }

  function setCrumb(id) {
    if (!detailBarTitle) return;
    const node = byId.get(id);
    if (!node) {
      detailBarTitle.textContent = "Evidence";
      return;
    }
    const titles = pathIds(id).map((step) => byId.get(step).title);
    detailBarTitle.innerHTML = `<ol class="crumb-list">${titles.map((title, i) =>
      `<li>${i ? crumbSep() : ""}<span class="crumb-item">${escapeHtml(title)}</span></li>`
    ).join("")}</ol>`;
  }

  function markOutline() {
    outlineEl.querySelectorAll(".pgv-row").forEach((el) => {
      const id = el.closest("[data-tree-id]").getAttribute("data-tree-id");
      el.classList.toggle("active", id === state.activeId);
      if (el.hasAttribute("data-goto")) {
        el.setAttribute("aria-current", id === state.activeId ? "location" : "false");
      }
    });
  }

  function activate(id, opts) {
    const options = opts || {};
    const node = byId.get(id);
    if (!node) return;
    state.activeId = id;
    expandPath(id);
    if (!isLeaf(node)) {
      state.expanded.add(id);
      renderOutline();
      return;
    }
    setLayout("split");
    if (options.hash !== false) {
      const next = hashFor(id);
      if (location.hash !== next) history.replaceState(null, "", next);
    }
    renderOutline();
    setCrumb(id);
    renderDetailItem(node);
  }

  outlineEl.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-toggle]");
    if (toggle) {
      const id = toggle.getAttribute("data-toggle");
      if (state.expanded.has(id)) state.expanded.delete(id);
      else state.expanded.add(id);
      renderOutline();
      return;
    }
    const go = e.target.closest("[data-goto]");
    if (go) activate(go.getAttribute("data-goto"), { focus: true });
  });

  function setBriefOpen(open) {
    const toggle = detailEl.querySelector(".brief-toggle");
    const panel = detailEl.querySelector(".brief-panel");
    if (!toggle || !panel) return;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  detailEl.addEventListener("click", (e) => {
    const toggle = e.target.closest(".brief-toggle");
    if (toggle) {
      const panel = toggle.closest(".node-solo")?.querySelector(".brief-panel");
      if (!panel) return;
      setBriefOpen(panel.hidden);
      return;
    }
    const jump = e.target.closest("a.jump");
    if (!jump) return;
    e.preventDefault();
    const raw = jump.getAttribute("href").replace(/^#/, "");
    let id = raw;
    try { id = decodeURIComponent(raw); } catch (err) {}
    activate(id, { focus: true });
  });

  closeBtn.addEventListener("click", () => closeDetail());

  if (tabBar) {
    tabBar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab]");
      if (btn) setTab(btn.getAttribute("data-tab"));
    });
  }

  function paintStatuses() {
    document.querySelectorAll("[data-node-status]").forEach((el) => {
      const node = byId.get(el.getAttribute("data-node-status"));
      const st = nodeStatus(node);
      el.className = "pgv-status status-" + st;
      el.innerHTML = statusSvg(st);
    });
    document.querySelectorAll(".status-badge").forEach((el) => {
      const host = el.closest("[data-head-id]") || el.closest("[data-node-id]");
      if (!host) return;
      const st = nodeStatus(byId.get(host.getAttribute("data-head-id") || host.getAttribute("data-node-id")));
      el.className = "status-badge status-" + st;
      const icon = el.querySelector(".pgv-status");
      if (icon) {
        icon.className = "pgv-status status-" + st;
        icon.innerHTML = statusSvg(st);
      }
      const label = el.querySelector(".status-badge-label");
      if (label) label.textContent = statusLabel(st);
    });
  }

  function closeStatusMenus() {
    detailEl.querySelectorAll(".status-menu").forEach((menu) => {
      const list = menu.querySelector(".status-menu-list");
      const btn = menu.querySelector(".status-menu-btn");
      if (list) list.hidden = true;
      if (btn) btn.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
    });
  }

  detailEl.addEventListener("click", (e) => {
    const item = e.target.closest(".status-menu-item");
    if (item) {
      const menu = item.closest(".status-menu");
      setOverride(menu.getAttribute("data-status-id"), item.getAttribute("data-value") || null);
      const top = outlineScroll ? outlineScroll.scrollTop : 0;
      const node = byId.get(menu.getAttribute("data-status-id"));
      renderOutline();
      if (outlineScroll) outlineScroll.scrollTop = top;
      if (node) renderDetailItem(node);
      return;
    }
    const btn = e.target.closest(".status-menu-btn");
    if (btn) {
      const menu = btn.closest(".status-menu");
      const list = menu.querySelector(".status-menu-list");
      const open = list.hidden;
      closeStatusMenus();
      if (open) {
        list.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        menu.classList.add("is-open");
      }
      e.stopPropagation();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".status-menu")) closeStatusMenus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeStatusMenus();
    setBriefOpen(false);
  });

  function bindTreeKeys() {
    outlineEl.addEventListener("keydown", (e) => {
      const btn = e.target.closest("[data-goto], [data-toggle]");
      if (!btn) return;
      const row = btn.closest("[data-tree-id]");
      if (!row) return;
      const id = row.getAttribute("data-tree-id");
      const ids = visibleOutlineIds();
      const i = ids.indexOf(id);
      const node = byId.get(id);
      const hasKids = isOutlineBranch(node);

      if (e.key === "ArrowDown" && i < ids.length - 1) {
        e.preventDefault();
        focusTree(ids[i + 1]);
      } else if (e.key === "ArrowUp" && i > 0) {
        e.preventDefault();
        focusTree(ids[i - 1]);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusTree(ids[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        focusTree(ids[ids.length - 1]);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (hasKids && !state.expanded.has(id)) {
          state.expanded.add(id);
          renderOutline();
          focusTree(id);
        } else if (hasKids && node.children[0]) {
          focusTree(node.children[0].id);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (hasKids && state.expanded.has(id)) {
          state.expanded.delete(id);
          renderOutline();
          focusTree(id);
        } else if (parentOf.get(id)) {
          focusTree(parentOf.get(id));
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (hasKids) {
          if (state.expanded.has(id)) state.expanded.delete(id);
          else state.expanded.add(id);
          renderOutline();
          focusTree(id);
        } else {
          activate(id, { focus: true });
        }
      }
    });
  }

  function focusTree(id) {
    const el = outlineEl.querySelector(`[data-goto="${CSS.escape(id)}"], [data-toggle="${CSS.escape(id)}"]`);
    if (el) el.focus();
  }

  function applyHash(openSplit) {
    const id = idFromHash();
    if (id && byId.has(id) && SHOW_PART_TABS && !HIDDEN_PARTS.has(tabForId(id))) {
      const node = byId.get(id);
      state.tab = visibleTab(tabForId(id));
      paintTabs();
      expandPath(id);
      if (isLeaf(node)) {
        state.activeId = id;
        if (openSplit) activate(id, { hash: false });
        else renderOutline();
        renderLeafCount();
        return;
      }
      state.expanded.add(id);
      renderOutline();
      renderLeafCount();
      return;
    }
    renderOutline();
  }

  window.addEventListener("hashchange", () => {
    if (!idFromHash()) {
      closeDetail();
      return;
    }
    applyHash(true);
  });

  document.documentElement.setAttribute("data-theme", "light");
  let storedSidebar = null;
  try { storedSidebar = localStorage.getItem("verify-sidebar"); } catch (e) {}
  setSidebar(storedSidebar === "collapsed");
  if (sidebarBtn) {
    sidebarBtn.addEventListener("click", () => setSidebar(state.sidebar !== "collapsed"));
  }
  window.addEventListener("resize", () => {
    detailEl.querySelectorAll("iframe").forEach((frame) => {
      try { sizeWalkFrame(frame); } catch (e) {}
    });
  });

  paintTabs();
  renderLeafCount();
  bindTreeKeys();
  applyHash(false);
  renderOutline();
})();
