// -- VARJOY — Supabase Client & Utilities --

let _supabaseClient = null;
let _supabaseConfig = null;

const VarjoyApp = {
  // -- SUPABASE INIT --
  async initSupabase() {
    if (_supabaseClient) return _supabaseClient;

    try {
      // Fetch config from backend
      const res = await fetch('/config');
      _supabaseConfig = await res.json();

      _supabaseClient = supabase.createClient(
        _supabaseConfig.supabase_url,
        _supabaseConfig.supabase_anon_key
      );

      return _supabaseClient;
    } catch (err) {
      console.error('Failed to init Supabase:', err);
      return null;
    }
  },

  getClient() {
    return _supabaseClient;
  },

  // -- AUTH HELPERS --
  async getSession() {
    const client = this.getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  },

  async getAccessToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  },

  async getUser() {
    const session = await this.getSession();
    return session?.user || null;
  },

  async signUp(email, password, displayName) {
    const client = this.getClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const client = this.getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = this.getClient();
    await client.auth.signOut();
    localStorage.removeItem('varjoy_session_id');
    localStorage.removeItem('userName');
  },

  async resetPassword(email) {
    const client = this.getClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://varjoy-web.vercel.app'
    });
    if (error) throw error;
  },

  // -- API HELPERS --
  async api(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(endpoint, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (res.status === 401) {
      // Token expired
      await this.signOut();
      showScreen('splash');
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Server error' }));
      throw new Error(err.detail || 'Request failed');
    }

    return await res.json();
  },

  async get(endpoint) {
    return this.api(endpoint, { method: 'GET' });
  },

  async post(endpoint, body) {
    return this.api(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  async put(endpoint, body) {
    return this.api(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },

  // -- UTILS --
  uuid() {
    return crypto.randomUUID ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  },

  formatDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  },

  formatDateLong(date) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date(date);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  today() {
    return new Date().toISOString().split('T')[0];
  },

  moodEmoji(score) {
    if (score <= 2) return '😢';
    if (score <= 4) return '😔';
    if (score <= 5) return '😐';
    if (score <= 7) return '🙂';
    if (score <= 9) return '😊';
    return '🤗';
  },

  moodColor(score) {
    const colors = {
      1: '#E53935', 2: '#E57373', 3: '#FF8A65', 4: '#FFB74D', 5: '#FFD54F',
      6: '#FFF176', 7: '#AED581', 8: '#81C784', 9: '#4DB6AC', 10: '#26A69A'
    };
    return colors[score] || '#E0E0E0';
  },

  moodLabel(score) {
    if (score <= 2) return 'Sedih banget';
    if (score <= 4) return 'Kurang oke';
    if (score <= 5) return 'Biasa aja';
    if (score <= 7) return 'Lumayan';
    if (score <= 9) return 'Seneng';
    return 'Bahagia banget';
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showToast(message, duration = 2500) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => { toast.classList.remove('visible'); }, duration);
  },

  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
};
