// logic.js – 판단 규칙만 (화면을 다루는 코드 금지)

// 교육용 가상 기준 (실제 작업 중지 · 행사 취소 기준은 각 기관 규정을 따름)
const RULES = { wind: 10, rain: 60, heat: 33 };

// 일정 구분과 날씨로 판단 (w가 없으면 '날씨 확인 전')
function judge(kind, w) {
  if (!w) return { level: 'none', text: '날씨 확인 전' };
  if (kind === '실내') return { level: 'ok', text: '영향 없음' };
  if (kind === '고소' && w.windMax >= RULES.wind) return { level: 'stop', text: '중지 검토 (강풍)' };
  if (w.tempMax >= RULES.heat) return { level: 'warn', text: '폭염 휴식' };
  if (w.rainProb >= RULES.rain) return { level: 'warn', text: '우천 주의' };
  return { level: 'ok', text: '진행' };
}

// 지역별 위치 (시 · 군 중심 근사 좌표, 날씨 조회용)
const REGIONS = [
  { name: '세종', lat: 36.48, lon: 127.29 },
  { name: '대전', lat: 36.35, lon: 127.38 },
  { name: '태안', lat: 36.75, lon: 126.30 },
  { name: '보령', lat: 36.33, lon: 126.61 },
];

// Open-Meteo 주소 만들기 (키 없음, 4곳을 한 번에 요청, 풍속은 m/s)
function buildWeatherUrl() {
  const lat = REGIONS.map(r => r.lat).join(',');
  const lon = REGIONS.map(r => r.lon).join(',');
  return 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + lat + '&longitude=' + lon
    + '&daily=temperature_2m_max,wind_speed_10m_max,precipitation_probability_max'
    + '&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=1';
}

// 응답 → { 세종: { tempMax, windMax, rainProb }, ... } (값이 없는 지역은 빠짐)
function parseWeather(json) {
  const list = Array.isArray(json) ? json : [json];
  const map = {};
  REGIONS.forEach((r, i) => {
    const d = list[i] && list[i].daily;
    if (!d) return;
    const tempMax = d.temperature_2m_max && d.temperature_2m_max[0];
    const windMax = d.wind_speed_10m_max && d.wind_speed_10m_max[0];
    const rainProb = d.precipitation_probability_max && d.precipitation_probability_max[0];
    if ([tempMax, windMax, rainProb].some(v => typeof v !== 'number')) return;
    map[r.name] = { tempMax, windMax, rainProb };
  });
  return map;
}

// 시험용: ?test=wind 이면 모든 지역 풍속을 12로 바꿈
function applyTestMode(map, test) {
  if (test !== 'wind') return map;
  const out = {};
  for (const k in map) out[k] = { ...map[k], windMax: 12 };
  return out;
}

// 날씨 한 줄 글자 (날씨가 없으면 '-')
function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

// 마크다운 표 칸에 넣을 글자 : | 와 줄바꿈이 표를 깨지 않게 바꿈
function mdCell(v) {
  return String(v).replace(/\|/g, '\\|').replace(/\s*[\r\n]+\s*/g, ' ');
}

// 오늘 판단을 마크다운 글자로 만듦 (testNote 가 있으면 제목에 붙임)
function buildJudgementMd(dateText, tasks, weatherByRegion, testNote) {
  const lines = [
    '# 현장 일정 판단 (' + dateText + ')' + (testNote ? ' ' + testNote : ''),
    '',
    '| 일정 | 지역 | 구분 | 담당 | 날씨 | 판단 |',
    '|---|---|---|---|---|---|',
  ];
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const cells = [t.title, t.region, t.kind, t.owner, weatherText(w), judge(t.kind, w).text];
    lines.push('| ' + cells.map(mdCell).join(' | ') + ' |');
  }
  lines.push('');
  lines.push('판단 기준(교육용 가상): 실내 영향 없음 · 고소+풍속 ' + RULES.wind + 'm/s 이상 중지 검토 · '
    + RULES.heat + '℃ 이상 폭염 휴식 · 강수확률 ' + RULES.rain + '% 이상 우천 주의');
  return lines.join('\n') + '\n';
}

if (typeof module !== 'undefined') {
  module.exports = {
    RULES, REGIONS, judge, buildWeatherUrl, parseWeather, applyTestMode, weatherText, buildJudgementMd,
  };
}
