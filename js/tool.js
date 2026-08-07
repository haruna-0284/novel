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

  function buildIdFromNumber(numStr, suffix) {
    const num = parseInt(numStr, 10);
    if (!numStr || isNaN(num) || num < 1) return null;
    return `novel-${String(num).padStart(2, "0")}${suffix || ""}`;
  }

  const TYPE_HINTS = {
    "normal": "通常の作品として登録します。",
    "revised-with-wandoro": "IDは通常通りです。対応するワンドロ版のIDは自動的に「(このID)w」になります（そちらは種別「ワンドロ版（修正版とペア）」で別途作成してください）。",
    "wandoro-only": "ワンドロ版のみの作品として、一覧にそのまま表示されます（枠が赤くなります）。",
    "wandoro-paired": "IDの末尾に自動で「w」が付きます。一覧には表示されず、対になる修正版のページからのみ遷移できます。修正版と同じ連番を入力してください。"
  };

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
    const type = getFieldValue("typeSelect") || "normal";
    const title = getFieldValue("titleInput").trim();
    const idNumberRaw = getFieldValue("idNumberInput").trim();
    const idSuffix = type === "wandoro-paired" ? "w" : "";
    const id = buildIdFromNumber(idNumberRaw, idSuffix);
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

    let listSnippet = null;

    if (type === "revised-with-wandoro") {
      const wandoroId = buildIdFromNumber(idNumberRaw, "w");
      detail.wandoroId = wandoroId;
      listSnippet = { id, title, publishedDate, length, wandoroId };
    } else if (type === "wandoro-only") {
      detail.isWandoro = true;
      listSnippet = { id, title, publishedDate, length, isWandoroOnly: true };
    } else if (type === "wandoro-paired") {
      const revisedId = buildIdFromNumber(idNumberRaw, "");
      detail.isWandoro = true;
      detail.revisedId = revisedId;
      listSnippet = null; // 一覧には追加しない
    } else {
      listSnippet = { id, title, publishedDate, length };
    }

    document.getElementById("lengthDisplay").textContent = `${length.toLocaleString()}字`;
    document.getElementById("detailJsonOutput").value = JSON.stringify(detail, null, 2);

    const listSnippetBlock = document.getElementById("listSnippetBlock");
    const noListSnippetNote = document.getElementById("noListSnippetNote");
    if (listSnippet) {
      listSnippetBlock.hidden = false;
      noListSnippetNote.hidden = true;
      document.getElementById("listSnippetOutput").value = JSON.stringify(listSnippet, null, 2);
    } else {
      listSnippetBlock.hidden = true;
      noListSnippetNote.hidden = false;
    }

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
  const typeSelect = document.getElementById("typeSelect");
  const typeHint = document.getElementById("typeHint");

  function updateIdPreview() {
    if (!idNumberInput || !idPreview || !typeSelect) return;
    const suffix = typeSelect.value === "wandoro-paired" ? "w" : "";
    const built = buildIdFromNumber(idNumberInput.value.trim(), suffix);
    idPreview.textContent = built || `novel-01${suffix}`;
  }

  if (idNumberInput) idNumberInput.addEventListener("input", updateIdPreview);
  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      updateIdPreview();
      if (typeHint) typeHint.textContent = TYPE_HINTS[typeSelect.value] || "";
    });
    updateIdPreview();
  }
})();
