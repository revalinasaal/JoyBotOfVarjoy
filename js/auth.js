// ============================================================
// VARJOY — Auth Module
// ============================================================

const Auth = {
  isLoading: false,
  mode: 'login', // 'login' or 'register'

  init() {
    // Tab switching
    document.getElementById('auth-tab-login')?.addEventListener('click', () => this.switchMode('login'));
    document.getElementById('auth-tab-register')?.addEventListener('click', () => this.switchMode('register'));

    // Form submission
    document.getElementById('auth-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Password visibility toggle
    document.getElementById('auth-toggle-pw')?.addEventListener('click', () => {
      const pwInput = document.getElementById('auth-password');
      const icon = document.getElementById('auth-toggle-pw');
      if (pwInput.type === 'password') {
        pwInput.type = 'text';
        icon.textContent = '🙈';
      } else {
        pwInput.type = 'password';
        icon.textContent = '👁';
      }
    });

    // forgot password
    document.getElementById('forgot-password-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      if (!email) {
        this.showError('Isi email dulu ya sebelum reset password');
        return;
      }
      try {
        await VarjoyApp.resetPassword(email);
        this.clearError();
        VarjoyApp.showToast('Link reset password udah dikirim ke email kamu! 📧');
      } catch (err) {
        this.showError('Gagal kirim reset email, coba lagi ya');
      }
    });
  },

  switchMode(mode) {
    this.mode = mode;
    const loginTab = document.getElementById('auth-tab-login');
    const registerTab = document.getElementById('auth-tab-register');
    const submitBtn = document.getElementById('auth-submit');
    const nameGroup = document.getElementById('auth-name-group');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');

    if (mode === 'login') {
      loginTab.classList.add('active');
      loginTab.style.background = 'var(--white)';
      loginTab.style.color = 'var(--purple-dark)';
      registerTab.classList.remove('active');
      registerTab.style.background = 'transparent';
      registerTab.style.color = 'var(--text-dark)';
      submitBtn.textContent = 'Masuk';
      nameGroup.style.display = 'none';
      title.textContent = 'Welcome back 💛';
      subtitle.textContent = 'Joy udah kangen sama kamu nihh';
    } else {
      loginTab.classList.remove('active');
      loginTab.style.background = 'transparent';
      loginTab.style.color = 'var(--text-dark)';
      registerTab.classList.add('active');
      registerTab.style.background = 'var(--white)';
      registerTab.style.color = 'var(--purple-dark)';
      submitBtn.textContent = 'Daftar';
      nameGroup.style.display = 'block';
      title.textContent = 'Hai, salam kenal 🌷';
      subtitle.textContent = 'Yuk bikin akun biar Joy bisa nemenin kamu terus';
    }

    this.clearError();
  },

  showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
  },

  clearError() {
    const el = document.getElementById('auth-error');
    el.textContent = '';
    el.style.display = 'none';
  },

  setLoading(loading) {
    this.isLoading = loading;
    const btn = document.getElementById('auth-submit');
    const spinner = document.getElementById('auth-spinner');
    if (!btn || !spinner) return;

    if (loading) {
      btn.disabled = true;
      btn.style.opacity = '0.7';
      spinner.style.display = 'inline-block';
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      spinner.style.display = 'none';
    }
  },

  async handleSubmit() {
    if (this.isLoading) return;
    this.clearError();

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name')?.value.trim();

    // Validate
    if (!email) return this.showError('Email harus diisi yaa');
    if (!password) return this.showError('Password harus diisi');
    if (password.length < 6) return this.showError('Password minimal 6 karakter ya');
    if (this.mode === 'register' && !name) return this.showError('Nama kamu siapa nihh?');

    this.setLoading(true);

    try {
      if (this.mode === 'register') {
        await VarjoyApp.signUp(email, password, name);
        // After sign up, auto sign in
        await VarjoyApp.signIn(email, password);
      } else {
        await VarjoyApp.signIn(email, password);
      }

      // Get profile
      const profile = await VarjoyApp.get('/profile');

      if (profile && profile.display_name) {
        localStorage.setItem('userName', profile.display_name);
      }

      // Navigate to chat
      await initChatAfterAuth();

    } catch (err) {
      console.error('Auth error:', err);
      const msg = err.message || '';

      if (msg.includes('Invalid login')) {
        this.showError('Email atau password salah nih');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        this.showError('Email ini udah terdaftar, coba login aja');
      } else if (msg.includes('valid email')) {
        this.showError('Format email-nya kayaknya salah deh');
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        this.showError('Terlalu banyak percobaan, tunggu sebentar ya');
      } else {
        this.showError(msg || 'Ada yang salah nih, coba lagi ya');
      }
    } finally {
      this.setLoading(false);
    }
  }
};
