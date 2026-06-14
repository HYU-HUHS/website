CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  gid TEXT UNIQUE,
  name TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  major TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  picture_url TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  image_url TEXT,
  image_urls TEXT,
  user_id TEXT,
  author_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  caption TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS club_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vision_desc TEXT,
  member_count INTEGER,
  project_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS club_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_number TEXT,
  title TEXT,
  content TEXT,
  "order" INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS club_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER,
  month INTEGER,
  title TEXT,
  description TEXT,
  is_highlight INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  role TEXT,
  description TEXT,
  group_name TEXT,
  image_url TEXT,
  "order" INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT,
  answer TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  summary TEXT,
  description TEXT,
  thumbnail_url TEXT,
  status TEXT,
  study_type TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  file_name TEXT,
  file_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  role TEXT,
  name TEXT,
  student_id TEXT,
  major TEXT,
  phone TEXT,
  picture_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applicants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  student_id TEXT,
  major TEXT,
  phone TEXT,
  email TEXT,
  message TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  contact TEXT,
  is_answered INTEGER,
  answer TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT,
  name TEXT,
  reserved_at TEXT,
  participant_count INTEGER,
  purpose TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_tokens_user_id ON session_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_posts_author_email ON posts(author_email);
CREATE INDEX IF NOT EXISTS idx_reservations_reserved_at ON reservations(reserved_at);

INSERT INTO club_info (vision_desc, member_count, project_count)
SELECT 'HUHS는 실전 프로젝트 중심의 개발 동아리입니다. 기획부터 배포까지 함께 완성하며 성장합니다.', 50, 12
WHERE NOT EXISTS (SELECT 1 FROM club_info);

INSERT INTO club_rules (article_number, title, content, "order")
SELECT '제1조', '목적', '본 회칙은 동아리의 원활한 운영과 회원 간 협력을 목적으로 합니다.', 1
WHERE NOT EXISTS (SELECT 1 FROM club_rules);

INSERT INTO club_rules (article_number, title, content, "order")
SELECT '제2조', '회원', '회원은 동아리 활동에 성실히 참여하고 서로를 존중합니다.', 2
WHERE NOT EXISTS (SELECT 1 FROM club_rules WHERE article_number = '제2조');

INSERT INTO faqs (question, answer)
SELECT '가입 신청은 어떻게 하나요?', '모집 기간에 안내되는 신청 폼을 통해 지원할 수 있습니다.'
WHERE NOT EXISTS (SELECT 1 FROM faqs);

INSERT INTO faqs (question, answer)
SELECT '초보자도 참여할 수 있나요?', '네. 입문자를 위한 스터디와 멘토링을 함께 운영합니다.'
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = '초보자도 참여할 수 있나요?');

INSERT INTO members (name, role, description, "order")
SELECT '운영진', 'President', 'HUHS 운영을 맡고 있습니다.', 1
WHERE NOT EXISTS (SELECT 1 FROM members);
