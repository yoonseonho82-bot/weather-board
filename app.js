// app.js – 화면 동작 (목록 그리기, 일정 추가)

let baseTasks = null;       // data/tasks.json 에서 읽은 일정 (못 읽으면 null)
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

// JSON 을 먼저 읽고, 그다음 화면에서 추가한 일정(wx_added)을 이어 붙임
function refreshTasks() {
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  tasks = baseTasks ? baseTasks.concat(saved) : [];
  renderTasks();
}

async function loadTasks() {
  const msg = document.getElementById('msgBox');
  try {
    const res = await fetch('data/tasks.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    baseTasks = await res.json();
    msg.textContent = '';
  } catch (err) {
    // 더블클릭(file://)으로 열면 브라우저가 JSON 읽기를 막음
    baseTasks = null;
    msg.textContent = '배포 주소로 열어 주세요';
  }
  refreshTasks();
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
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

function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  saved.push(t);
  localStorage.setItem('wx_added', JSON.stringify(saved));
  e.target.reset();
  refreshTasks();
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

// 오늘 날짜를 YYYY-MM-DD 로 표시 (PC 시간 기준)
function renderToday() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  document.getElementById('todayBox').textContent = d.getFullYear() + '-' + mm + '-' + dd;
}

document.getElementById('taskForm').addEventListener('submit', addTask);
renderToday();
loadTasks();
loadWeather();
