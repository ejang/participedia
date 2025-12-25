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
};

let rows = [];
let filtered = [];

function normalize(s){ return (s ?? '').toString().trim(); }
function lower(s){ return normalize(s).toLowerCase(); }

function parseCSV(text){
  const out = [];
  let i=0, field='', row=[], inQuotes=false;
  function endField(){ row.push(field); field=''; }
  function endRow(){ if (!(row.length===1 && row[0]==='')) out.push(row); row=[]; }
  while (i < text.length){
    const c = text[i];
    if (inQuotes){
      if (c === '"'){
        const next = text[i+1];
        if (next === '"'){ field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"'){ inQuotes = true; i++; continue; }
      if (c === ','){ endField(); i++; continue; }
      if (c === '\n'){ endField(); endRow(); i++; continue; }
      if (c === '\r'){ i++; continue; }
      field += c; i++; continue;
    }
  }
  endField(); endRow();
  return out;
}

function buildObjects(table){
  if (!table || table.length < 2) return [];
  const headers = table[0].map(h => normalize(h));
  const objs = [];
  for (let r=1; r<table.length; r++){
    const line = table[r];
    const obj = {};
    for (let c=0; c<headers.length; c++) obj[headers[c]] = line[c] ?? '';
    objs.push(obj);
  }
  return objs;
}

function pick(obj, keys){
  for (const k of keys){
    if (k in obj && normalize(obj[k]) !== '') return normalize(obj[k]);
  }
  return '';
}

function uniqSorted(values){
  return [...new Set(values.filter(v=>normalize(v) !== ''))].sort((a,b)=>a.localeCompare(b,'ko'));
}

function setOptions(select, values){
  const first = document.createElement('option');
  first.value = '';
  first.textContent = '전체';
  select.innerHTML = '';
  select.appendChild(first);
  for (const v of values){
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    select.appendChild(opt);
  }
}

function populateFilters(){
  setOptions(els.usecase, uniqSorted(rows.map(r => pick(r, ['워크북_추천사용상황','추천사용상황']))));
  setOptions(els.mode, uniqSorted(rows.map(r => pick(r, ['진행방식','facetoface_online_or_both']))));
  setOptions(els.type, uniqSorted(rows.map(r => pick(r, ['유형','type']))));
}

function badge(text, cls){
  const b = document.createElement('span');
  b.className = 'badge' + (cls ? ` ${cls}` : '');
  b.textContent = text;
  return b;
}

function renderCard(r){
  const card = document.createElement('article');
  card.className = 'card';

  const title = pick(r, ['제목(한국어)','제목(한국어-자동)','제목','title']);
  const desc  = pick(r, ['요약(1문장)','요약(1문장-자동)','설명(한국어)','설명(한국어-자동)','설명','description']);
  const url   = pick(r, ['URL','url']);
  const usecase = pick(r, ['워크북_추천사용상황','추천사용상황']);
  const mode = pick(r, ['진행방식','facetoface_online_or_both']);
  const type = pick(r, ['유형','type']);
  const id = pick(r, ['ID','id']);
  const updated = pick(r, ['수정일','updated_date']);
  const posted = pick(r, ['게시일','post_date']);

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
  h.textContent = title || '(제목 없음)';
  head.appendChild(h);

  const p = document.createElement('p');
  p.className = 'desc';
  p.textContent = desc || '';
  head.appendChild(p);

  const foot = document.createElement('div');
  foot.className = 'foot';

  const left = document.createElement('div');
  left.className = 'small';
  const date = updated || posted;
  left.textContent = `ID ${id || '-'} · ${date ? date : '날짜 -'}`;
  foot.appendChild(left);

  const a = document.createElement('a');
  a.className = 'btn';
  a.href = url || '#';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = '원문 보기';
  foot.appendChild(a);

  card.appendChild(head);
  card.appendChild(foot);
  return card;
}

function render(){
  els.cards.innerHTML = '';
  els.count.textContent = `${filtered.length.toLocaleString('ko-KR')}개`;
  els.empty.hidden = filtered.length !== 0;
  const frag = document.createDocumentFragment();
  for (const r of filtered) frag.appendChild(renderCard(r));
  els.cards.appendChild(frag);
}

function applyFilters(){
  const q = lower(els.q.value);
  const usecase = normalize(els.usecase.value);
  const mode = normalize(els.mode.value);
  const type = normalize(els.type.value);

  filtered = rows.filter(r => {
    const title = lower(pick(r, ['제목(한국어)','제목(한국어-자동)','제목','title']));
    const desc  = lower(pick(r, ['설명(한국어)','설명(한국어-자동)','설명','description']));
    const tags  = lower(pick(r, ['태그(필터용)','tags']));
    const id    = lower(pick(r, ['ID','id']));
    const rUse = pick(r, ['워크북_추천사용상황','추천사용상황']);
    const rMode = pick(r, ['진행방식','facetoface_online_or_both']);
    const rType = pick(r, ['유형','type']);

    const okQ = !q || title.includes(q) || desc.includes(q) || tags.includes(q) || id.includes(q);
    const okUse = !usecase || rUse === usecase;
    const okMode = !mode || rMode === mode;
    const okType = !type || rType === type;
    return okQ && okUse && okMode && okType;
  });
  render();
}

function loadFromCSVText(text){
  rows = buildObjects(parseCSV(text));
  const anyFormula = rows.some(r => pick(r, ['제목(한국어)','제목(한국어-자동)']).startsWith('='));
  els.updated.textContent = anyFormula
    ? '⚠️ 번역값이 수식 상태입니다. Google Sheets에서 번역 완료 후 CSV(값)로 다시 내보내 주세요.'
    : `로드됨: ${new Date().toLocaleString('ko-KR', { dateStyle:'medium', timeStyle:'short' })}`;
  populateFilters();
  applyFilters();
}

async function loadDefaultCSV(){
  try{
    const res = await fetch('data.csv', { cache:'no-store' });
    if (!res.ok) return false;
    loadFromCSVText(await res.text());
    return true;
  }catch(e){ return false; }
}

els.q.addEventListener('input', applyFilters);
els.usecase.addEventListener('change', applyFilters);
els.mode.addEventListener('change', applyFilters);
els.type.addEventListener('change', applyFilters);

els.file.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  loadFromCSVText(await f.text());
});

loadDefaultCSV().then(ok => {
  if (!ok) els.updated.textContent = 'data.csv를 찾지 못했습니다. 상단의 CSV 불러오기로 파일을 선택하세요.';
});
