const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const SESSION_KEY = 'huhsweb.session';

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
};

const writeSession = (session) => {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('huhsweb-auth', { detail: session }));
};

const request = async (path, options = {}) => {
  const session = readSession();
  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  const response = await fetch(`${API_BASE}${path}`, {
    headers: options.body instanceof FormData ? authHeaders : { 'Content-Type': 'application/json', ...authHeaders },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
};

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.filters = [];
    this.orders = [];
    this.payload = null;
    this.maxRows = null;
    this.wantSingle = false;
  }

  select() {
    this.action = 'select';
    return this;
  }

  insert(rows) {
    this.action = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(values) {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(count) {
    this.maxRows = count;
    return this;
  }

  single() {
    this.wantSingle = true;
    this.maxRows = this.maxRows ?? 1;
    return this;
  }

  async execute() {
    try {
      let payload;
      if (this.action === 'select') {
        const params = new URLSearchParams();
        if (this.filters.length) params.set('filters', JSON.stringify(this.filters));
        if (this.orders.length) params.set('order', JSON.stringify(this.orders));
        if (this.maxRows) params.set('limit', String(this.maxRows));
        if (this.wantSingle) params.set('single', 'true');
        payload = await request(`/tables/${this.table}?${params.toString()}`);
      } else if (this.action === 'insert') {
        payload = await request(`/tables/${this.table}`, {
          method: 'POST',
          body: JSON.stringify({ rows: this.payload }),
        });
      } else if (this.action === 'update') {
        payload = await request(`/tables/${this.table}`, {
          method: 'PATCH',
          body: JSON.stringify({ values: this.payload, filters: this.filters }),
        });
      } else {
        payload = await request(`/tables/${this.table}`, {
          method: 'DELETE',
          body: JSON.stringify({ filters: this.filters }),
        });
      }
      return { data: payload.data, error: null };
    } catch (error) {
      return { data: this.wantSingle ? null : [], error };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

export const supabase = {
  from(table) {
    return new QueryBuilder(table);
  },
  auth: {
    async getSession() {
      return { data: { session: readSession() }, error: null };
    },
    async getUser() {
      const session = readSession();
      return { data: { user: session?.user || null }, error: null };
    },
    async refreshUser() {
      try {
        const payload = await request('/auth/me');
        const session = readSession();
        const nextSession = session ? { ...session, user: payload.data.user } : null;
        writeSession(nextSession);
        return { data: { user: payload.data.user, session: nextSession }, error: null };
      } catch (error) {
        return { data: { user: null, session: null }, error };
      }
    },
    onAuthStateChange(callback) {
      const handler = (event) => callback('SIGNED_IN', event.detail);
      window.addEventListener('huhsweb-auth', handler);
      return {
        data: {
          subscription: {
            unsubscribe: () => window.removeEventListener('huhsweb-auth', handler),
          },
        },
      };
    },
    async signUp(credentials) {
      try {
        const payload = await request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        return { data: payload.data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signInWithPassword(credentials) {
      try {
        const payload = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        writeSession(payload.data.session);
        return { data: payload.data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signInWithGoogleCredential(credential) {
      try {
        const payload = await request('/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential }),
        });
        writeSession(payload.data.session);
        return { data: payload.data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signOut() {
      writeSession(null);
      return { error: null };
    },
  },
  storage: {
    from(bucket) {
      return {
        async upload(path, file) {
          const formData = new FormData();
          formData.append('path', path);
          formData.append('file', file);
          try {
            const payload = await request(`/storage/${bucket}/upload`, {
              method: 'POST',
              body: formData,
            });
            return { data: payload.data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        getPublicUrl(path) {
          const safePath = String(path).split('/').map(encodeURIComponent).join('/');
          return { data: { publicUrl: `/uploads/${bucket}/${safePath}` } };
        },
        async remove(paths) {
          try {
            const payload = await request(`/storage/${bucket}/remove`, {
              method: 'POST',
              body: JSON.stringify({ paths }),
            });
            return { data: payload.data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
      };
    },
  },
};
