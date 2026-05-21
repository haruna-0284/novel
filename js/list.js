// フッターを読み込む
fetch('footer.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('footer-placeholder').innerHTML = html;
  });

const LENGTH_LABEL = { short: '短編', medium: '中編', long: '長編' };

let allWorks = [];
let genreFilter = 'all';
let lengthFilter = 'all';
let sortKey = 'date-desc';

// データ読み込み
fetch('data/works.json')
  .then(res => res.json())
  .then(data => {
    allWorks = data.works;
    initGenreSelect();
    document.getElementById('total-count').textContent = allWorks.length;
    render();
  })
  .catch(() => {
    document.getElementById('works-grid').innerHTML =
      '<p style="padding:2rem;color:#666;">作品データを読み込めませんでした。</p>';
  });

// ジャンル選択肢を動的生成
function initGenreSelect() {
  const genres = [...new Set(allWorks.flatMap(w => w.genre))].sort();
  const select = document.getElementById('genre-select');
  genres.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    select.appendChild(opt);
  });
}

// フィルタ＆ソート
function filterAndSort() {
  return allWorks
    .filter(w => {
      const gOk = genreFilter === 'all' || w.genre.includes(genreFilter);
      const lOk = lengthFilter === 'all' || w.length === lengthFilter;
      return gOk && lOk;
    })
    .sort((a, b) => {
      if (sortKey === 'date-desc') return new Date(b.publishedAt) - new Date(a.publishedAt);
      if (sortKey === 'date-asc')  return new Date(a.publishedAt) - new Date(b.publishedAt);
      if (sortKey === 'chars-desc') return b.charCount - a.charCount;
      return a.charCount - b.charCount;
    });
}

// 描画
function render() {
  const results = filterAndSort();
  const grid  = document.getElementById('works-grid');
  const empty = document.getElementById('empty');
  document.getElementById('result-count').textContent = `${results.length} 件`;

  if (results.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = results.map(w => `
    <a class="work-card" href="${w.url}">
      <div class="card-genre-row">
        ${w.genre.map(g => `<span class="genre-tag">${g}</span>`).join('')}
        <span class="length-tag">${LENGTH_LABEL[w.length] ?? w.length}</span>
      </div>
      <h2 class="card-title">${w.title}</h2>
      <p class="card-desc">${w.description}</p>
      <div class="card-meta">
        <span>${w.publishedAt}</span>
        <span>${w.charCount.toLocaleString()}字</span>
      </div>
      <span class="card-arrow" aria-hidden="true">→</span>
    </a>
  `).join('');
}

// イベント
document.getElementById('genre-select').addEventListener('change', e => {
  genreFilter = e.target.value;
  render();
});

document.querySelectorAll('[data-filter-length]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter-length]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    lengthFilter = btn.dataset.filterLength;
    render();
  });
});

document.getElementById('sort-select').addEventListener('change', e => {
  sortKey = e.target.value;
  render();
});
