import assert from 'node:assert/strict';

const { onRequest } = await import('../functions/[[path]].js');
const originalConsoleError = console.error;

const callFunction = async (path, options = {}, env = {}) => {
  const request = new Request(`https://local.test${path}`, options);
  return onRequest({
    request,
    env,
    next: () => new Response('next'),
  });
};

const readJson = async (response) => {
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  return response.json();
};

const withoutErrorLogs = async (callback) => {
  console.error = () => {};
  try {
    return await callback();
  } finally {
    console.error = originalConsoleError;
  }
};

{
  const response = await callFunction('/api/config', {}, {
    GOOGLE_CLIENT_ID: 'example.apps.googleusercontent.com',
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await readJson(response), {
    data: { googleClientId: 'example.apps.googleusercontent.com' },
  });
}

{
  const response = await withoutErrorLogs(() => callFunction('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }, {
    GOOGLE_CLIENT_ID: 'example.apps.googleusercontent.com',
  }));
  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), {
    error: 'Google 로그인 정보가 없습니다.',
  });
}

{
  const response = await withoutErrorLogs(() => callFunction('/api/tables/faqs'));
  assert.equal(response.status, 500);
  const payload = await readJson(response);
  assert.equal(typeof payload.error, 'string');
  assert.ok(!payload.error.includes('<html'));
  assert.ok(!payload.error.includes('Worker threw exception'));
}

console.log('Functions verification passed');
