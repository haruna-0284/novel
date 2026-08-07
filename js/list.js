(function () {
  "use strict";

  const PAGE_SIZE = 20;
  const DATA_URL = "data/novels.json";

  let allNovels = [];
  let currentSort = "date-desc";
  let currentPage = 1;
  let activeFilters = new Set(); // "has-wandoro" / "wandoro-only"

  const gridEl = document.getElementById("novelGrid");
  const paginationEl = document.getElementById("pagination");
  const sortSelectEl = document.getElementById("sortSelect");
  const resultCountEl = document.getElementById("resultCount");
  const yearEl = document.getElementById("yearSpan");
  const filterHasBtn = document.getElementById("filterHasWandoro");
  const filterOnlyBtn = document.getElementById("filterWandoroOnly");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatDate(d) {
    return d ? d.replaceAll("-", ".") : "";
  }

  function extractIdNumber(id) {
    const match = /(\d+)/.exec(id || "");
    return match ? parseInt(match[1], 10) : 0;
  }

  function filterNovels(list) {
    if (activeFilters.size === 0) return list;
    return list.filter((n) => {
      if (activeFilters.has("has-wandoro") && n.wandoroId) return true;
      if (activeFilters.has("wandoro-only") && n.isWandoroOnly) return true;
      return false;
    });
  }

  function sortNovels(list, sort) {
    const arr = list.slice();
    switch (sort) {
      case "date-asc":
        arr.sort((a, b) => extractIdNumber(a.id) - extractIdNumber(b.id));
        break;
      case "date-desc":
        arr.sort((a, b) => extractIdNumber(b.id) - extractIdNumber(a.id));
        break;
      case "length-asc":
        arr.sort((a, b) => a.length - b.length);
        break;
      case "length-desc":
        arr.sort((a, b) => b.length - a.length);
        break;
    }
    return arr;
  }

  function render() {
    const filtered = filterNovels(allNovels);
    const sorted = sortNovels(filtered, currentSort);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);

    gridEl.innerHTML = "";

    if (pageItems.length === 0) {
      gridEl.innerHTML = '<p class="empty-msg">該当する小説がありません。</p>';
    } else {
      for (const n of pageItems) {
        const a = document.createElement("a");
        a.className = "novel-card";
        if (n.wandoroId) a.classList.add("has-wandoro");
        if (n.isWandoroOnly) a.classList.add("wandoro-only");
        a.href = `novel.html?id=${encodeURIComponent(n.id)}`;

        let badge = "";
        if (n.wandoroId) badge = '<span class="wandoro-badge wandoro-badge--has">ワンドロ版あり</span>';
        else if (n.isWandoroOnly) badge = '<span class="wandoro-badge wandoro-badge--only">ワンドロ版のみ</span>';

        a.innerHTML = `
          <h2>${escapeHtml(n.title)}</h2>
          <div class="card-meta">
            <span class="stamp-date">${formatDate(n.publishedDate)}</span>
            <span class="stamp-length">${n.length.toLocaleString()}字</span>
            ${badge}
          </div>`;
        gridEl.appendChild(a);
      }
    }

    resultCountEl.textContent = `該当${filtered.length}作 / ${currentPage} / ${totalPages}ページ`;

    renderPagination(totalPages);
    updateURL();
  }

  function renderPagination(totalPages) {
    paginationEl.innerHTML = "";
    if (totalPages <= 1) return;

    const mkBtn = (label, page, disabled, active) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "page-btn" + (active ? " active" : "");
      b.textContent = label;
      b.disabled = !!disabled;
      b.addEventListener("click", () => {
        currentPage = page;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      return b;
    };

    paginationEl.appendChild(mkBtn("« 前へ", currentPage - 1, currentPage <= 1, false));
    for (let p = 1; p <= totalPages; p++) {
      paginationEl.appendChild(mkBtn(String(p), p, false, p === currentPage));
    }
    paginationEl.appendChild(mkBtn("次へ »", currentPage + 1, currentPage >= totalPages, false));
  }

  function updateURL() {
    const params = new URLSearchParams();
    params.set("sort", currentSort);
    params.set("page", String(currentPage));
    if (activeFilters.size > 0) params.set("wandoro", Array.from(activeFilters).join(","));
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }

  function toggleFilter(key, btn) {
    if (activeFilters.has(key)) {
      activeFilters.delete(key);
      btn.setAttribute("aria-pressed", "false");
    } else {
      activeFilters.add(key);
      btn.setAttribute("aria-pressed", "true");
    }
    currentPage = 1;
    render();
  }

  sortSelectEl.addEventListener("change", (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    render();
  });

  filterHasBtn.addEventListener("click", () => toggleFilter("has-wandoro", filterHasBtn));
  filterOnlyBtn.addEventListener("click", () => toggleFilter("wandoro-only", filterOnlyBtn));

  async function init() {
    const params = new URLSearchParams(location.search);
    currentSort = params.get("sort") || "date-desc";
    currentPage = parseInt(params.get("page") || "1", 10) || 1;
    sortSelectEl.value = currentSort;

    const wandoroParam = params.get("wandoro");
    if (wandoroParam) {
      for (const key of wandoroParam.split(",")) {
        if (key === "has-wandoro" || key === "wandoro-only") activeFilters.add(key);
      }
      if (activeFilters.has("has-wandoro")) filterHasBtn.setAttribute("aria-pressed", "true");
      if (activeFilters.has("wandoro-only")) filterOnlyBtn.setAttribute("aria-pressed", "true");
    }

    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("failed to load");
      allNovels = await res.json();
    } catch (e) {
      gridEl.innerHTML = '<p class="empty-msg">一覧データの読み込みに失敗しました。ローカルで確認する場合は、簡易サーバー（例: python3 -m http.server）経由で開いてください。</p>';
      return;
    }
    render();
  }

  init();
})();
