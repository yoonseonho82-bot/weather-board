// app.js – 화면 동작 (목록 그리기, 일정 추가)

let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음
let db = null;              // Supabase 연결 (config.js 를 채우지 않았으면 null)
let dbOk = false;           // 이번에 DB 에서 일정을 읽었는지

// config.js 의 주소 · 공개용 키로 연결을 만듦 (자리표시 그대로면 연결 안 함)
function makeClient() {
  if (typeof supabase === 'undefined') return null;
  if (!/^https:\/\//.test(SUPABASE_URL) || !SUPABASE_KEY || SUPABASE_KEY.startsWith('여기에')) return null;
  return supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// DB(wx_tasks)에서 먼저 읽고, 안 되면 data/tasks.json 을 읽기 전용으로 보여 줌
async function loadTasks() {
  const msg = document.getElementById('msgBox');
  try {
    if (!db) throw new Error('DB 설정 없음');
    const { data, error } = await db.from('wx_tasks').select('title,region,kind,owner').order('id');
    if (error) throw error;
    tasks = data;
    dbOk = true;
    msg.textContent = '';
  } catch (err) {
    dbOk = false;
    try {
      const res = await fetch('data/tasks.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      tasks = await res.json();
      msg.textContent = 'DB에 연결하지 못해 data/tasks.json 을 보여 줍니다 (일정 추가 불가)';
    } catch (err2) {
      // 더블클릭(file://)으로 열면 브라우저가 JSON 읽기를 막음
      tasks = [];
      msg.textContent = '배포 주소로 열어 주세요 (DB 연결도 확인)';
    }
  }
  renderTasks();
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function addTask(e) {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('msgBox');
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  if (!dbOk) {
    msg.textContent = '일정 추가는 DB에 연결되어야 합니다';
    return;
  }
  const { error } = await db.from('wx_tasks').insert(t);
  if (error) {
    msg.textContent = '일정을 추가하지 못했습니다: ' + error.message;
    return;
  }
  form.reset();
  await loadTasks();
}

// 지역별 날씨를 받아 표를 다시 그림 (실패해도 목록은 그대로 보임)
async function loadWeather() {
  const box = document.getElementById('weatherBox');
  try {
    const res = await fetch(buildWeatherUrl());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const test = new URLSearchParams(location.search).get('test');
    weatherByRegion = applyTestMode(parseWeather(await res.json()), test);
    const names = Object.keys(weatherByRegion);
    if (names.length === 0) throw new Error('empty');
    box.textContent = names.map(n => n + ' ' + weatherText(weatherByRegion[n])).join('  |  ')
      + (test === 'wind' ? '  (시험: 풍속 12 m/s)' : '');
  } catch (err) {
    weatherByRegion = {};
    box.textContent = '날씨를 받지 못했습니다. 일정 목록만 표시합니다.';
  }
  renderTasks();
}

// 오늘 날짜 YYYY-MM-DD (PC 시간 기준)
function todayText() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function renderToday() {
  document.getElementById('todayBox').textContent = todayText();
}

// 지금 표를 마크다운 파일로 내려받음
function saveMd() {
  const msg = document.getElementById('msgBox');
  if (tasks.length === 0) {
    msg.textContent = '저장할 일정이 없습니다';
    return;
  }
  const date = todayText();
  const test = new URLSearchParams(location.search).get('test');
  const note = test === 'wind' ? '(시험: 풍속 12 m/s)' : '';
  const md = buildJudgementMd(date, tasks, weatherByRegion, note);
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = '현장일정_판단_' + date + '.md';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  msg.textContent = '';
}

document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('saveMdBtn').addEventListener('click', saveMd);
renderToday();
db = makeClient();
loadTasks();
loadWeather();
