# Dong Prime — Streamlit Admin Dashboard · 기획서 (Spec)

관리자(사장님)용 웹 대시보드. 현재 Google Sheets + Supabase Table Editor로 하던 운영을
하나의 제대로 된 관리 콘솔로 대체/보강한다. Streamlit은 서버에서 실행되므로 `service_role`
키를 안전하게 쓸 수 있다(고객용 React 앱에는 절대 넣지 않는 키).

---

## 0. 목표 & 원칙
- **단일 운영 콘솔**: 주문 처리, 재고/상품 관리, 결제 확인, 취소·환불, 매출 분석을 한 곳에서.
- **고객 데이터 보호**: 주문에는 이름/전화/이메일/주소(PII)가 있다 → 대시보드는 **반드시 인증으로 보호**.
- **기존 시스템과 정합**: 고객 앱(React)·DB(Supabase)·시트가 같은 DB를 본다. 대시보드 변경은 즉시 반영.
- **읽기는 빠르게, 쓰기는 안전하게**: 상태 전이/재고 차감은 기존 규칙(트리거·RPC)과 충돌 없이.

---

## 1. 아키텍처 & 스택
- **Python 3.11 + Streamlit** (멀티페이지 앱).
- **데이터 접근**: `supabase-py`(REST, service_role) — RLS 우회(관리자). 무거운 분석 쿼리는 옵션으로 `psycopg2`/SQLAlchemy 직접 연결.
- **스토리지**: Supabase Storage REST로 영수증(payment-proofs) **signed URL** 생성해 미리보기.
- **차트**: Streamlit 기본 + `plotly`(또는 `altair`).
- **표/편집**: `st.dataframe` / `st.data_editor`(인라인 편집).
- **배포**: **Streamlit Community Cloud**(GitHub 연동, 무료). 대안: Render / Hugging Face Spaces / Fly.io.

---

## 2. 보안 & 인증 (가장 중요 — 빠지면 안 됨)
- **service_role 키는 Streamlit Secrets에만** 저장(`.streamlit/secrets.toml`, gitignore). 코드/깃에 절대 금지.
- **접근 차단(필수)**: 대시보드는 모든 주문 PII 열람 + DB 변경 가능 → 인증 없으면 공개 금지.
  - **MVP**: `st.secrets["ADMIN_PASSWORD"]` 비밀번호 게이트 + `st.session_state` 세션. (단일 운영자에 충분)
  - **업그레이드**: Streamlit Cloud의 "지정 이메일만 보기" 제한, 또는 Supabase Auth + `admin` 역할, 또는 OIDC(Google) 로그인.
- **로그인 시도 제한**(간단한 횟수 제한)·세션 만료.
- **감사 로그**: 누가 언제 무엇을 바꿨는지(`order_status_history`, 아래) 기록.
- **HTTPS**: Streamlit Cloud 기본 제공.
- **최소 권한**: 분석용 읽기 연결과 쓰기 연결 분리(선택).

---

## 3. 배포
1. 이 코드를 GitHub에 push (같은 repo의 `streamlit-admin/` 하위 또는 별도 repo).
2. share.streamlit.io → New app → repo/branch/`streamlit-admin/app.py` 지정.
3. **Secrets** 입력: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, (옵션) `SUPABASE_DB_URL`.
4. 배포 → `https://<app>.streamlit.app`. "Who can view this app"을 비공개/지정으로 설정 권장.

---

## 4. 데이터 계층

### 4.1 기존 스키마 (이미 존재 — 대시보드가 다룬다)
- `products`(id, name, label_name, dose, focus, descr, detail, capacity, category, formats[], stock, price, image_url, sort_order, active)
- `inventory`(product_id, qty, low_stock_threshold, updated_at) — 트리거가 products.stock 라벨 자동 동기화
- `orders`(order_code, user_id, customer jsonb, items jsonb, address jsonb, meet, pay_pref, delivery, status, notes, notified, cancel_requested, courier, tracking_no, proof_url, total, created_at)
- `profiles`(id, name, phone, email, saved_address)
- `stock_movements`(id, product_id, delta, reason, note, order_code, created_at)
- Storage 버킷 `payment-proofs`(비공개)
- RPC: place_order / get_order_by_code / attach_payment_proof / request_cancellation
- 상태값: received·awaiting_payment·confirmed·preparing·shipped·delivered·cancelled·refunded
- 결제: gcash·cash·bank / 배송: courier·cod / 박스=낱개 10

### 4.2 신규 스키마 (대시보드용 — 추가 필요)
```sql
-- (A) 사이트 설정값을 DB에서 관리 (계좌/GCash/배송비/사업정보).
--     스토어프론트가 읽을 수 있게 공개 read. 쓰기는 service_role만.
create table if not exists public.settings (
  key   text primary key,
  value text
);
alter table public.settings enable row level security;
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select using (true);
insert into public.settings(key,value) values
  ('bank_account','XXX-XXX-XXXX'), ('gcash_number',''), ('gcash_name',''),
  ('shipping_fee','0'), ('whatsapp','821099182479'), ('low_stock_default','5'),
  ('announcement','')
on conflict (key) do nothing;

-- (B) 주문 상태 변경 감사 로그 (누가/언제/무엇을).
create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_code text not null,
  from_status text,
  to_status   text,
  changed_by  text,
  note        text,
  created_at  timestamptz not null default now()
);
alter table public.order_status_history enable row level security; -- 공개 정책 없음(관리자만)
```
- (선택) `settings`가 생기면 React 앱의 하드코딩 `BANK_ACCOUNT`·`WHATSAPP`을 settings에서 읽도록 전환(Phase 2).
- (선택) 주문 상태 변경 시 history를 남기는 트리거, 또는 대시보드에서 명시적으로 insert.

---

## 5. 페이지별 기능 명세 (멀티페이지)

### 5.1 🔐 로그인 게이트 (app.py)
- 비밀번호 입력 → 통과 시 사이드바 네비 노출. 실패 메시지·시도 제한·로그아웃 버튼.

### 5.2 📊 Overview (대시보드 홈)
- **KPI 카드**: 오늘/이번 주/이번 달 주문수·매출(상태별 합계), 평균 주문액, 신규 회원수.
- **처리 대기 알림**: `awaiting_payment` 건수, 영수증 미확인, `cancel_requested=YES` 건수, **저재고/품절** 상품.
- **빠른 차트**: 최근 14일 일별 주문/매출, 상태별 분포(funnel), 인기 상품 Top 5.
- 각 알림 → 해당 페이지로 딥링크.

### 5.3 🧾 Orders (핵심)
- **목록**: 필터(상태·배송·결제·기간·검색[코드/이름/이메일/전화]), 정렬, 페이지네이션.
- 컬럼: 주문코드, 일시(PH시간), 상태(색배지), 고객, 결제/배송, 합계, 요청(CANCEL/REFUND), 영수증 유무.
- **주문 상세(행 클릭/확장)**:
  - 품목(이름·포맷[Box of 10]·수량·금액), 합계.
  - 고객(이름/전화/이메일), 배송지(전체 주소), 메모(notes).
  - 결제수단, 송장번호, 진행 단계 타임라인(고객 화면과 동일 로직 재현).
  - **영수증 미리보기**: proof_url → signed URL로 이미지 표시 + 새 탭 열기.
- **액션**:
  - 상태 변경(드롭다운, 유효 전이만) → DB update + `order_status_history` 기록.
  - 송장번호 입력/수정. 택배사 변경.
  - 결제 확인(→ awaiting_payment → confirmed/payment received).
  - 취소 처리(→ cancelled), 환불 처리(→ refunded) + 환불 메모. (재고 복구 트리거 자동)
  - `cancel_requested` 해제(요청 반려).
  - WhatsApp 바로가기 링크(고객 번호로 `wa.me`), 이메일 mailto.
- **CSV 내보내기**(필터 적용분).

### 5.4 💳 Payments & Proofs
- `awaiting_payment` + 은행/지캐시 주문 큐.
- 업로드된 영수증 썸네일 그리드 → 클릭 확대.
- "결제확인" 버튼(→ confirmed). 영수증 없는 건 강조.

### 5.5 ↩️ Cancellations & Refunds
- `cancel_requested=YES` 큐(취소요청/환불요청 구분: 배송전=CANCEL, delivered=REFUND).
- 처리: 취소 승인(cancelled)·환불 완료(refunded)·반려. 환불액·메모 기록.
- 환불은 수동(GCash/계좌 이체)이므로 "환불 송금 완료" 체크 → refunded.

### 5.6 📦 Products (카탈로그 CRUD)
- 목록 + 추가/수정/비활성(active 토글; **삭제 대신 비활성** — 주문 이력 보존).
- 필드: name, label_name, dose, focus, descr, detail, capacity, category, formats(단일/박스 토글), price, sort_order, image.
- **이미지 업로드**: Storage(예: `product-images` 공개 버킷)로 업로드 → image_url 저장. (현재는 `/assets/*` 정적; 신규는 Storage 권장.)
- 박스 단가 미리보기(×10).

### 5.7 🏷️ Inventory
- 상품별 현재 수량·저재고 기준·상태 라벨.
- **재고 조정**: 입고(+)/조정(±) 입력 → inventory.qty 변경 + `stock_movements`에 사유 기록(restock/adjustment).
- 저재고/품절 강조, 일괄 입고.

### 5.8 📜 Stock Movements (이력)
- 전체 변동 내역(판매/입고/조정/취소복구) 필터(상품·사유·기간) + CSV.
- 상품별 재고 추이 차트.

### 5.9 👤 Customers
- 가입 회원(profiles) 목록 + 각자 주문 이력·총구매액.
- 게스트 주문도 이메일/전화 기준으로 묶어 보기(옵션).

### 5.10 📈 Reports / Analytics
- 기간별 매출/주문(일·주·월), 상품별·카테고리별 매출, 결제수단·배송수단 비중.
- 상태 퍼널(접수→결제→발송→완료), 취소·환불율, 평균 처리시간.
- 모든 표 CSV 내보내기.

### 5.11 ⚙️ Settings
- 계좌번호(bank_account), GCash 번호/이름, 배송비, WhatsApp 번호, 저재고 기본값, 공지문구.
- 저장 → `settings` 테이블 update. (스토어프론트가 이 값을 읽도록 Phase 2 연동)
- 비밀번호 변경 안내, 데이터 백업(내보내기) 버튼.

---

## 5.12 🎨 디자인 원칙 (확정)
- **모바일 우선**: 사장님이 휴대폰으로 본다 → `layout="centered"`(좁은 폭), 단일 컬럼 스택, 큰 표 대신 **주문 카드/expander**, 터치 친화적 버튼.
- **럭셔리 네이비/골드** (스토어와 통일): 배경 네이비(#020712/#07101C), 포인트 골드(#C8922A/#E7BD59), 본문 크림(#F3EBD7). 제목은 Cinzel, 본문 Inter.
- **심플하지만 다 있게**: 군더더기 없는 KPI 카드 + 상태 색배지, Streamlit 기본 메뉴/푸터 숨김, 섹션 명확.
- 구현: `.streamlit/config.toml` 테마 + `lib/ui.py`의 CSS 주입(폰트/카드/배지).

## 6. 공통 고려사항 (놓치기 쉬운 것)
- **시간대**: 모든 시각 **Asia/Manila**로 표시·집계.
- **금액**: PHP(₱), 천단위 콤마. 박스/낱개 구분 표시.
- **페이지네이션/성능**: orders·movements 많아질 때 limit/offset, 캐시(`st.cache_data` TTL).
- **signed URL 만료**: 영수증 보기용 단기 서명 URL 매번 생성.
- **상태 전이 검증**: 비논리적 전이 방지(예: delivered→awaiting_payment 막기). 전이표 정의.
- **동시 편집/낙관적 갱신**: 저장 전 최신값 재조회, 실패 시 안내.
- **에러 처리**: Supabase 다운/네트워크 오류 시 친절한 메시지, 부분 실패 롤백.
- **소프트 삭제**: 상품은 active=false (이력 보존). 주문은 삭제 금지(취소 상태 사용).
- **박스 환산**: 재고/매출 계산 시 박스=10 단위 일관.
- **모바일**: Streamlit 레이아웃 좁은 화면 대응(컬럼 wrap).
- **감사/추적**: 상태 변경 history, 변경자 표시.
- **백업**: 주기적 CSV/덤프 내보내기 안내.

---

## 7. Google Sheets와의 관계
- 대시보드를 **주 운영 도구**로, 시트는 보조(읽기 뷰)로 두기를 권장 — 둘 다 쓰면 같은 주문을 양쪽에서 바꿔 충돌 가능.
- 선택지: (a) 시트 편집 트리거 비활성화하고 읽기 전용 뷰로, (b) 시트 완전 은퇴, (c) 시트는 백업/내보내기 용도만.
- 결정 필요 → §11.

---

## 8. 프로젝트 구조
```
streamlit-admin/
  app.py                 # 진입점: 인증 게이트 + 네비
  pages/
    1_📊_Overview.py
    2_🧾_Orders.py
    3_💳_Payments.py
    4_↩️_Cancellations.py
    5_📦_Products.py
    6_🏷️_Inventory.py
    7_📜_Movements.py
    8_👤_Customers.py
    9_📈_Reports.py
    10_⚙️_Settings.py
  lib/
    db.py                # supabase 클라이언트(service_role), 쿼리 헬퍼
    auth.py              # 비밀번호 게이트, 세션
    storage.py           # signed URL, 이미지 업로드
    format.py            # ₱/날짜(PH)/상태배지/박스환산
    flow.py              # 상태 전이표, statusToStep 재현
  .streamlit/
    config.toml          # 테마(네이비/골드)
    secrets.toml         # (gitignore) 키/비번
  requirements.txt
  README.md
```

## 9. requirements.txt (안)
```
streamlit>=1.40
supabase>=2.7
pandas>=2.2
plotly>=5.24
python-dateutil
```

---

## 10. 빌드 단계 (로드맵)
- **Phase 0**: 신규 SQL(settings, order_status_history) 적용 + 저장소 스캐폴딩 + 인증 게이트 + DB 연결.
- **Phase 1 (MVP)**: Overview + Orders(상세·상태변경·영수증·송장) + Inventory + Products. → 실제 운영 가능.
- **Phase 2**: Payments / Cancellations·Refunds 전용 큐 + Settings(+스토어프론트가 settings 읽도록 연동).
- **Phase 3**: Customers + Reports/Analytics + CSV 내보내기 + 감사 로그 UI.
- **Phase 4**: 권한 고도화(OIDC/역할), 시트 은퇴, 백업 자동화.

---

## 11. 결정 사항 (확정됨 ✅)
1. **인증 방식**: ✅ **공용 비밀번호 1개** — `st.secrets["ADMIN_PASSWORD"]`, 세션 유지, 로그아웃 버튼. (한 번만 입력)
2. **배포처**: ✅ **Streamlit Community Cloud** (기본).
3. **시트 처리**: ✅ **대시보드로 일원화** — Apps Script 편집 트리거는 끄고 시트는 읽기/백업 용도로만(또는 은퇴).
4. **이미지 관리**: Storage 업로드로 전환(권장) — **Phase 2**. MVP는 기존 필드 편집 중심.
5. **설정 연동(settings → 스토어프론트)**: **Phase 2**.
6. **범위**: ✅ **MVP부터 단계적** — Phase 1 먼저.

---

## 12. 완료 체크리스트 ("뭐 하나 빠짐없게")
- [ ] 인증 게이트 + 세션 + 로그아웃
- [ ] service_role 키 Secrets 처리(깃 제외)
- [ ] Overview KPI/알림/차트
- [ ] 주문 목록 필터·검색·페이지네이션
- [ ] 주문 상세(품목/고객/주소/메모/타임라인)
- [ ] 영수증 signed URL 미리보기
- [ ] 상태 변경(전이 검증) + history 기록
- [ ] 송장번호/택배사 편집
- [ ] 결제 확인 큐
- [ ] 취소/환불 큐 + 처리 + 재고복구 확인
- [ ] cancel_requested 표시/해제
- [ ] 상품 CRUD(+이미지 업로드, active 토글)
- [ ] 재고 조정(+stock_movements 기록)
- [ ] 재고 이력/차트
- [ ] 고객 목록/주문이력
- [ ] 리포트/분석 + CSV
- [ ] 설정(계좌/GCash/배송비/WhatsApp/공지)
- [ ] PH 시간대·₱ 포맷·박스 환산 일관
- [ ] 에러 처리·캐시·성능
- [ ] 배포 + 접근제한 + README
