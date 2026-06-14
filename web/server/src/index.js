import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import sqlite3 from 'sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const uploadDir = path.join(rootDir, 'uploads');

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database(process.env.DATABASE_PATH || path.join(dataDir, 'huhsweb.sqlite'));
const upload = multer({ storage: multer.memoryStorage() });

const tables = {
  posts: ['title', 'content', 'image_url', 'image_urls', 'user_id', 'author_email'],
  photos: ['url', 'caption'],
  schedules: ['title', 'date'],
  club_info: ['vision_desc', 'member_count', 'project_count'],
  club_rules: ['article_number', 'title', 'content', 'order'],
  club_history: ['year', 'month', 'title', 'description', 'is_highlight'],
  members: ['name', 'role', 'description', 'group_name', 'image_url', 'order'],
  faqs: ['question', 'answer'],
  study_groups: ['title', 'summary', 'description', 'thumbnail_url', 'status', 'study_type'],
  study_materials: ['title', 'description', 'file_name', 'file_url'],
  profiles: ['email', 'role', 'name', 'student_id', 'major', 'phone', 'picture_url'],
  admin_users: ['email'],
  applicants: ['name', 'student_id', 'major', 'phone', 'email', 'message', 'status'],
  inquiries: ['title', 'content', 'contact', 'is_answered', 'answer'],
  reservations: ['student_id', 'name', 'reserved_at', 'participant_count', 'purpose', 'status'],
};

const jsonColumns = new Set(['image_urls']);
const booleanColumns = new Set(['is_highlight', 'is_answered']);
const USER_PROFILE_COLUMNS = ['name', 'student_id', 'major', 'phone'];
const HANYANG_DOMAIN = 'hanyang.ac.kr';
const ROLES = new Set(['general', 'member', 'admin']);
const ADMIN_WRITE_TABLES = new Set([
  'admin_users',
  'profiles',
  'club_info',
  'club_rules',
  'club_history',
  'members',
  'faqs',
  'study_groups',
  'study_materials',
  'photos',
  'schedules',
]);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });

const normalizeValue = (column, value) => {
  if (jsonColumns.has(column)) return JSON.stringify(value ?? []);
  if (booleanColumns.has(column)) return value ? 1 : 0;
  return value ?? null;
};

const inflateRow = (row) => {
  if (!row) return row;
  const next = { ...row };
  for (const column of jsonColumns) {
    if (column in next) {
      try {
        next[column] = next[column] ? JSON.parse(next[column]) : [];
      } catch {
        next[column] = [];
      }
    }
  }
  for (const column of booleanColumns) {
    if (column in next) next[column] = next[column] === true || next[column] === 1 || next[column] === '1';
  }
  return next;
};

const publicUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    gid: user.gid,
    name: user.name || '',
    student_id: user.student_id || '',
    major: user.major || '',
    phone: user.phone || '',
    picture_url: user.picture_url || '',
    role: user.role || 'general',
  };
};

const createSession = async (userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  await run('INSERT INTO session_tokens (token, user_id) VALUES (?, ?)', [token, userId]);
  return token;
};

const findUserByToken = async (token) => {
  if (!token) return null;
  return get(
    `SELECT users.id, users.email, users.gid, users.name, users.student_id, users.major, users.phone, users.picture_url,
            COALESCE(profiles.role, 'general') AS role
       FROM session_tokens
       JOIN users ON users.id = session_tokens.user_id
       LEFT JOIN profiles ON profiles.email = users.email
      WHERE session_tokens.token = ?`,
    [token],
  );
};

const authUser = async (req) => {
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return findUserByToken(token);
};

const requireUser = async (req, res) => {
  const user = await authUser(req);
  if (!user) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return null;
  }
  return user;
};

const hasRole = (user, roles) => roles.includes(user?.role || 'general');

const requireRole = async (req, res, roles) => {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!hasRole(user, roles)) {
    res.status(403).json({ error: '권한이 없습니다.' });
    return null;
  }
  return user;
};

const requireTableWriteAccess = async (req, res, table) => {
  if (table === 'posts') return requireRole(req, res, ['member', 'admin']);
  if (ADMIN_WRITE_TABLES.has(table)) return requireRole(req, res, ['admin']);
  return null;
};

const postIdFromFilters = (filters = []) => {
  if (!Array.isArray(filters)) return null;
  const filter = filters.find(({ column }) => column === 'id');
  return filter?.value ?? null;
};

const canManagePost = (user, post) => {
  if (!user || !post) return false;
  if (user.role === 'admin') return true;
  return String(post.author_email || '').toLowerCase() === String(user.email || '').toLowerCase()
    || String(post.user_id || '') === String(user.id || '');
};

const requirePostOwnerOrAdmin = async (req, res, filters = []) => {
  const user = await requireRole(req, res, ['member', 'admin']);
  if (!user) return null;
  const postId = postIdFromFilters(filters);
  if (!postId) {
    res.status(400).json({ error: '게시글 수정/삭제에는 id 필터가 필요합니다.' });
    return null;
  }
  const post = await get('SELECT * FROM posts WHERE id = ?', [postId]);
  if (!post) {
    res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
    return null;
  }
  if (!canManagePost(user, post)) {
    res.status(403).json({ error: '본인이 작성한 글만 수정/삭제할 수 있습니다.' });
    return null;
  }
  return { user, post };
};

const ensureProfileComplete = (user, res) => {
  const missing = USER_PROFILE_COLUMNS.filter((column) => !String(user[column] || '').trim());
  if (missing.length > 0) {
    res.status(422).json({
      error: '프로필 정보를 먼저 입력해주세요.',
      missing,
      user: publicUser(user),
    });
    return false;
  }
  return true;
};

const verifyGoogleCredential = async (credential) => {
  if (!credential) {
    const error = new Error('Google 로그인 정보가 없습니다.');
    error.status = 400;
    throw error;
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error_description || 'Google 로그인 검증에 실패했습니다.');
    error.status = 401;
    throw error;
  }

  const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (expectedClientId && payload.aud !== expectedClientId) {
    const error = new Error('허용되지 않은 Google 클라이언트입니다.');
    error.status = 401;
    throw error;
  }

  const email = String(payload.email || '').toLowerCase();
  const hostedDomain = String(payload.hd || '').toLowerCase();
  if (payload.email_verified !== 'true' || !email.endsWith(`@${HANYANG_DOMAIN}`) || hostedDomain !== HANYANG_DOMAIN) {
    const error = new Error('한양대학교 hanyang.ac.kr 계정으로만 로그인할 수 있습니다.');
    error.status = 403;
    throw error;
  }

  return {
    gid: payload.sub,
    email,
    name: payload.name || '',
    picture_url: payload.picture || '',
  };
};

const assertTable = (table) => {
  if (!tables[table]) {
    const error = new Error(`Unknown table: ${table}`);
    error.status = 404;
    throw error;
  }
};

const whereClause = (filters = []) => {
  if (!Array.isArray(filters) || filters.length === 0) return { sql: '', params: [] };
  const parts = filters.map(({ column }) => `"${column}" = ?`);
  const params = filters.map(({ column, value }) => normalizeValue(column, value));
  return { sql: ` WHERE ${parts.join(' AND ')}`, params };
};

const columnType = (column) => {
  if (booleanColumns.has(column)) return 'INTEGER';
  if (column === 'order') return 'INTEGER';
  if (
    column === 'year' ||
    column === 'month' ||
    column === 'member_count' ||
    column === 'project_count' ||
    column === 'participant_count'
  ) return 'INTEGER';
  return 'TEXT';
};

const initDb = async () => {
  await run(`
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
    )
  `);

  const userColumns = await all('PRAGMA table_info("users")');
  const userColumnNames = new Set(userColumns.map((column) => column.name));
  for (const [column, type] of [
    ['password', 'TEXT'],
    ['gid', 'TEXT'],
    ['name', 'TEXT DEFAULT ""'],
    ['student_id', 'TEXT DEFAULT ""'],
    ['major', 'TEXT DEFAULT ""'],
    ['phone', 'TEXT DEFAULT ""'],
    ['picture_url', 'TEXT DEFAULT ""'],
  ]) {
    if (!userColumnNames.has(column)) await run(`ALTER TABLE users ADD COLUMN ${column} ${type}`);
  }

  await run(`
    CREATE TABLE IF NOT EXISTS session_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  const adminRows = await all('SELECT email FROM admin_users').catch(() => []);
  for (const row of adminRows) {
    await run('UPDATE profiles SET role = ? WHERE email = ?', ['admin', row.email]);
  }

  for (const [table, columns] of Object.entries(tables)) {
    const definitions = columns.map((column) => `"${column}" ${columnType(column)}`);
    await run(`
      CREATE TABLE IF NOT EXISTS "${table}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${definitions.join(',\n        ')},
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const existingColumns = await all(`PRAGMA table_info("${table}")`);
    const existingColumnNames = new Set(existingColumns.map((column) => column.name));
    for (const column of columns) {
      if (!existingColumnNames.has(column)) {
        await run(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${columnType(column)}`);
      }
    }
  }

  await seedDefaults();
};

const seedIfEmpty = async (table, rows) => {
  const row = await get(`SELECT COUNT(*) AS count FROM "${table}"`);
  if (row.count > 0) return;
  for (const item of rows) {
    await insertRows(table, [item]);
  }
};

const seedDefaults = async () => {
  await seedIfEmpty('club_info', [{
    vision_desc: 'HUHS는 실전 프로젝트 중심의 개발 동아리입니다. 기획부터 배포까지 함께 완성하며 성장합니다.',
    member_count: 50,
    project_count: 12,
  }]);
  await seedIfEmpty('club_rules', [
    { article_number: '제1조', title: '목적', content: '본 회칙은 동아리의 원활한 운영과 회원 간 협력을 목적으로 합니다.', order: 1 },
    { article_number: '제2조', title: '회원', content: '회원은 동아리 활동에 성실히 참여하고 서로를 존중합니다.', order: 2 },
  ]);
  await seedIfEmpty('faqs', [
    { question: '가입 신청은 어떻게 하나요?', answer: '모집 기간에 안내되는 신청 폼을 통해 지원할 수 있습니다.' },
    { question: '초보자도 참여할 수 있나요?', answer: '네. 입문자를 위한 스터디와 멘토링을 함께 운영합니다.' },
  ]);
  await seedIfEmpty('members', [
    { name: '운영진', role: 'President', description: 'HUHS 운영을 맡고 있습니다.', order: 1 },
  ]);
};

const insertRows = async (table, rows) => {
  assertTable(table);
  const allowed = tables[table];
  const inserted = [];
  for (const row of rows) {
    const columns = Object.keys(row).filter((column) => allowed.includes(column) || column === 'id');
    if (columns.length === 0) continue;
    const placeholders = columns.map(() => '?').join(', ');
    const params = columns.map((column) => normalizeValue(column, row[column]));
    const result = await run(
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${placeholders})`,
      params,
    );
    inserted.push(inflateRow(await get(`SELECT * FROM "${table}" WHERE id = ?`, [result.id])));
  }
  return inserted;
};

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Express server is running' });
});

app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const userCount = await get('SELECT COUNT(*) AS count FROM users');
    const isFirstUser = userCount.count === 0;
    const result = await run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password]);
    await insertRows('profiles', [{ id: result.id, email, role: isFirstUser ? 'admin' : 'general' }]);
    if (isFirstUser) await insertRows('admin_users', [{ email }]);
    res.status(201).json({ data: { user: { id: result.id, email } } });
  } catch (error) {
    if (error.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already registered email' });
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await get('SELECT id, email FROM users WHERE email = ? AND password = ?', [email, password]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const accessToken = await createSession(user.id);
    res.json({ data: { session: { access_token: accessToken, user }, user } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/google', async (req, res, next) => {
  try {
    const googleUser = await verifyGoogleCredential(req.body.credential);
    let user = await get('SELECT * FROM users WHERE gid = ? OR email = ?', [googleUser.gid, googleUser.email]);

    if (!user) {
      const userCount = await get('SELECT COUNT(*) AS count FROM users');
      const isFirstUser = userCount.count === 0;
      const result = await run(
        'INSERT INTO users (email, password, gid, name, picture_url) VALUES (?, ?, ?, ?, ?)',
        [googleUser.email, '', googleUser.gid, googleUser.name, googleUser.picture_url],
      );
      await insertRows('profiles', [{
        id: result.id,
        email: googleUser.email,
        role: isFirstUser ? 'admin' : 'general',
        name: googleUser.name,
        picture_url: googleUser.picture_url,
      }]);
      if (isFirstUser) await insertRows('admin_users', [{ email: googleUser.email }]);
    } else {
      await run(
        `UPDATE users
            SET gid = COALESCE(gid, ?),
                name = CASE WHEN name IS NULL OR name = '' THEN ? ELSE name END,
                picture_url = CASE WHEN picture_url IS NULL OR picture_url = '' THEN ? ELSE picture_url END
          WHERE id = ?`,
        [googleUser.gid, googleUser.name, googleUser.picture_url, user.id],
      );
      const profile = await get('SELECT id FROM profiles WHERE email = ?', [googleUser.email]);
      if (!profile) {
        await insertRows('profiles', [{
          id: user.id,
          email: googleUser.email,
          role: 'general',
          name: googleUser.name,
          picture_url: googleUser.picture_url,
        }]);
      }
    }

    user = await get(
      `SELECT users.id, users.email, users.gid, users.name, users.student_id, users.major, users.phone, users.picture_url,
              COALESCE(profiles.role, 'general') AS role
         FROM users
         LEFT JOIN profiles ON profiles.email = users.email
        WHERE users.email = ?`,
      [googleUser.email],
    );
    const accessToken = await createSession(user.id);
    const data = { session: { access_token: accessToken, user: publicUser(user) }, user: publicUser(user) };
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ data: { user: publicUser(user) } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', async (req, res, next) => {
  try {
    const admin = await requireRole(req, res, ['admin']);
    if (!admin) return;
    const rows = await all(`
      SELECT profiles.*, users.gid, users.picture_url
      FROM profiles
      LEFT JOIN users ON users.email = profiles.email
      ORDER BY profiles.created_at DESC, profiles.id DESC
    `);
    res.json({ data: rows.map(inflateRow) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/users/:id/role', async (req, res, next) => {
  try {
    const admin = await requireRole(req, res, ['admin']);
    if (!admin) return;
    const role = String(req.body.role || '').trim();
    if (!ROLES.has(role)) return res.status(400).json({ error: '알 수 없는 유저 타입입니다.' });

    const target = await get('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
    if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    if (target.email === admin.email && role !== 'admin') {
      return res.status(400).json({ error: '자기 자신의 관리자 권한은 해제할 수 없습니다.' });
    }

    await run('UPDATE profiles SET role = ? WHERE id = ?', [role, req.params.id]);
    if (role === 'admin') {
      const exists = await get('SELECT id FROM admin_users WHERE email = ?', [target.email]);
      if (!exists) await insertRows('admin_users', [{ email: target.email }]);
    } else {
      await run('DELETE FROM admin_users WHERE email = ?', [target.email]);
    }

    const updated = await get('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/auth/profile', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const values = {
      name: String(req.body.name || '').trim(),
      student_id: String(req.body.student_id || '').trim(),
      major: String(req.body.major || '').trim(),
      phone: String(req.body.phone || '').trim(),
    };
    if (!values.name || !values.student_id || !values.major || !values.phone) {
      return res.status(400).json({ error: '이름, 학번, 학과, 연락처를 모두 입력해주세요.' });
    }
    await run(
      'UPDATE users SET name = ?, student_id = ?, major = ?, phone = ? WHERE id = ?',
      [values.name, values.student_id, values.major, values.phone, user.id],
    );
    await run(
      `UPDATE profiles
          SET name = ?, student_id = ?, major = ?, phone = ?, picture_url = ?
        WHERE email = ?`,
      [values.name, values.student_id, values.major, values.phone, user.picture_url || '', user.email],
    );
    const updated = await findUserByToken((req.get('authorization') || '').slice(7));
    res.json({ data: { user: publicUser(updated) } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/recruit/apply', async (req, res, next) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (user.role !== 'general') return res.status(403).json({ error: '가입 신청은 일반 유저만 사용할 수 있습니다.' });
    if (!ensureProfileComplete(user, res)) return;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: '지원 동기를 입력해주세요.' });
    const data = await insertRows('applicants', [{
      name: user.name,
      student_id: user.student_id,
      major: user.major,
      phone: user.phone,
      email: user.email,
      message,
      status: 'submitted',
    }]);
    res.status(201).json({ status: 'success', message: '지원서 접수가 완료되었습니다.', data: data[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/recruit/inquiry', async (req, res, next) => {
  try {
    const { title, content, contact } = req.body;
    if (!title || !content || !contact) {
      return res.status(400).json({ error: '문의 제목, 내용, 연락처를 모두 입력해주세요.' });
    }
    const data = await insertRows('inquiries', [{
      title,
      content,
      contact,
      is_answered: false,
      answer: '',
    }]);
    res.status(201).json({ status: 'success', message: '문의사항이 등록되었습니다.', data: data[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reservations', async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM reservations ORDER BY reserved_at ASC, id ASC');
    res.json({ data: rows.map(inflateRow) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reservations', async (req, res, next) => {
  try {
    const user = await requireRole(req, res, ['member', 'admin']);
    if (!user) return;
    if (!ensureProfileComplete(user, res)) return;
    const { reserved_at, participant_count, purpose } = req.body;
    if (!reserved_at || !participant_count) return res.status(400).json({ error: '예약 시간과 사용 인원을 입력해주세요.' });
    const existing = await get(
      "SELECT id FROM reservations WHERE reserved_at = ? AND status != 'cancelled'",
      [reserved_at],
    );
    if (existing) return res.status(409).json({ error: '이미 예약된 시간입니다.' });
    const data = await insertRows('reservations', [{
      student_id: user.student_id,
      name: user.name,
      reserved_at,
      participant_count,
      purpose: purpose || '',
      status: 'reserved',
    }]);
    res.status(201).json({ data: data[0], message: '동아리방 예약이 완료되었습니다.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/tables/:table', async (req, res, next) => {
  try {
    const { table } = req.params;
    assertTable(table);
    const filters = req.query.filters ? JSON.parse(req.query.filters) : [];
    const orders = req.query.order ? JSON.parse(req.query.order) : [];
    const limit = Number(req.query.limit || 0);
    const single = req.query.single === 'true';
    const where = whereClause(filters);
    const orderSql = Array.isArray(orders) && orders.length
      ? ` ORDER BY ${orders.map(({ column, ascending }) => `"${column}" ${ascending ? 'ASC' : 'DESC'}`).join(', ')}`
      : '';
    const limitSql = limit ? ` LIMIT ${limit}` : '';
    const rows = await all(`SELECT * FROM "${table}"${where.sql}${orderSql}${limitSql}`, where.params);
    const data = rows.map(inflateRow);
    res.json({ data: single ? data[0] || null : data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/tables/:table', async (req, res, next) => {
  try {
    const guarded = await requireTableWriteAccess(req, res, req.params.table);
    if ((req.params.table === 'posts' || ADMIN_WRITE_TABLES.has(req.params.table)) && !guarded) return;
    if (req.params.table === 'posts') {
      req.body.rows = (req.body.rows || []).map((row) => ({
        ...row,
        user_id: guarded.id,
        author_email: guarded.email,
      }));
    }
    const data = await insertRows(req.params.table, req.body.rows || []);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/tables/:table', async (req, res, next) => {
  try {
    const { table } = req.params;
    assertTable(table);
    if (table === 'posts') {
      const guarded = await requirePostOwnerOrAdmin(req, res, req.body.filters || []);
      if (!guarded) return;
      if (guarded.user.role !== 'admin') {
        const allowedPostColumns = new Set(['title', 'content', 'image_url', 'image_urls']);
        req.body.values = Object.fromEntries(
          Object.entries(req.body.values || {}).filter(([column]) => allowedPostColumns.has(column)),
        );
      }
    } else {
      const guarded = await requireTableWriteAccess(req, res, table);
      if (ADMIN_WRITE_TABLES.has(table) && !guarded) return;
    }
    const values = req.body.values || {};
    const columns = Object.keys(values).filter((column) => tables[table].includes(column) || column === 'id');
    if (!columns.length) return res.json({ data: [] });
    const setSql = columns.map((column) => `"${column}" = ?`).join(', ');
    const setParams = columns.map((column) => normalizeValue(column, values[column]));
    const where = whereClause(req.body.filters || []);
    await run(`UPDATE "${table}" SET ${setSql}${where.sql}`, [...setParams, ...where.params]);
    const rows = await all(`SELECT * FROM "${table}"${where.sql}`, where.params);
    res.json({ data: rows.map(inflateRow) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/tables/:table', async (req, res, next) => {
  try {
    const { table } = req.params;
    assertTable(table);
    const where = whereClause(req.body.filters || []);
    if (table === 'posts') {
      const guarded = await requirePostOwnerOrAdmin(req, res, req.body.filters || []);
      if (!guarded) return;
    } else {
      const guarded = await requireTableWriteAccess(req, res, table);
      if (ADMIN_WRITE_TABLES.has(table) && !guarded) return;
    }
    if (!where.sql) return res.status(400).json({ error: 'Delete requires a filter' });
    await run(`DELETE FROM "${table}"${where.sql}`, where.params);
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/storage/:bucket/upload', upload.single('file'), async (req, res, next) => {
  try {
    const user = await requireRole(req, res, ['member', 'admin']);
    if (!user) return;
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    const bucketDir = path.join(uploadDir, req.params.bucket);
    const relativePath = req.body.path || req.file.originalname;
    const target = path.join(bucketDir, relativePath);
    if (path.relative(bucketDir, target).startsWith('..')) return res.status(400).json({ error: 'Invalid path' });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, req.file.buffer);
    res.status(201).json({ data: { path: relativePath } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/storage/:bucket/remove', async (req, res, next) => {
  try {
    const user = await requireRole(req, res, ['member', 'admin']);
    if (!user) return;
    const bucketDir = path.join(uploadDir, req.params.bucket);
    for (const relativePath of req.body.paths || []) {
      const target = path.join(bucketDir, relativePath);
      if (!path.relative(bucketDir, target).startsWith('..') && fs.existsSync(target)) fs.unlinkSync(target);
    }
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
});

await initDb();

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
