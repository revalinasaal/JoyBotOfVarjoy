// 
// VARJOY — Account & Profile Module
// 

const Account = {
  profile: null,
  _initialized: false,

  async init() {
    await this.loadProfile();

    if (this._initialized) return;
    this._initialized = true;

    // Event listeners
    document.getElementById('account-logout-btn')?.addEventListener('click', () => this.handleLogout());
    document.getElementById('account-edit-profile')?.addEventListener('click', () => {
      this.populateEditForm();
      showScreen('edit-profile');
    });
    document.getElementById('account-delete')?.addEventListener('click', () => this.showDeleteModal());
    document.getElementById('edit-profile-back')?.addEventListener('click', () => showScreen('account'));
    document.getElementById('edit-profile-save')?.addEventListener('click', () => this.saveProfile());
    document.getElementById('delete-confirm-btn')?.addEventListener('click', () => this.handleDelete());
    document.getElementById('delete-cancel-btn')?.addEventListener('click', () => this.hideDeleteModal());
    document.getElementById('account-tts-toggle')?.addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('active');
      const enabled = e.currentTarget.classList.contains('active');
      localStorage.setItem('varjoy_tts', enabled ? '1' : '0');
    });
  },

  async loadProfile() {
    try {
      this.profile = await VarjoyApp.get('/profile');
      this.renderProfile();
    } catch (err) {
      console.error('Load profile error:', err);
    }
  },

  renderProfile() {
    if (!this.profile) return;

    const nameEl = document.getElementById('account-name');
    if (nameEl) nameEl.textContent = this.profile.display_name || 'User';

    const avatarEl = document.getElementById('account-avatar-letter');
    if (avatarEl) {
      avatarEl.textContent = (this.profile.display_name || 'U').charAt(0).toUpperCase();
    }

    // Guardian card
    this.renderGuardian();
  },

  renderGuardian() {
    const card = document.getElementById('guardian-card');
    if (!card) return;

    const guardian = JSON.parse(localStorage.getItem('varjoy_guardian') || 'null');

    if (guardian) {
      card.innerHTML = `
        <div class="guardian-label">Guardian Status</div>
        <div class="guardian-name">${VarjoyApp.escapeHtml(guardian.name)}</div>
        <div class="guardian-phone">${VarjoyApp.escapeHtml(guardian.phone)}</div>
        <div class="guardian-last-check">Last checked on you at ${guardian.lastCheck || 'never'}</div>
        <div class="guardian-cta">
          <span class="guardian-cta-icon">📞</span>
          <span>If things gets too tough, please don't hesitate to call.</span>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="guardian-label">Guardian Status</div>
        <p style="font-size:14px;color:var(--text-mid);font-weight:600;margin-top:8px;">
          Belum ada guardian. Tambahkan orang terdekat yang bisa dipercaya.
        </p>
        <button class="btn-auth" style="margin-top:12px;padding:12px;" onclick="Account.showAddGuardian()">
          + Tambah Guardian
        </button>
      `;
    }
  },

  showAddGuardian() {
    const name = prompt('Nama guardian:');
    if (!name) return;
    const phone = prompt('Nomor HP guardian:');
    if (!phone) return;

    const guardian = { name, phone, lastCheck: VarjoyApp.formatDate(new Date()) };
    localStorage.setItem('varjoy_guardian', JSON.stringify(guardian));
    this.renderGuardian();
    VarjoyApp.showToast('Guardian berhasil ditambahkan 🛡');
  },

  populateEditForm() {
    if (!this.profile) return;

    document.getElementById('edit-display-name').value = this.profile.display_name || '';
    document.getElementById('edit-dob').value = localStorage.getItem('varjoy_dob') || '';
    document.getElementById('edit-location').value = localStorage.getItem('varjoy_location') || '';
    document.getElementById('edit-email').value = this.profile.email || '';
    document.getElementById('edit-phone').value = localStorage.getItem('varjoy_phone') || '';
  },

  async saveProfile() {
    const displayName = document.getElementById('edit-display-name').value.trim();
    if (!displayName) {
      VarjoyApp.showToast('Nama ga boleh kosong ya');
      return;
    }

    const btn = document.getElementById('edit-profile-save');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      await VarjoyApp.put('/profile', { display_name: displayName });

      // Save extra fields locally
      localStorage.setItem('varjoy_dob', document.getElementById('edit-dob').value);
      localStorage.setItem('varjoy_location', document.getElementById('edit-location').value);
      localStorage.setItem('varjoy_phone', document.getElementById('edit-phone').value);
      localStorage.setItem('userName', displayName);

      this.profile.display_name = displayName;
      this.renderProfile();

      VarjoyApp.showToast('Profile berhasil diupdate 💜');
      showScreen('account');

    } catch (err) {
      console.error('Save profile error:', err);
      VarjoyApp.showToast('Gagal menyimpan, coba lagi ya');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  },

  async handleLogout() {
    try {
      await VarjoyApp.signOut();
    } catch (e) { }

    showScreen('splash');
    VarjoyApp.showToast('Sampai jumpa lagi 👋');
  },

  showDeleteModal() {
    document.getElementById('delete-modal')?.classList.add('visible');
  },

  hideDeleteModal() {
    document.getElementById('delete-modal')?.classList.remove('visible');
  },

  async handleDelete() {
    const btn = document.getElementById('delete-confirm-btn');
    btn.disabled = true;
    btn.textContent = 'Menghapus...';

    try {
      await VarjoyApp.api('/account', { method: 'DELETE' }); // hapus dari supabase
      localStorage.clear();
      await VarjoyApp.signOut();
      this.hideDeleteModal();
      showScreen('splash');
      VarjoyApp.showToast('Akun berhasil dihapus');
    } catch (err) {
      console.error('Delete error:', err);
      VarjoyApp.showToast('Gagal menghapus akun');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Hapus Akun';
    }
  },
};


// 
// Home Dashboard Module
// 
const Home = {
  _initialized: false,
  async init() {
    this.renderWelcome();
    await this.loadData();

    if (this._initialized) return;
    this._initialized = true;

    document.getElementById('home-log-day-btn')?.addEventListener('click', () => showScreen('log-day'));
    document.getElementById('home-mood-see-all')?.addEventListener('click', () => showScreen('mood'));
  },

  renderWelcome() {
    const name = localStorage.getItem('userName') || 'User';
    const nameEl = document.getElementById('home-user-name');
    if (nameEl) nameEl.textContent = name;
  },

  async loadData() {
    const cached = localStorage.getItem('varjoy_mood_cache');
    if (cached) {
      const moods = JSON.parse(cached);
      this.renderWellness(moods);
      this.renderMoodWeek(moods);
    }

    try {
      const moods = await VarjoyApp.get('/moods?days=7');
      localStorage.setItem('varjoy_mood_cache', JSON.stringify(moods)); // simpan cache
      this.renderWellness(moods);
      this.renderMoodWeek(moods);
      this.setVideoRecommendation(moods);
      await this.checkGuardianAlert(moods);
    } catch (err) {
      console.error('Home data load error:', err);
      if (!cached) {
        this.renderWellness([]);
        this.renderMoodWeek([]);
      }
    }
  },

  renderWellness(moods) {
    const container = document.getElementById('home-wellness');
    if (!container) return;

    if (moods.length === 0) {
      container.innerHTML = `
        <div class="wellness-header">
          <span style="font-size:32px;">❝</span>
          <span class="wellness-title">Your Wellness</span>
        </div>
        <div class="wellness-status">
          <div class="wellness-status-text">
            <h3>Belum ada data</h3>
            <p>Yuk mulai log mood kamu</p>
          </div>
          <div class="wellness-emoji">🤔</div>
        </div>
      `;
      return;
    }

    const avgScore = moods.reduce((sum, m) => sum + m.score, 0) / moods.length;
    const label = VarjoyApp.moodLabel(Math.round(avgScore));
    const emoji = VarjoyApp.moodEmoji(Math.round(avgScore));

    let comparison = '';
    if (moods.length >= 3) {
      const recentAvg = moods.slice(-3).reduce((s, m) => s + m.score, 0) / Math.min(3, moods.length);
      const olderAvg = moods.slice(0, -3).reduce((s, m) => s + m.score, 0) / Math.max(1, moods.length - 3);
      if (recentAvg > olderAvg) {
        comparison = 'Your condition is <strong style="color:#81C784;">better</strong> than before';
      } else if (recentAvg < olderAvg) {
        comparison = 'Your condition is <strong style="color:#E57373;">worse</strong> than before';
      } else {
        comparison = 'Your condition is <strong>stable</strong>';
      }
    }

    container.innerHTML = `
      <div class="wellness-header">
        <span style="font-size:32px;">❝</span>
        <span class="wellness-title">Your Wellness</span>
      </div>
      <div class="wellness-status">
        <div class="wellness-status-text">
          <h3>${label}</h3>
          <p>${comparison || 'Keep tracking your mood!'}</p>
        </div>
        <div class="wellness-emoji">${emoji}</div>
      </div>
    `;
  },

  setVideoRecommendation(moods) {
    const link = document.getElementById('rec-video-link');
    if (!link || moods.length === 0) return;

    const avgScore = moods.reduce((sum, m) => sum + m.score, 0) / moods.length;

    let query = '';
    if (avgScore <= 3) {
      query = 'gentle stretching for anxiety relief';
    } else if (avgScore <= 5) {
      query = 'light yoga for stress relief beginner';
    } else if (avgScore <= 7) {
      query = 'morning stretch routine energizing';
    } else {
      query = 'fun dance workout feel good';
    }

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    link.href = url;
  },

  renderMoodWeek(moods) {
    const container = document.getElementById('home-mood-week');
    if (!container) return;

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();

    // Build mood lookup by date
    const moodMap = {};
    moods.forEach(m => { moodMap[m.entry_date] = m; });

    let daysHtml = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const mood = moodMap[dateStr];
      const isToday = i === 0;

      const bg = mood ? VarjoyApp.moodColor(mood.score) : 'var(--gray-200)';
      const text = mood ? mood.score : '';
      const todayClass = isToday ? 'today' : '';

      daysHtml += `
        <div class="mood-day">
          <span class="mood-day-label">${dayName}</span>
          <div class="mood-day-dot ${todayClass}" style="background:${bg}">${text}</div>
        </div>
      `;
    }
    container.innerHTML = daysHtml;
  },

  async checkGuardianAlert(moods) {
    // Stub to prevent error
  }
};
