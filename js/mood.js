// ============================================================
// VARJOY — Mood Tracker Module
// ============================================================

const Mood = {
  selectedScore: 0,
  moodData: [],

  init() {
    // Note: mood-save-btn click is handled inline in index.html
    // Range slider interaction is also handled inline
    // Back navigation uses onclick="showScreen('mood')" in HTML
  },

  renderSlider() {
    const container = document.getElementById('mood-emojis');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
      const btn = document.createElement('button');
      btn.className = 'mood-emoji-btn';
      btn.dataset.score = i;
      btn.innerHTML = `
        <span class="mood-emoji-icon">${VarjoyApp.moodEmoji(i)}</span>
        <span class="mood-emoji-num">${i}</span>
      `;
      btn.addEventListener('click', () => this.selectScore(i));
      container.appendChild(btn);
    }
  },

  selectScore(score) {
    this.selectedScore = score;

    // Update active state
    document.querySelectorAll('.mood-emoji-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.score) === score);
    });

    // Update label
    const label = document.getElementById('mood-label');
    if (label) {
      label.textContent = VarjoyApp.moodLabel(score);
      label.style.color = VarjoyApp.moodColor(score);
    }

    // Enable save button
    const saveBtn = document.getElementById('mood-save-btn');
    if (saveBtn) saveBtn.disabled = false;
  },

  async saveMood() {
    if (!this.selectedScore) return;

    const note = document.getElementById('mood-note')?.value.trim() || null;
    const saveBtn = document.getElementById('mood-save-btn');

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Nyimpen...';

      await VarjoyApp.post('/mood', {
        score: this.selectedScore,
        note: note,
      });

      VarjoyApp.showToast('Mood kamu udah kesimpen 💛');

      // Reset
      this.selectedScore = 0;
      document.querySelectorAll('.mood-emoji-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('mood-note').value = '';
      document.getElementById('mood-label').textContent = 'Pilih mood kamu hari ini';
      document.getElementById('mood-label').style.color = '#5C3D8F';

      // Refresh calendar
      await this.loadHistory();

    } catch (err) {
      console.error('Mood save error:', err);
      VarjoyApp.showToast('Gagal nyimpen mood, coba lagi ya');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan Mood 💛';
    }
  },

  async loadHistory() {
    try {
      this.moodData = await VarjoyApp.get('/moods?days=30');
      this.renderCalendar();
      this.renderTrend();
    } catch (err) {
      console.error('Load mood history error:', err);
    }
  },

  renderCalendar() {
    const container = document.getElementById('mood-calendar');
    if (!container) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Build mood lookup
    const moodMap = {};
    this.moodData.forEach(m => {
      moodMap[m.entry_date] = m;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `<div class="mood-cal-header">${monthNames[month]} ${year}</div>`;
    html += '<div class="mood-cal-days">';
    ['M', 'S', 'S', 'R', 'K', 'J', 'S'].forEach(d => {
      html += `<div class="mood-cal-day-name">${d}</div>`;
    });

    // Adjust for Monday start (0=Sun → shift)
    const startOffset = (firstDay === 0) ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) {
      html += '<div class="mood-cal-cell empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mood = moodMap[dateStr];
      const isToday = day === today.getDate();

      if (mood) {
        html += `<div class="mood-cal-cell filled ${isToday ? 'today' : ''}" style="background:${VarjoyApp.moodColor(mood.score)}" title="${VarjoyApp.moodLabel(mood.score)}">
          <span class="mood-cal-num">${day}</span>
          <span class="mood-cal-emoji">${VarjoyApp.moodEmoji(mood.score)}</span>
        </div>`;
      } else {
        html += `<div class="mood-cal-cell ${isToday ? 'today' : ''}">
          <span class="mood-cal-num">${day}</span>
        </div>`;
      }
    }

    html += '</div>';
    container.innerHTML = html;
  },

  renderTrend() {
    const container = document.getElementById('mood-trend');
    if (!container) return;

    const last7 = this.moodData.slice(-7);

    if (last7.length === 0) {
      container.innerHTML = '<div class="mood-trend-empty">Belum ada data mood minggu ini</div>';
      return;
    }

    let html = '<div class="mood-trend-title">7 Hari Terakhir</div><div class="mood-trend-bars">';

    last7.forEach(m => {
      const d = new Date(m.entry_date);
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayName = dayNames[d.getDay()];
      const height = (m.score / 10) * 100;

      html += `
        <div class="mood-trend-bar-wrap">
          <div class="mood-trend-emoji">${VarjoyApp.moodEmoji(m.score)}</div>
          <div class="mood-trend-bar" style="height:${height}%;background:${VarjoyApp.moodColor(m.score)}"></div>
          <div class="mood-trend-day">${dayName}</div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }
};
