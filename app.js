const els = {
  q: document.getElementById('q'),
  usecase: document.getElementById('usecase'),
  mode: document.getElementById('mode'),
  type: document.getElementById('type'),
  file: document.getElementById('file'),
  cards: document.getElementById('cards'),
  empty: document.getElementById('empty'),
  count: document.getElementById('count'),
  updated: document.getElementById('updated'),
  themeToggle: document.getElementById('theme-toggle'),
  resetBtn: document.getElementById('reset-btn'),
  topBtn: document.getElementById('top-btn'),
  loader: document.getElementById('loader'),
  // 모달 관련 요소
  modal: document.getElementById('detail-modal'),
  mTitle: document.getElementById('m-title'),
  mClose: document.getElementById('m-close'),
  mBadges: document.getElementById('m-badges'),
  mDesc: document.getElementById('m-desc'),
  mMeta: document.getElementById('m-meta'),
  mId: document.getElementById('m-id'),
  mLink: document.getElementById('m-link'),
};

let rows = [];
let filtered = [];

// 유틸리티 함수
function normalize(s) { return (s ?? '').toString().trim(); }
function lower(s) { return normalize(s).toLowerCase(); }

// CSV 파서
function parseCSV(text) {
  const out = [];
  let i = 0, field = '', row = [], inQuotes = false;
  function endField() { row.push(field); field = ''; }
  function endRow() { if (!(row.length === 1 && row[0] === '')) out.push(row); row = []; }
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ',') { endField(); i++; continue; }
      if (c === '\n') { endField(); endRow(); i++; continue; }
      if (c === '\r') { i++; continue; }
      field += c; i++; continue;
    }
  }
  endField(); endRow();
  return out;
}

function buildObjects(table) {
  if (!table || table.length < 2) return [];
  const headers = table[0].map(h => normalize(h));
  const objs = [];
  for (let r = 1; r < table.length; r++) {
    const line = table[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = line[c] ?? '';
    objs.push(obj);
  }
  return objs;
}

function pick(obj, keys) {
  for (const k of keys) {
    if (k in obj && normalize(obj[k]) !== '') return normalize(obj[k]);
  }
  return '';
}

function uniqSorted(values) {
  return [...new Set(values.filter(v => normalize(v) !== ''))].sort((a, b) => a.localeCompare(b, 'ko'));
}

function setOptions(select, values) {
  const currentVal = select.value;
  const first = document.createElement('option');
  first.value = '';
  first.textContent = '전체';
  select.innerHTML = '';
  select.appendChild(first);
  for (const v of values) {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    select.appendChild(opt);
  }
  select.value = currentVal; 
}

function populateFilters() {
  setOptions(els.usecase, uniqSorted(rows.map(r => pick(r, ['워크북_추천사용상황', '추천사용상황']))));
  setOptions(els.mode, uniqSorted(rows.map(r => pick(r, ['진행방식', 'facetoface_online_or_both']))));
  setOptions(els.type, uniqSorted(rows.map(r => pick(r, ['유형', 'type']))));
}

function badge(text, cls) {
  const b = document.createElement('span');
  b.className = 'badge' + (cls ? ` ${cls}` : '');
  b.textContent = text;
  return b;
}

// 검색어 하이라이트 함수
function highlightText(text, query) {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<mark class="highlight">$1</mark>');
}

// 모달 열기 함수
function openModal(r) {
  const title = pick(r, ['제목(한국어)', '제목(한국어-자동)', '제목', 'title']) || '(제목 없음)';
  const desc = pick(r, ['설명(한국어)', '설명(한국어-자동)', '설명', 'description']) || '(설명 없음)';
  const url = pick(r, ['URL', 'url']);
  const id = pick(r, ['ID', 'id']);
  
  // 메타데이터 필드들
  const metas = [
    { label: '분류', val: pick(r, ['워크북_추천사용상황', '추천사용상황']) },
    { label: '진행방식', val: pick(r, ['진행방식', 'facetoface_online_or_both']) },
    { label: '유형', val: pick(r, ['유형', 'type']) },
    { label: '게시일', val: pick(r, ['게시일', 'post_date']) },
    { label: '수정일', val: pick(r, ['수정일', 'updated_date']) },
    { label: '태그', val: pick(r, ['태그(필터용)', 'tags']) }
  ];

  // 배지 초기화
  els.mBadges.innerHTML = '';
  const usecase = pick(r, ['워크북_추천사용상황', '추천사용상황']);
  const mode = pick(r, ['진행방식', 'facetoface_online_or_both']);
  const type = pick(r, ['유형', 'type']);
  
  if (usecase) els.mBadges.appendChild(badge(usecase, 'accent'));
  if (mode) els.mBadges.appendChild(badge(mode, 'green'));
  if (type) els.mBadges.appendChild(badge(type, ''));

  els.mTitle.textContent = title;
  els.mDesc.textContent = desc; // 전체 텍스트 그대로 표시
  els.mId.textContent = `ID: ${id}`;
  els.mLink.href = url || '#';
  
  // 메타 그리드 채우기
  els.mMeta.innerHTML = '';
  metas.forEach(m => {
    if(!m.val) return;
    const item = document.createElement('div');
    item.className = 'meta-item';
    item.innerHTML = `<span class="meta-label">${m.label}</span><span class="meta-val">${m.val}</span>`;
    els.mMeta.appendChild(item);
  });

  els.modal.showModal();
}

// 모달 닫기 이벤트
els.mClose.addEventListener('click', () => els.modal.close());
els.modal.addEventListener('click', (e) => {
  if (e.target === els.modal) els.modal.close();
});

function renderCard(r) {
  const card = document.createElement('article');
  card.className = 'card';

  const rawTitle = pick(r, ['제목(한국어)', '제목(한국어-자동)', '제목', 'title']);
  const rawDesc = pick(r, ['요약(1문장)', '요약(1문장-자동)', '설명(한국어)', '설명(한국어-자동)', '설명', 'description']);
  const usecase = pick(r, ['워크북_추천사용상황', '추천사용상황']);
  const mode = pick(r, ['진행방식', 'facetoface_online_or_both']);
  const type = pick(r, ['유형', 'type']);
  const id = pick(r, ['ID', 'id']);

  const query = lower(els.q.value);

  const head = document.createElement('div');
  head.className = 'head';

  const badges = document.createElement('div');
  badges.className = 'badges';
  if (usecase) badges.appendChild(badge(usecase, 'accent'));
  if (mode) badges.appendChild(badge(mode, 'green'));
  if (type) badges.appendChild(badge(type, ''));
  head.appendChild(badges);

  const h = document.createElement('h3');
  h.className = 'title';
  h.innerHTML = query ? highlightText(rawTitle || '(제목 없음)', query) : (rawTitle || '(제목 없음)');
  head.appendChild(h);

  const p = document.createElement('p');
  p.className = 'desc';
  // 카드는 여전히 요약된 내용만 보여줌
  p.innerHTML = query ? highlightText(rawDesc, query) : rawDesc;
  head.appendChild(p);

  const foot = document.createElement('div');
  foot.className = 'foot';

  const left = document.createElement('div');
  left.className = 'small';
  left.textContent = `ID ${id || '-'}`;
  foot.appendChild(left);

  // 버튼 변경: 원문보기 -> 상세보기
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = '상세 보기';
  btn.onclick = () => openModal(r);
  foot.appendChild(btn);

  card.appendChild(head);
  card.appendChild(foot);
  return card;
}

function render() {
  els.cards.innerHTML = '';
  els.count.textContent = `${filtered.length.toLocaleString('ko-KR')}개`;
  
  if (filtered.length === 0) {
    els.empty.hidden = false;
    els.cards.hidden = true;
  } else {
    els.empty.hidden = true;
    els.cards.hidden = false;
    
    const frag = document.createDocumentFragment();
    const limit = 500;
    const displayList = filtered.slice(0, limit);
    
    for (const r of displayList) frag.appendChild(renderCard(r));
    els.cards.appendChild(frag);

    if(filtered.length > limit) {
      const moreMsg = document.createElement('div');
      moreMsg.className = 'foot';
      moreMsg.style.textAlign = 'center';
      moreMsg.textContent = `... 외 ${filtered.length - limit}개의 결과가 더 있습니다. 검색어를 구체적으로 입력해주세요.`;
      els.cards.appendChild(moreMsg);
    }
  }
}

function applyFilters() {
  const q = lower(els.q.value);
  const usecase = normalize(els.usecase.value);
  const mode = normalize(els.mode.value);
  const type = normalize(els.type.value);

  filtered = rows.filter(r => {
    const title = lower(pick(r, ['제목(한국어)', '제목(한국어-자동)', '제목', 'title']));
    const desc = lower(pick(r, ['설명(한국어)', '설명(한국어-자동)', '설명', 'description']));
    const tags = lower(pick(r, ['태그(필터용)', 'tags']));
    const id = lower(pick(r, ['ID', 'id']));
    const rUse = pick(r, ['워크북_추천사용상황', '추천사용상황']);
    const rMode = pick(r, ['진행방식', 'facetoface_online_or_both']);
    const rType = pick(r, ['유형', 'type']);

    const okQ = !q || title.includes(q) || desc.includes(q) || tags.includes(q) || id.includes(q);
    const okUse = !usecase || rUse === usecase;
    const okMode = !mode || rMode === mode;
    const okType = !type || rType === type;
    return okQ && okUse && okMode && okType;
  });
  render();
}

function toggleLoading(isLoading) {
  if (isLoading) {
    els.loader.classList.add('active');
    els.cards.hidden = true;
    els.empty.hidden = true;
  } else {
    els.loader.classList.remove('active');
    els.cards.hidden = false;
  }
}

function loadFromCSVText(text) {
  toggleLoading(true);
  setTimeout(() => {
    rows = buildObjects(parseCSV(text));
    const anyFormula = rows.some(r => pick(r, ['제목(한국어)', '제목(한국어-자동)']).startsWith('='));
    
    if(anyFormula) {
      els.updated.textContent = '⚠️ 엑셀 수식 감지됨';
    } else {
      const dateStr = new Date().toLocaleDateString('ko-KR');
      els.updated.textContent = `데이터: ${rows.length}건 (${dateStr} 로드)`;
    }
    
    populateFilters();
    applyFilters();
    toggleLoading(false);
  }, 50);
}

async function loadDefaultCSV() {
  toggleLoading(true);
  try {
    const res = await fetch('data.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error('파일 없음');
    loadFromCSVText(await res.text());
    return true;
  } catch (e) {
    toggleLoading(false);
    els.updated.textContent = 'CSV 파일 없음';
    return false;
  }
}

// 이벤트 리스너
els.q.addEventListener('input', applyFilters);
els.usecase.addEventListener('change', applyFilters);
els.mode.addEventListener('change', applyFilters);
els.type.addEventListener('change', applyFilters);

els.file.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const text = await f.text();
  loadFromCSVText(text);
});

els.resetBtn.addEventListener('click', () => {
  els.q.value = '';
  els.usecase.value = '';
  els.mode.value = '';
  els.type.value = '';
  applyFilters();
});

function setTheme(isCurrentlyLight) {
  if (isCurrentlyLight) {
    document.body.classList.remove('light-mode');
    els.themeToggle.textContent = '🌙';
  } else {
    document.body.classList.add('light-mode');
    els.themeToggle.textContent = '☀️';
  }
  localStorage.setItem('theme', isCurrentlyLight ? 'dark' : 'light');
}

els.themeToggle.addEventListener('click', () => {
  const isCurrentlyLight = document.body.classList.contains('light-mode');
  setTheme(isCurrentlyLight);
});

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  setTheme(false); // Make it light
} else {
  setTheme(true); // Make it dark
}

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    els.topBtn.hidden = false;
  } else {
    els.topBtn.hidden = true;
  }
});

els.topBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

loadDefaultCSV();
