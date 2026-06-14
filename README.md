# HUHS Website

HUHS 한양대 프로그래밍 중앙 동아리 웹사이트입니다.

## 구조

- `web/client`: React/Vite 프론트엔드
- `web/server`: 프론트가 기본으로 사용하는 Express 통합 API 서버
- `api/login_api`: Rust 로그인/프로필 API
- `api/recruit_api`: Rust 지원/문의 API
- `api/reserve_api`: Rust 동아리방 예약 API

프론트 개발 서버는 기본적으로 `/api` 요청을 `web/server`의 Express 서버로 프록시합니다. Rust API들은 같은 SQLite DB와 Bearer 세션 토큰 계약을 공유하도록 맞춰져 있어 개별 서버로도 실행할 수 있습니다.

## 환경 변수

Google 로그인은 Google OAuth Client ID가 필요합니다.

`web/client/.env`

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

`web/server/.env`

```env
PORT=3000
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

`GOOGLE_CLIENT_ID`를 서버에도 넣어야 Google ID token의 audience를 검증할 수 있습니다. 로그인은 `hanyang.ac.kr` 도메인의 Google Workspace 계정만 허용합니다.

## 실행

```bash
cd web/server
npm install
npm run dev
```

```bash
cd web/client
npm install
npm run dev -- --host 0.0.0.0
```

기본 URL:

- Web: `http://localhost:5173`
- Express API: `http://localhost:3000`

## 주요 API 흐름

- `POST /api/auth/google`: Google ID token 로그인, 사용자 생성/조회, 세션 토큰 발급
- `GET /api/auth/me`: 현재 로그인 사용자 조회
- `PATCH /api/auth/profile`: 이름, 학번, 학과, 연락처 수정
- `GET /api/admin/users`: 관리자용 유저 목록 조회
- `PATCH /api/admin/users/:id/role`: 관리자용 유저 타입 변경
- `POST /api/recruit/apply`: 로그인 사용자 프로필을 자동으로 붙여 지원서 저장
- `GET /api/reservations`: 예약 목록 조회
- `POST /api/reservations`: 로그인 사용자 프로필을 자동으로 붙여 예약 저장

지원서와 예약은 로그인과 프로필 입력이 필요합니다. 프로필이 비어 있으면 프론트에서 `/profile`로 이동해 정보를 먼저 채우게 됩니다.

## 유저 타입

- `general`: 한양대 계정으로 처음 로그인한 일반 유저입니다. 사이트 열람과 동아리 가입 신청만 가능합니다.
- `member`: 관리자가 가입을 승인한 부원입니다. 동아리방 예약과 커뮤니티 글 작성이 가능합니다. 가입 신청 화면은 보이지 않습니다.
- `admin`: 관리자입니다. 다른 유저의 타입 변경, 활동 스터디/관리자 콘텐츠 작성, 부원이 가능한 작업을 모두 할 수 있습니다.

## Cloudflare 배포

프론트는 Cloudflare Pages에 올리고, API는 `web/client/functions/[[path]].js`의 Pages Functions로 실행합니다. 데이터베이스는 Cloudflare D1, 업로드 파일은 Cloudflare R2를 사용합니다.

### 1. Cloudflare 리소스 만들기

```bash
cd web/client
npx wrangler d1 create huhs-web
npx wrangler r2 bucket create huhs-web-uploads
```

D1 생성 결과에 나오는 `database_id`를 `web/client/wrangler.toml`의 `database_id`에 넣으세요.

### 2. D1 스키마 적용

```bash
cd web/client
npx wrangler d1 migrations apply huhs-web --remote
```

로컬에서 먼저 확인하려면 `--remote` 없이 실행할 수 있습니다.

### 3. Pages 환경 변수 설정

Cloudflare Dashboard > Workers & Pages > HUHS Pages 프로젝트 > Settings에서 아래 값을 넣으세요.

- `VITE_GOOGLE_CLIENT_ID`: 프론트에서 Google 로그인 버튼이 사용할 OAuth Client ID
- `GOOGLE_CLIENT_ID`: Pages Functions가 Google ID token의 audience를 검증할 OAuth Client ID

두 값은 보통 같은 값을 씁니다.

### 4. Pages 배포 설정

Cloudflare Pages에서 Git 저장소를 연결하고 아래처럼 설정합니다.

- Root directory: `web/client`
- Build command: `npm run build`
- Build output directory: `dist`

`web/client/wrangler.toml`에 D1 binding `DB`와 R2 binding `UPLOADS`가 정의되어 있어야 합니다.

### 5. 기존 SQLite 데이터 옮기기

기존 운영 데이터가 `web/server/data/huhsweb.sqlite`에 있다면 D1에 import해야 합니다. 새 사이트를 빈 DB로 시작해도 되면 이 단계는 생략할 수 있습니다.

주의: `sqlite3 .dump` 결과에는 `CREATE TABLE` 문이 포함됩니다. 이미 2번의 migration을 적용한 D1에 그대로 넣으면 테이블 생성문이 충돌할 수 있으니, 기존 데이터를 옮길 때는 full dump를 빈 D1에 먼저 넣거나 INSERT 문만 추출해서 import하세요.

```bash
sqlite3 ../server/data/huhsweb.sqlite .dump > huhsweb_dump.sql
npx wrangler d1 execute huhs-web --remote --file huhsweb_dump.sql
```

로컬 업로드 파일이 `web/server/uploads`에 있다면 R2에 따로 업로드해야 합니다. 새 사이트에서 새로 업로드할 파일만 쓰면 이 단계도 생략할 수 있습니다.

## 개별 Rust API 실행

세 Rust API는 기본적으로 `../../web/server/data/huhsweb.sqlite`를 사용합니다. 다른 DB 파일을 쓰려면 `DATABASE_PATH`를 지정하세요.

```bash
cd api/login_api
DATABASE_PATH=../../web/server/data/huhsweb.sqlite GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com cargo run
```

```bash
cd api/recruit_api
DATABASE_PATH=../../web/server/data/huhsweb.sqlite cargo run
```

```bash
cd api/reserve_api
DATABASE_PATH=../../web/server/data/huhsweb.sqlite cargo run
```
