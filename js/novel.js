(function () {
  "use strict";

  const container = document.getElementById("novelContainer");
  const titleEl = document.getElementById("novelTitle");
  const metaEl = document.getElementById("novelMeta");
  const articleEl = document.getElementById("novelArticle");
  const themeReveal = document.getElementById("themeReveal");
  const themeBtn = document.getElementById("themeBtn");
  const themeChips = document.getElementById("themeChips");
  const yearEl = document.getElementById("yearSpan");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function fmt(d) {
    return d ? d.replaceAll("-", ".") : "";
  }

  function showError(message) {
    container.innerHTML = `<p class="empty-msg" style="padding:3rem 1.5rem;">${escapeHtml(message)}</p>`;
  }

  function renderNovel(novel) {
    document.title = `${novel.title} | ナマケモノ文庫`;
    titleEl.textContent = novel.title;

    const metaParts = [
      `<span class="stamp-date">公開 ${fmt(novel.publishedDate)}</span>`,
      `<span class="stamp-length">${novel.length.toLocaleString()}字</span>`
    ];
    if (novel.createdDate) metaParts.push(`<span class="stamp-date-sub">作成 ${fmt(novel.createdDate)}</span>`);
    if (novel.modifiedDate) metaParts.push(`<span class="stamp-date-sub">修正 ${fmt(novel.modifiedDate)}</span>`);
    metaEl.innerHTML = metaParts.join(" ");

    const body = Array.isArray(novel.body) ? novel.body : [];
    articleEl.innerHTML = body
      .map((line) => {
        const headingMatch = /^#\s*(.*)$/.exec(line);
        if (headingMatch) {
          return `<h2 class="chapter-heading">${escapeHtml(headingMatch[1])}</h2>`;
        }
        return `<p>${escapeHtml(line)}</p>`;
      })
      .join("");

    if (Array.isArray(novel.themes) && novel.themes.length > 0) {
      themeReveal.hidden = false;
      themeBtn.hidden = false;
      themeChips.innerHTML = novel.themes.map((t) => `<span class="theme-chip">${escapeHtml(t)}</span>`).join("");
      themeBtn.addEventListener("click", () => {
        const nowVisible = themeReveal.classList.toggle("visible");
        themeBtn.textContent = nowVisible ? "お題を隠す" : "お題を表示";
      });
    } else {
      themeReveal.hidden = true;
      themeBtn.hidden = true;
    }
  }

  async function init() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (!id) {
      showError("小説が指定されていません。一覧ページから選んでください。");
      return;
    }
    try {
      const res = await fetch(`data/novels/${encodeURIComponent(id)}.json`);
      if (!res.ok) throw new Error("not found");
      const novel = await res.json();
      renderNovel(novel);
    } catch (e) {
      showError("指定された小説が見つかりませんでした。ローカルで確認する場合は、簡易サーバー（例: python3 -m http.server）経由で開いてください。");
    }
  }

  init();
})();
