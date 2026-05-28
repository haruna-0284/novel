// フッターを読み込む
fetch('footer.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('footer-placeholder').innerHTML = html;
  });

const LENGTH_LABEL = { short: '短編', medium: '中編', long: '長編' };

// URLクエリから作品IDを取得
const params = new URLSearchParams(location.search);
const workId = params.get('id');

if (!workId) {
  showError('作品IDが指定されていません。');
} else {
  fetch(`data/works/${workId}.json`)
    .then(res => {
      if (!res.ok) throw new Error('not found');
      return res.json();
    })
    .then(work => renderWork(work))
    .catch(() => showError('作品データを読み込めませんでした。'));
}

function renderWork(work) {
  // タブタイトル
  document.title = `${work.title} - Fiction Shelf`;

  // ヘッダー
  const lengthLabel = LENGTH_LABEL[work.length] ?? work.length;
  document.getElementById('novel-date').textContent =
    `${work.publishedAt}\u00a0·\u00a0${lengthLabel}\u00a0·\u00a0${work.charCount.toLocaleString()}字`;
  document.getElementById('novel-title').textContent = work.title;

  // 本文: Markdown → HTML（空行で段落分け）
  if (typeof marked !== 'undefined') {
    document.getElementById('novel-body').innerHTML = marked.parse(work.body);
  } else {
    // marked.js が読み込めなかった場合のフォールバック
    document.getElementById('novel-body').innerHTML = work.body
      .split(/\n\n+/)
      .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
      .join('');
  }

  // お題
  const answersEl = document.getElementById('themes-answers');
  answersEl.innerHTML = work.themes
    .map(t => `<div class="theme-tag">${t}</div>`)
    .join('');

  // メタ情報
  document.getElementById('novel-meta').innerHTML = `
    <div class="meta-item">
      <span class="meta-label">公開日</span>
      <span class="meta-value">${work.publishedAt}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">作成日</span>
      <span class="meta-value">${work.createdAt}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">更新日</span>
      <span class="meta-value">${work.updatedAt || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">文字数</span>
      <span class="meta-value">${work.charCount.toLocaleString()}字</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">ジャンル</span>
      <span class="meta-value">${work.genre.join('・')}</span>
    </div>
  `;
}

function showError(msg) {
  document.getElementById('novel-title').textContent = 'エラー';
  document.getElementById('novel-body').innerHTML = `<p style="color:#666;">${msg}</p>`;
}

// お題の開閉
const btn = document.getElementById('themes-btn');
const answers = document.getElementById('themes-answers');
let revealed = false;

btn.addEventListener('click', () => {
  revealed = !revealed;
  if (revealed) {
    answers.classList.add('visible');
    btn.textContent = 'お題を隠す ◀';
    btn.classList.add('revealed');
    btn.setAttribute('aria-expanded', 'true');
    answers.setAttribute('aria-hidden', 'false');
  } else {
    answers.classList.remove('visible');
    btn.textContent = 'お題を見る ▶';
    btn.classList.remove('revealed');
    btn.setAttribute('aria-expanded', 'false');
    answers.setAttribute('aria-hidden', 'true');
  }
});
