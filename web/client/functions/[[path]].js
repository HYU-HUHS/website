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
const userProfileColumns = ['name', 'student_id', 'major', 'phone'];
const hanyangDomain = 'hanyang.ac.kr';
const roles = new Set(['general', 'member', 'admin']);
const adminWriteTables = new Set([
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

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    ...headers,
  },
});

const errorResponse = (error) => {
  console.error(error);
  return json({ error: error.message || 'Internal server error' }, error.status || 500);
};

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

const assertTable = (table) => {
  if (!tables[table]) {
    const error = new Error(`Unknown table: ${table}`);
    error.status = 404;
    throw error;
  }
};

const assertColumn = (table, column) => {
  if (column !== 'id' && column !== 'created_at' && !tables[table]?.includes(column)) {
    const error = new Error(`Unknown column: ${column}`);
    error.status = 400;
    throw error;
  }
};

const bind = (stmt, params = []) => (params.length ? stmt.bind(...params) : stmt);

const run = async (db, sql, params = []) => bind(db.prepare(sql), params).run();
const all = async (db, sql, params = []) => {
  const result = await bind(db.prepare(sql), params).all();
  return result.results || [];
};
const get = async (db, sql, params = []) => bind(db.prepare(sql), params).first();

const whereClause = (table, filters = []) => {
  if (!Array.isArray(filters) || filters.length === 0) return { sql: '', params: [] };
  const parts = filters.map(({ column }) => {
    assertColumn(table, column);
    return `"${column}" = ?`;
  });
  const params = filters.map(({ column, value }) => normalizeValue(column, value));
  return { sql: ` WHERE ${parts.join(' AND ')}`, params };
};

const randomHex = (bytes = 32) => {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(2, '0')).join('');
};

const createSession = async (env, userId) => {
  const token = randomHex();
  await run(env.DB, 'INSERT INTO session_tokens (token, user_id) VALUES (?, ?)', [token, userId]);
  return token;
};

const findUserByToken = async (env, token) => {
  if (!token) return null;
  return get(
    env.DB,
    `SELECT users.id, users.email, users.gid, users.name, users.student_id, users.major, users.phone, users.picture_url,
            COALESCE(profiles.role, 'general') AS role
       FROM session_tokens
       JOIN users ON users.id = session_tokens.user_id
       LEFT JOIN profiles ON profiles.email = users.email
      WHERE session_tokens.token = ?`,
    [token],
  );
};

const authUser = async (request, env) => {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return findUserByToken(env, token);
};

const requireUser = async (request, env) => {
  const user = await authUser(request, env);
  if (!user) {
    const error = new Error('로그인이 필요합니다.');
    error.status = 401;
    throw error;
  }
  return user;
};

const requireRole = async (request, env, allowedRoles) => {
  const user = await requireUser(request, env);
  if (!allowedRoles.includes(user.role || 'general')) {
    const error = new Error('권한이 없습니다.');
    error.status = 403;
    throw error;
  }
  return user;
};

const requireTableWriteAccess = async (request, env, table) => {
  if (table === 'posts') return requireRole(request, env, ['member', 'admin']);
  if (adminWriteTables.has(table)) return requireRole(request, env, ['admin']);
  return null;
};

const postIdFromFilters = (filters = []) => {
  if (!Array.isArray(filters)) return null;
  return filters.find(({ column }) => column === 'id')?.value ?? null;
};

const canManagePost = (user, post) => {
  if (!user || !post) return false;
  if (user.role === 'admin') return true;
  return String(post.author_email || '').toLowerCase() === String(user.email || '').toLowerCase()
    || String(post.user_id || '') === String(user.id || '');
};

const requirePostOwnerOrAdmin = async (request, env, filters = []) => {
  const user = await requireRole(request, env, ['member', 'admin']);
  const postId = postIdFromFilters(filters);
  if (!postId) {
    const error = new Error('게시글 수정/삭제에는 id 필터가 필요합니다.');
    error.status = 400;
    throw error;
  }
  const post = await get(env.DB, 'SELECT * FROM posts WHERE id = ?', [postId]);
  if (!post) {
    const error = new Error('게시글을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }
  if (!canManagePost(user, post)) {
    const error = new Error('본인이 작성한 글만 수정/삭제할 수 있습니다.');
    error.status = 403;
    throw error;
  }
  return { user, post };
};

const ensureProfileComplete = (user) => {
  const missing = userProfileColumns.filter((column) => !String(user[column] || '').trim());
  if (missing.length > 0) {
    const error = new Error('프로필 정보를 먼저 입력해주세요.');
    error.status = 422;
    error.body = { missing, user: publicUser(user) };
    throw error;
  }
};

const verifyGoogleCredential = async (credential, env) => {
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

  const expectedClientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID;
  if (expectedClientId && payload.aud !== expectedClientId) {
    const error = new Error('허용되지 않은 Google 클라이언트입니다.');
    error.status = 401;
    throw error;
  }

  const email = String(payload.email || '').toLowerCase();
  const hostedDomain = String(payload.hd || '').toLowerCase();
  if (payload.email_verified !== 'true' || !email.endsWith(`@${hanyangDomain}`) || hostedDomain !== hanyangDomain) {
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

const insertRows = async (env, table, rows) => {
  assertTable(table);
  const allowed = tables[table];
  const inserted = [];
  for (const row of rows) {
    const columns = Object.keys(row).filter((column) => allowed.includes(column) || column === 'id');
    if (columns.length === 0) continue;
    const placeholders = columns.map(() => '?').join(', ');
    const params = columns.map((column) => normalizeValue(column, row[column]));
    const result = await run(
      env.DB,
      `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${placeholders})`,
      params,
    );
    const id = result.meta?.last_row_id || row.id;
    inserted.push(inflateRow(await get(env.DB, `SELECT * FROM "${table}" WHERE id = ?`, [id])));
  }
  return inserted;
};

const readJson = async (request) => request.json().catch(() => ({}));

const handleSignup = async (request, env) => {
  const { email, password } = await readJson(request);
  if (!email || !password) return json({ error: 'Email and password are required' }, 400);
  try {
    const userCount = await get(env.DB, 'SELECT COUNT(*) AS count FROM users');
    const isFirstUser = userCount.count === 0;
    const result = await run(env.DB, 'INSERT INTO users (email, password) VALUES (?, ?)', [email, password]);
    const id = result.meta?.last_row_id;
    await insertRows(env, 'profiles', [{ id, email, role: isFirstUser ? 'admin' : 'general' }]);
    if (isFirstUser) await insertRows(env, 'admin_users', [{ email }]);
    return json({ data: { user: { id, email } } }, 201);
  } catch (error) {
    if (error.message.includes('UNIQUE')) return json({ error: 'Already registered email' }, 409);
    throw error;
  }
};

const handleLogin = async (request, env) => {
  const { email, password } = await readJson(request);
  const user = await get(env.DB, 'SELECT id, email FROM users WHERE email = ? AND password = ?', [email, password]);
  if (!user) return json({ error: 'Invalid email or password' }, 401);
  const accessToken = await createSession(env, user.id);
  return json({ data: { session: { access_token: accessToken, user }, user } });
};

const handleGoogleLogin = async (request, env) => {
  const body = await readJson(request);
  const googleUser = await verifyGoogleCredential(body.credential, env);
  let user = await get(env.DB, 'SELECT * FROM users WHERE gid = ? OR email = ?', [googleUser.gid, googleUser.email]);

  if (!user) {
    const userCount = await get(env.DB, 'SELECT COUNT(*) AS count FROM users');
    const isFirstUser = userCount.count === 0;
    const result = await run(
      env.DB,
      'INSERT INTO users (email, password, gid, name, picture_url) VALUES (?, ?, ?, ?, ?)',
      [googleUser.email, '', googleUser.gid, googleUser.name, googleUser.picture_url],
    );
    const id = result.meta?.last_row_id;
    await insertRows(env, 'profiles', [{
      id,
      email: googleUser.email,
      role: isFirstUser ? 'admin' : 'general',
      name: googleUser.name,
      picture_url: googleUser.picture_url,
    }]);
    if (isFirstUser) await insertRows(env, 'admin_users', [{ email: googleUser.email }]);
  } else {
    await run(
      env.DB,
      `UPDATE users
          SET gid = COALESCE(gid, ?),
              name = CASE WHEN name IS NULL OR name = '' THEN ? ELSE name END,
              picture_url = CASE WHEN picture_url IS NULL OR picture_url = '' THEN ? ELSE picture_url END
        WHERE id = ?`,
      [googleUser.gid, googleUser.name, googleUser.picture_url, user.id],
    );
    const profile = await get(env.DB, 'SELECT id FROM profiles WHERE email = ?', [googleUser.email]);
    if (!profile) {
      await insertRows(env, 'profiles', [{
        id: user.id,
        email: googleUser.email,
        role: 'general',
        name: googleUser.name,
        picture_url: googleUser.picture_url,
      }]);
    }
  }

  user = await get(
    env.DB,
    `SELECT users.id, users.email, users.gid, users.name, users.student_id, users.major, users.phone, users.picture_url,
            COALESCE(profiles.role, 'general') AS role
       FROM users
       LEFT JOIN profiles ON profiles.email = users.email
      WHERE users.email = ?`,
    [googleUser.email],
  );
  const accessToken = await createSession(env, user.id);
  const data = { session: { access_token: accessToken, user: publicUser(user) }, user: publicUser(user) };
  return json({ data });
};

const handleAdminUsers = async (request, env) => {
  await requireRole(request, env, ['admin']);
  const rows = await all(
    env.DB,
    `SELECT profiles.*, users.gid, users.picture_url
       FROM profiles
       LEFT JOIN users ON users.email = profiles.email
      ORDER BY profiles.created_at DESC, profiles.id DESC`,
  );
  return json({ data: rows.map(inflateRow) });
};

const handleRoleUpdate = async (request, env, userId) => {
  const admin = await requireRole(request, env, ['admin']);
  const body = await readJson(request);
  const role = String(body.role || '').trim();
  if (!roles.has(role)) return json({ error: '알 수 없는 유저 타입입니다.' }, 400);

  const target = await get(env.DB, 'SELECT * FROM profiles WHERE id = ?', [userId]);
  if (!target) return json({ error: '사용자를 찾을 수 없습니다.' }, 404);
  if (target.email === admin.email && role !== 'admin') {
    return json({ error: '자기 자신의 관리자 권한은 해제할 수 없습니다.' }, 400);
  }

  await run(env.DB, 'UPDATE profiles SET role = ? WHERE id = ?', [role, userId]);
  if (role === 'admin') {
    const exists = await get(env.DB, 'SELECT id FROM admin_users WHERE email = ?', [target.email]);
    if (!exists) await insertRows(env, 'admin_users', [{ email: target.email }]);
  } else {
    await run(env.DB, 'DELETE FROM admin_users WHERE email = ?', [target.email]);
  }

  const updated = await get(env.DB, 'SELECT * FROM profiles WHERE id = ?', [userId]);
  return json({ data: updated });
};

const handleProfileUpdate = async (request, env) => {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const values = {
    name: String(body.name || '').trim(),
    student_id: String(body.student_id || '').trim(),
    major: String(body.major || '').trim(),
    phone: String(body.phone || '').trim(),
  };
  if (!values.name || !values.student_id || !values.major || !values.phone) {
    return json({ error: '이름, 학번, 학과, 연락처를 모두 입력해주세요.' }, 400);
  }
  await run(
    env.DB,
    'UPDATE users SET name = ?, student_id = ?, major = ?, phone = ? WHERE id = ?',
    [values.name, values.student_id, values.major, values.phone, user.id],
  );
  await run(
    env.DB,
    `UPDATE profiles
        SET name = ?, student_id = ?, major = ?, phone = ?, picture_url = ?
      WHERE email = ?`,
    [values.name, values.student_id, values.major, values.phone, user.picture_url || '', user.email],
  );
  const token = (request.headers.get('authorization') || '').slice(7);
  const updated = await findUserByToken(env, token);
  return json({ data: { user: publicUser(updated) } });
};

const handleApply = async (request, env) => {
  const user = await requireUser(request, env);
  if (user.role !== 'general') return json({ error: '가입 신청은 일반 유저만 사용할 수 있습니다.' }, 403);
  ensureProfileComplete(user);
  const { message } = await readJson(request);
  if (!message) return json({ error: '지원 동기를 입력해주세요.' }, 400);
  const data = await insertRows(env, 'applicants', [{
    name: user.name,
    student_id: user.student_id,
    major: user.major,
    phone: user.phone,
    email: user.email,
    message,
    status: 'submitted',
  }]);
  return json({ status: 'success', message: '지원서 접수가 완료되었습니다.', data: data[0] }, 201);
};

const handleInquiry = async (request, env) => {
  const { title, content, contact } = await readJson(request);
  if (!title || !content || !contact) {
    return json({ error: '문의 제목, 내용, 연락처를 모두 입력해주세요.' }, 400);
  }
  const data = await insertRows(env, 'inquiries', [{
    title,
    content,
    contact,
    is_answered: false,
    answer: '',
  }]);
  return json({ status: 'success', message: '문의사항이 등록되었습니다.', data: data[0] }, 201);
};

const handleReservations = async (request, env) => {
  if (request.method === 'GET') {
    const rows = await all(env.DB, 'SELECT * FROM reservations ORDER BY reserved_at ASC, id ASC');
    return json({ data: rows.map(inflateRow) });
  }

  const user = await requireRole(request, env, ['member', 'admin']);
  ensureProfileComplete(user);
  const { reserved_at, participant_count, purpose } = await readJson(request);
  if (!reserved_at || !participant_count) return json({ error: '예약 시간과 사용 인원을 입력해주세요.' }, 400);
  const existing = await get(
    env.DB,
    "SELECT id FROM reservations WHERE reserved_at = ? AND status != 'cancelled'",
    [reserved_at],
  );
  if (existing) return json({ error: '이미 예약된 시간입니다.' }, 409);
  const data = await insertRows(env, 'reservations', [{
    student_id: user.student_id,
    name: user.name,
    reserved_at,
    participant_count,
    purpose: purpose || '',
    status: 'reserved',
  }]);
  return json({ data: data[0], message: '동아리방 예약이 완료되었습니다.' }, 201);
};

const handleTableSelect = async (request, env, table) => {
  assertTable(table);
  const url = new URL(request.url);
  const filters = url.searchParams.get('filters') ? JSON.parse(url.searchParams.get('filters')) : [];
  const orders = url.searchParams.get('order') ? JSON.parse(url.searchParams.get('order')) : [];
  const limit = Number(url.searchParams.get('limit') || 0);
  const single = url.searchParams.get('single') === 'true';
  const where = whereClause(table, filters);
  const orderSql = Array.isArray(orders) && orders.length
    ? ` ORDER BY ${orders.map(({ column, ascending }) => {
      assertColumn(table, column);
      return `"${column}" ${ascending ? 'ASC' : 'DESC'}`;
    }).join(', ')}`
    : '';
  const limitSql = limit ? ` LIMIT ${limit}` : '';
  const rows = await all(env.DB, `SELECT * FROM "${table}"${where.sql}${orderSql}${limitSql}`, where.params);
  const data = rows.map(inflateRow);
  return json({ data: single ? data[0] || null : data });
};

const handleTableInsert = async (request, env, table) => {
  const guarded = await requireTableWriteAccess(request, env, table);
  if ((table === 'posts' || adminWriteTables.has(table)) && !guarded) return json({ error: '권한이 없습니다.' }, 403);
  const body = await readJson(request);
  const rows = table === 'posts'
    ? (body.rows || []).map((row) => ({ ...row, user_id: guarded.id, author_email: guarded.email }))
    : body.rows || [];
  const data = await insertRows(env, table, rows);
  return json({ data }, 201);
};

const handleTableUpdate = async (request, env, table) => {
  assertTable(table);
  const body = await readJson(request);
  if (table === 'posts') {
    const guarded = await requirePostOwnerOrAdmin(request, env, body.filters || []);
    if (guarded.user.role !== 'admin') {
      const allowedPostColumns = new Set(['title', 'content', 'image_url', 'image_urls']);
      body.values = Object.fromEntries(
        Object.entries(body.values || {}).filter(([column]) => allowedPostColumns.has(column)),
      );
    }
  } else {
    const guarded = await requireTableWriteAccess(request, env, table);
    if (adminWriteTables.has(table) && !guarded) return json({ error: '권한이 없습니다.' }, 403);
  }

  const values = body.values || {};
  const columns = Object.keys(values).filter((column) => tables[table].includes(column) || column === 'id');
  if (!columns.length) return json({ data: [] });
  const setSql = columns.map((column) => `"${column}" = ?`).join(', ');
  const setParams = columns.map((column) => normalizeValue(column, values[column]));
  const where = whereClause(table, body.filters || []);
  await run(env.DB, `UPDATE "${table}" SET ${setSql}${where.sql}`, [...setParams, ...where.params]);
  const rows = await all(env.DB, `SELECT * FROM "${table}"${where.sql}`, where.params);
  return json({ data: rows.map(inflateRow) });
};

const handleTableDelete = async (request, env, table) => {
  assertTable(table);
  const body = await readJson(request);
  const where = whereClause(table, body.filters || []);
  if (table === 'posts') {
    await requirePostOwnerOrAdmin(request, env, body.filters || []);
  } else {
    const guarded = await requireTableWriteAccess(request, env, table);
    if (adminWriteTables.has(table) && !guarded) return json({ error: '권한이 없습니다.' }, 403);
  }
  if (!where.sql) return json({ error: 'Delete requires a filter' }, 400);
  await run(env.DB, `DELETE FROM "${table}"${where.sql}`, where.params);
  return json({ data: [] });
};

const sanitizeStoragePath = (value) => {
  const path = String(value || '').replace(/^\/+/, '');
  if (!path || path.split('/').some((part) => part === '..')) {
    const error = new Error('Invalid path');
    error.status = 400;
    throw error;
  }
  return path;
};

const handleUpload = async (request, env, bucket) => {
  await requireRole(request, env, ['member', 'admin']);
  if (!env.UPLOADS) return json({ error: 'R2 bucket binding is not configured.' }, 500);
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'File is required' }, 400);
  const relativePath = sanitizeStoragePath(form.get('path') || file.name);
  const key = `${bucket}/${relativePath}`;
  await env.UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  return json({ data: { path: relativePath } }, 201);
};

const handleRemove = async (request, env, bucket) => {
  await requireRole(request, env, ['member', 'admin']);
  if (!env.UPLOADS) return json({ error: 'R2 bucket binding is not configured.' }, 500);
  const body = await readJson(request);
  const keys = (body.paths || []).map((path) => `${bucket}/${sanitizeStoragePath(path)}`);
  await Promise.all(keys.map((key) => env.UPLOADS.delete(key)));
  return json({ data: [] });
};

const handleUploadedAsset = async (request, env, pathname) => {
  if (!env.UPLOADS) return json({ error: 'R2 bucket binding is not configured.' }, 500);
  const key = decodeURIComponent(pathname.replace(/^\/uploads\//, ''));
  const object = await env.UPLOADS.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
};

const routeApi = async (request, env, pathname) => {
  const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [root, second, third, fourth] = parts;

  if (!root) return json({ ok: true, message: 'Cloudflare Pages Function API is running' });

  if (root === 'auth' && second === 'signup' && request.method === 'POST') return handleSignup(request, env);
  if (root === 'auth' && second === 'login' && request.method === 'POST') return handleLogin(request, env);
  if (root === 'auth' && second === 'google' && request.method === 'POST') return handleGoogleLogin(request, env);
  if (root === 'auth' && second === 'me' && request.method === 'GET') {
    const user = await requireUser(request, env);
    return json({ data: { user: publicUser(user) } });
  }
  if (root === 'auth' && second === 'profile' && request.method === 'PATCH') return handleProfileUpdate(request, env);

  if (root === 'admin' && second === 'users' && !third && request.method === 'GET') return handleAdminUsers(request, env);
  if (root === 'admin' && second === 'users' && fourth === 'role' && request.method === 'PATCH') {
    return handleRoleUpdate(request, env, third);
  }

  if (root === 'recruit' && second === 'apply' && request.method === 'POST') return handleApply(request, env);
  if (root === 'recruit' && second === 'inquiry' && request.method === 'POST') return handleInquiry(request, env);

  if (root === 'reservations' && (request.method === 'GET' || request.method === 'POST')) {
    return handleReservations(request, env);
  }

  if (root === 'tables' && second) {
    if (request.method === 'GET') return handleTableSelect(request, env, second);
    if (request.method === 'POST') return handleTableInsert(request, env, second);
    if (request.method === 'PATCH') return handleTableUpdate(request, env, second);
    if (request.method === 'DELETE') return handleTableDelete(request, env, second);
  }

  if (root === 'storage' && second && third === 'upload' && request.method === 'POST') {
    return handleUpload(request, env, second);
  }
  if (root === 'storage' && second && third === 'remove' && request.method === 'POST') {
    return handleRemove(request, env, second);
  }

  return json({ error: 'Not found' }, 404);
};

export const onRequest = async ({ request, env, next }) => {
  if (request.method === 'OPTIONS') return json({});
  const url = new URL(request.url);

  try {
    if (url.pathname.startsWith('/api')) return routeApi(request, env, url.pathname);
    if (url.pathname.startsWith('/uploads/')) return handleUploadedAsset(request, env, url.pathname);
    return next();
  } catch (error) {
    if (error.body) return json({ error: error.message, ...error.body }, error.status || 500);
    return errorResponse(error);
  }
};
