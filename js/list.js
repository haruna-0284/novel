(function () {
  "use strict";

  const PAGE_SIZE = 20;
  const DATA_URL = "data/novels.json";

  let allNovels = [];
  let currentSort = "date-desc";
  let currentPage = 1;

  const gridEl = document.getElementById("novelGrid");
  const paginationEl = document.getElementById("pagination");
  const sortSelectEl = document.getElementById("sortSelect");
  const resultCountEl = document.getElementById("resultCount");
  const yearEl = document.getElementById("yearSpan");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatDate(d) {
    return d ? d.replaceAll("-", ".") : "";
  }

  function sortNovels(list, sort) {
    const arr = list.slice();
    switch (sort) {
      case "date-asc":
        arr.sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
        break;
      case "date-desc":
        arr.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
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
    const sorted = sortNovels(allNovels, currentSort);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);

    gridEl.innerHTML = "";

    if (pageItems.length === 0) {
      gridEl.innerHTML = '<p class="empty-msg">まだ小説がありません。</p>';
    } else {
      for (const n of pageItems) {
        const a = document.createElement("a");
        a.className = "novel-card";
        a.href = `novel.html?id=${encodeURIComponent(n.id)}`;
        a.innerHTML = `
          <h2>${escapeHtml(n.title)}</h2>
          <div class="card-meta">
            <span class="stamp-date">${formatDate(n.publishedDate)}</span>
            <span class="stamp-length">${n.length.toLocaleString()}字</span>
          </div>`;
        gridEl.appendChild(a);
      }
    }

    resultCountEl.textContent = `全${allNovels.length}作 / ${currentPage} / ${totalPages}ページ`;

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
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }

  sortSelectEl.addEventListener("change", (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    render();
  });

  async function init() {
    const params = new URLSearchParams(location.search);
    currentSort = params.get("sort") || "date-desc";
    currentPage = parseInt(params.get("page") || "1", 10) || 1;
    sortSelectEl.value = currentSort;

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
