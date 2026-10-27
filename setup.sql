-- setup.sql – Supabase 의 SQL Editor 에 붙여 넣고 Run 으로 실행 (한 번만)
-- 가상 데이터 전용 교육용 표입니다. 실제 이름 · 연락처를 넣지 않습니다.

-- 1) 표 만들기 : 지역 · 구분 규칙은 check 로 DB 가 직접 막음
create table wx_tasks (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(btrim(title)) between 1 and 100),
  region     text not null check (region in ('세종', '대전', '태안', '보령')),
  kind       text not null check (kind   in ('야외', '고소', '실내')),
  owner      text not null check (char_length(btrim(owner)) between 1 and 30),
  created_at timestamptz not null default now()
);

-- 2) 접근 권한 : 공개용 키(anon)는 읽기 · 추가만 가능, 수정 · 삭제는 정책이 없어서 막힘
alter table wx_tasks enable row level security;

create policy "wx_tasks 읽기" on wx_tasks
  for select to anon using (true);

create policy "wx_tasks 추가" on wx_tasks
  for insert to anon with check (true);

-- 3) 처음 보이는 가상 일정 6건
insert into wx_tasks (title, region, kind, owner) values
  ('다중이용시설 안전점검', '세종', '야외', '김안전'),
  ('시민 안전체험 행사 운영', '보령', '야외', '이행사'),
  ('옥상 태양광 설비 점검', '태안', '고소', '박설비'),
  ('하천 수위계 확인', '대전', '야외', '최현장'),
  ('청사 외벽 간판 보수', '세종', '고소', '정시설'),
  ('비상연락 훈련', '대전', '실내', '한상황');
