// -- VARJOY — Mood Tracker Module (Redesigned) --

const EMOTION_MAP = {
  'Angry': { color: '#F4A6A0', score: 2 },
  'Depressed': { color: '#C9A6E8', score: 1 },
  'Sad': { color: '#A8CFF5', score: 3 },
  'Happy': { color: '#FFE49C', score: 8 },
  'Displeased': { color: '#FFBFA0', score: 4 },
  'Calm': { color: '#A8DBA8', score: 7 },
  'Fear': { color: '#9BB5BF', score: 3 },
  'Empty': { color: '#CFD8DC', score: 4 },
  'Anxious': { color: '#A0D9D0', score: 4 },
  'In-love': { color: '#F5A8C8', score: 9 },
};

const Mood = {
  selectedEmotions: [],
  moodData: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),

  init() {
    // Nothing needed here — all init is in the inline script
  },

  // -- GRADIENT CIRCLE --
  updateGradientCircle() {
    const circle = document.getElementById('mood-gradient-circle');
    const text = document.getElementById('mood-circle-text');
    if (!circle) return;

    if (this.selectedEmotions.length === 0) {
      circle.style.background = 'var(--gray-200)';
      circle.classList.remove('has-emotions');
      text.textContent = 'Pilih emosi kamu';
      return;
    }

    circle.classList.add('has-emotions');

    const colors = this.selectedEmotions.map(e => EMOTION_MAP[e]?.color || '#B0BEC5');

    if (colors.length === 1) {
      circle.style.background = colors[0];
    } else {
      // Build smooth radial/conic gradient with blended transitions
      const step = 360 / colors.length;
      const stops = [];
      colors.forEach((c, i) => {
        const start = i * step;
        const end = (i + 1) * step;
        // Add smooth blending between sections
        stops.push(`${c} ${start + step * 0.15}deg`);
        stops.push(`${c} ${end - step * 0.15}deg`);
      });
      circle.style.background = `conic-gradient(${stops.join(', ')})`;
      circle.style.filter = 'blur(0px)';
    }

    // Show emoji summary
    const avgScore = this.getAverageScore();
    text.textContent = VarjoyApp.moodEmoji(avgScore);
  },

  getAverageScore() {
    if (this.selectedEmotions.length === 0) return 5;
    const total = this.selectedEmotions.reduce((sum, e) => sum + (EMOTION_MAP[e]?.score || 5), 0);
    return Math.round(total / this.selectedEmotions.length);
  },

  toggleEmotion(emotion) {
    const idx = this.selectedEmotions.indexOf(emotion);
    if (idx >= 0) {
      this.selectedEmotions.splice(idx, 1);
    } else {
      this.selectedEmotions.push(emotion);
    }
    this.updateGradientCircle();
  },

  addEmotionByName(emotion) {
    if (!EMOTION_MAP[emotion]) return false;
    if (!this.selectedEmotions.includes(emotion)) {
      this.selectedEmotions.push(emotion);

      // Also select the tag in UI
      const tag = document.querySelector(`.emotion-tag[data-emotion="${emotion}"]`);
      if (tag) tag.classList.add('selected');

      this.updateGradientCircle();
    }
    return true;
  },

  // -- SAVE --
  async saveEmotions() {
    if (this.selectedEmotions.length === 0) {
      VarjoyApp.showToast('Pilih minimal satu emosi dulu ya');
      return;
    }

    const btn = document.getElementById('mood-save-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';
    }

    const score = this.getAverageScore();
    const noteData = JSON.stringify({
      emotions: this.selectedEmotions,
      scores: this.selectedEmotions.map(e => EMOTION_MAP[e]?.score || 5)
    });

    try {
      await VarjoyApp.post('/mood', {
        score: score,
        note: noteData
      });

      VarjoyApp.showToast('Emosi hari ini tersimpan! 💛');

      // Reset
      this.selectedEmotions = [];
      document.querySelectorAll('.emotion-tag').forEach(t => t.classList.remove('selected'));
      this.updateGradientCircle();
      document.getElementById('mood-note').value = '';
      document.getElementById('joy-detect-result').textContent = '';

      // Go back to mood calendar
      setTimeout(() => {
        showScreen('home');
        this.loadHistory();
        Home.init(); // tanpa await, tetap jalan
      }, 1200);

    } catch (err) {
      console.error('Save mood error:', err);
      VarjoyApp.showToast('Gagal menyimpan, coba lagi ya');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Simpan Emosi Hari Ini 💛';
      }
    }
  },

  // -- AI EMOTION DETECTION --
  async detectEmotion() {
    const input = document.getElementById('mood-note');
    const text = input?.value.trim();
    if (!text) {
      VarjoyApp.showToast('Tulis dulu perasaan kamu ya');
      return;
    }

    const btn = document.getElementById('mood-detect-btn');
    const result = document.getElementById('joy-detect-result');
    if (btn) btn.disabled = true;
    if (result) result.textContent = 'Joy lagi mikirin...';

    try {
      const data = await VarjoyApp.post('/detect-emotion', { text });
      const emotion = data.emotion;

      if (emotion && EMOTION_MAP[emotion]) {
        this.addEmotionByName(emotion);
        if (result) result.textContent = `Joy detected: ${emotion} 💡`;
        VarjoyApp.showToast(`Joy ngerasa kamu lagi ${emotion}!`);
        input.value = '';
      } else {
        if (result) result.textContent = 'Joy kurang yakin, coba ceritain lebih detail ya';
      }
    } catch (err) {
      console.error('Detect emotion error:', err);
      if (result) result.textContent = '';
      VarjoyApp.showToast('Gagal mendeteksi, coba lagi ya');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // -- MOOD HISTORY --
  async loadHistory() {
    try {
      this.moodData = await VarjoyApp.get('/moods?days=60');
      this.renderCalendar();
      this.renderWeekPreview();
    } catch (err) {
      console.error('Load mood history error:', err);
    }
  },

  // -- CALENDAR (Figma Style) --
  renderCalendar() {
    const container = document.getElementById('mood-calendar');
    if (!container) return;

    const year = this.currentYear;
    const month = this.currentMonth;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Build mood lookup
    const moodMap = {};
    this.moodData.forEach(m => {
      moodMap[m.entry_date] = m;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    let html = `
      <div class="mood-month-picker">
        <h3 class="mood-cal-header">Mood Calendar</h3>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="mood-month-btn" id="mood-prev-month">‹</button>
          <button class="mood-month-btn" id="mood-month-label">${monthNames[month]} ▾</button>
          <button class="mood-month-btn" id="mood-next-month">›</button>
        </div>
      </div>
    `;

    html += '<div class="mood-cal-days">';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
      html += `<div class="mood-cal-day-name">${d}</div>`;
    });

    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="mood-cal-cell empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const mood = moodMap[dateStr];
      const isToday = day === todayDate && month === todayMonth && year === todayYear;

      if (mood) {
        // Parse emotions from note if JSON
        let bgColor = VarjoyApp.moodColor(mood.score);
        let bgStyle = `background:${bgColor}`;

        try {
          const noteData = JSON.parse(mood.note);
          if (noteData.emotions && noteData.emotions.length > 0) {
            const colors = noteData.emotions.map(e => EMOTION_MAP[e]?.color || bgColor);
            if (colors.length === 1) {
              bgStyle = `background:${colors[0]}`;
            } else {
              const step = 360 / colors.length;
              const stops = [];
              colors.forEach((c, i) => {
                stops.push(`${c} ${i * step + step * 0.15}deg`);
                stops.push(`${c} ${(i + 1) * step - step * 0.15}deg`);
              });
              bgStyle = `background:conic-gradient(${stops.join(', ')})`;
            }
          }
        } catch (e) {
          // note is plain text, use score-based color
        }

        html += `<div class="mood-cal-cell filled ${isToday ? 'today' : ''}" style="${bgStyle}" title="${VarjoyApp.moodLabel(mood.score)}">
          <span class="mood-cal-num">${day}</span>
        </div>`;
      } else {
        html += `<div class="mood-cal-cell ${isToday ? 'today' : ''}">
          <span class="mood-cal-num">${day}</span>
        </div>`;
      }
    }

    html += '</div>';
    container.innerHTML = html;

    // Month navigation events
    document.getElementById('mood-prev-month')?.addEventListener('click', () => {
      this.currentMonth--;
      if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
      this.renderCalendar();
    });
    document.getElementById('mood-next-month')?.addEventListener('click', () => {
      this.currentMonth++;
      if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
      this.renderCalendar();
    });
  },

  // -- HOME WEEK PREVIEW --
  renderWeekPreview() {
    const container = document.getElementById('home-mood-week');
    if (!container) return;

    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Build mood lookup
    const moodMap = {};
    this.moodData.forEach(m => { moodMap[m.entry_date] = m; });

    let html = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mood = moodMap[dateStr];
      const isToday = i === 0;
      const dayLabel = dayNames[d.getDay()];

      let dotStyle = '';
      let dotClass = 'mood-day-dot';

      if (mood) {
        dotStyle = `background:${VarjoyApp.moodColor(mood.score)}`;
        dotClass += ' filled';
      }
      if (isToday) dotClass += ' today';

      html += `
        <div class="mood-day">
          <span class="mood-day-label">${dayLabel}</span>
          <div class="${dotClass}" style="${dotStyle}">
            ${mood ? VarjoyApp.moodEmoji(mood.score) : ''}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  // -- TREND (kept but simplified) --
  renderTrend() {
    // Trend is handled by the week preview on home screen
  }
};
