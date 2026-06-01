import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
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
  profiles: ['email', 'role'],
  admin_users: ['email'],
};

const jsonColumns = new Set(['image_urls']);
const booleanColumns = new Set(['is_highlight']);

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
    if (column in next) next[column] = Boolean(next[column]);
  }
  return next;
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

const initDb = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const [table, columns] of Object.entries(tables)) {
    const definitions = columns.map((column) => {
      if (column === 'order') return '"order" INTEGER';
      if (column === 'year' || column === 'month' || column === 'member_count' || column === 'project_count') return `"${column}" INTEGER`;
      return `"${column}" TEXT`;
    });
    await run(`
      CREATE TABLE IF NOT EXISTS "${table}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${definitions.join(',\n        ')},
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
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
    await insertRows('profiles', [{ id: result.id, email, role: isFirstUser ? 'admin' : 'member' }]);
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
    res.json({ data: { session: { user }, user } });
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
    if (!where.sql) return res.status(400).json({ error: 'Delete requires a filter' });
    await run(`DELETE FROM "${table}"${where.sql}`, where.params);
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/storage/:bucket/upload', upload.single('file'), async (req, res, next) => {
  try {
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
