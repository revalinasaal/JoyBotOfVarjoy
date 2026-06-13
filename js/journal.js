// -- VARJOY — Journal Module --

const Journal = {
  journals: [],
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;

    document.getElementById('journal-save-btn')?.addEventListener('click', () => this.saveJournal());
    
    // Set today's date in write screen header
    const dateEl = document.getElementById('journal-write-date');
    if (dateEl) {
      dateEl.textContent = this.formatDateSpecial(new Date());
    }
  },

  async loadJournals() {
    try {
      this.journals = await VarjoyApp.get('/journals');
      this.renderFeed();
    } catch (err) {
      console.error('Load journals error:', err);
      const feed = document.getElementById('journal-feed');
      if (feed) feed.innerHTML = '<p style="text-align:center; padding:20px;">Gagal memuat jurnal.</p>';
    }
  },

  renderFeed() {
    const feed = document.getElementById('journal-feed');
    if (!feed) return;

    if (this.journals.length === 0) {
      feed.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--purple-mid);">
          <h3 style="margin-bottom: 8px;">Belum ada Jurnal</h3>
          <p style="font-size: 14px; font-weight: 600;">Mulai ceritakan harimu dengan klik tombol pensil di atas!</p>
        </div>
      `;
      return;
    }

    let html = '';
    this.journals.forEach(entry => {
      const dateObj = new Date(entry.entry_date);
      const formattedDate = this.formatDateSpecial(dateObj);

      html += `
        <div class="journal-card">
          <div class="journal-content-wrapper">
            <div class="journal-date">${formattedDate}</div>
            <div class="journal-content">${VarjoyApp.escapeHtml(entry.content)}</div>
          </div>
          
          <div class="journal-ai-feedback">
            <div class="journal-ai-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Joy berkata:
            </div>
            <div class="journal-ai-text">
              ${VarjoyApp.escapeHtml(entry.ai_feedback || 'Maaf, Joy belum membalas jurnal ini (atau balasan kosong).')}
            </div>
          </div>
        </div>
      `;
    });

    feed.innerHTML = html;
  },

  async saveJournal() {
    const input = document.getElementById('journal-input');
    const content = input?.value.trim();

    if (!content) {
      VarjoyApp.showToast('Tulis sesuatu dulu yuk sebelum di-save!');
      return;
    }

    const btn = document.getElementById('journal-save-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menyimpan & Menunggu respon Joy... ⏳';
    }

    try {
      await VarjoyApp.post('/journal', { content });
      VarjoyApp.showToast('Jurnal berhasil disimpan! ✨');
      
      // Reset input
      input.value = '';
      
      // Go back to feed
      showScreen('journal');
      await this.loadJournals();

    } catch (err) {
      console.error('Save journal error:', err);
      VarjoyApp.showToast('Gagal menyimpan jurnal, coba lagi ya.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Entry';
      }
    }
  },

  // Helper for DD/MM/YYYY format
  formatDateSpecial(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
};
