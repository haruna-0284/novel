(function () {
  "use strict";

  // 開き括弧・記号として扱う文字（この文字で始まる行は字下げ不要）
  const OPEN_MARKS = ["「", "『", "（", "(", "＜", "〈", "“", "\u2018", "―", "—", "・"];

  function startsWithOpenMark(line) {
    if (!line) return false;
    return OPEN_MARKS.includes(line[0]);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function buildIdFromNumber(numStr) {
    const num = parseInt(numStr, 10);
    if (!numStr || isNaN(num) || num < 1) return null;
    return `novel-${String(num).padStart(2, "0")}`;
  }

  function validateAndBuildParagraphs(raw) {
    const lines = raw.split(/\r?\n/);
    const paragraphs = [];
    const warnings = [];
    let lineNo = 0;

    for (const line of lines) {
      lineNo++;
      if (line.trim() === "") continue; // 空行は段落として扱わない

      const isHeading = /^#\s*/.test(line);

      if (!isHeading) {
        const startsWithFullwidthSpace = line[0] === "\u3000";
        if (!startsWithFullwidthSpace && !startsWithOpenMark(line)) {
          warnings.push({ type: "indent", lineNo, text: line });
        }
      }

      const halfwidthMatches = line.match(/[A-Za-z0-9]/g);
      if (halfwidthMatches) {
        warnings.push({ type: "halfwidth", lineNo, text: line, chars: halfwidthMatches.join("") });
      }

      paragraphs.push(line);
    }

    return { paragraphs, warnings };
  }

  function computeLength(paragraphs) {
    return paragraphs.reduce((sum, p) => {
      const headingMatch = /^#\s*(.*)$/.exec(p);
      const text = headingMatch ? headingMatch[1] : p;
      return sum + text.length;
    }, 0);
  }

  function renderWarnings(warnings) {
    const box = document.getElementById("warningsBox");
    if (warnings.length === 0) {
      box.innerHTML = '<p class="ok-msg">警告はありません。</p>';
      return;
    }
    const labelOf = (type) => (type === "indent" ? "字下げ漏れの可能性" : "半角英数字を含む");
    box.innerHTML =
      `<p class="warn-count">${warnings.length}件の警告があります（変換自体は行えます。内容を確認してください）。</p>` +
      warnings
        .map((w) => `
          <div class="warn-item">
            <span class="warn-tag">${labelOf(w.type)}</span>
            <span class="warn-line">${w.lineNo}行目:</span>
            <span class="warn-text">${escapeHtml(w.text)}</span>
          </div>`)
        .join("");
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function getFieldValue(id) {
    const el = document.getElementById(id);
    if (!el) {
      console.error(`要素が見つかりません: #${id}（tool.html と tool.js のバージョンが一致していない可能性があります。ブラウザのキャッシュを更新してください）`);
      return "";
    }
    return el.value;
  }

  document.getElementById("processBtn").addEventListener("click", () => {
    const title = getFieldValue("titleInput").trim();
    const idNumberRaw = getFieldValue("idNumberInput").trim();
    const id = buildIdFromNumber(idNumberRaw);
    const createdDate = getFieldValue("createdDateInput");
    const publishedDate = getFieldValue("publishedDateInput");
    const modifiedDate = getFieldValue("modifiedDateInput");
    const themesRaw = getFieldValue("themesInput").trim();
    const raw = getFieldValue("rawTextInput");

    const errors = [];
    if (!title) errors.push("タイトルを入力してください。");
    if (!id) errors.push("ID（連番）に1以上の数字を入力してください。");
    if (!publishedDate) errors.push("公開日を入力してください。");
    if (!raw.trim()) errors.push("本文を貼り付けてください。");

    const errorBox = document.getElementById("errorBox");
    const resultSection = document.getElementById("resultSection");

    if (errors.length > 0) {
      errorBox.hidden = false;
      errorBox.innerHTML = errors.map((e) => `<p>・${escapeHtml(e)}</p>`).join("");
      resultSection.hidden = true;
      document.getElementById("warningsBox").innerHTML = "";
      return;
    }
    errorBox.hidden = true;

    const { paragraphs, warnings } = validateAndBuildParagraphs(raw);
    renderWarnings(warnings);

    const length = computeLength(paragraphs);
    const themes = themesRaw
      .split("・")
      .map((t) => t.trim())
      .filter(Boolean);

    const detail = { id, title };
    if (createdDate) detail.createdDate = createdDate;
    detail.publishedDate = publishedDate;
    if (modifiedDate) detail.modifiedDate = modifiedDate;
    detail.length = length;
    if (themes.length > 0) detail.themes = themes;
    detail.body = paragraphs;

    const listSnippet = { id, title, publishedDate, length };

    document.getElementById("lengthDisplay").textContent = `${length.toLocaleString()}字`;
    document.getElementById("detailJsonOutput").value = JSON.stringify(detail, null, 2);
    document.getElementById("listSnippetOutput").value = JSON.stringify(listSnippet, null, 2);
    resultSection.hidden = false;

    document.getElementById("downloadDetailBtn").onclick = () => {
      downloadText(`${id}.json`, JSON.stringify(detail, null, 2));
    };
  });

  document.getElementById("copySnippetBtn").addEventListener("click", () => {
    const text = document.getElementById("listSnippetOutput").value;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById("copySnippetBtn");
      const orig = btn.textContent;
      btn.textContent = "コピーしました！";
      setTimeout(() => (btn.textContent = orig), 1500);
    });
  });

  const idNumberInput = document.getElementById("idNumberInput");
  const idPreview = document.getElementById("idPreview");
  if (idNumberInput && idPreview) {
    idNumberInput.addEventListener("input", () => {
      const built = buildIdFromNumber(idNumberInput.value.trim());
      idPreview.textContent = built || "novel-01";
    });
  }
})();
