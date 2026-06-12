// ============================================================
// VARJOY — Chat Module (UI Redesigned, backend untouched)
// ============================================================

const Chat = {
  sessionId: null,
  isWaiting: false,
  recognition: null,
  isRecording: false,

  async init() {
    // Ensure we have a session
    await this.ensureSession();

    // Event listeners
    document.getElementById('chat-send-btn')?.addEventListener('click', () => this.sendMessage());
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    document.getElementById('chat-input')?.addEventListener('input', (e) => this.autoResize(e.target));
    document.getElementById('chat-mic-btn')?.addEventListener('click', () => this.toggleMic());
    document.getElementById('chat-reset-btn')?.addEventListener('click', () => this.resetChat());
    document.getElementById('chat-settings-nav')?.addEventListener('click', () => showScreen('chat-settings'));
    document.getElementById('chat-back-btn')?.addEventListener('click', () => showScreen('home'));

    // Load existing messages if any
    await this.loadMessages();
  },

  async ensureSession() {
    this.sessionId = localStorage.getItem('varjoy_session_id');
    if (!this.sessionId) {
      try {
        const session = await VarjoyApp.post('/sessions', {});
        this.sessionId = session.id;
        localStorage.setItem('varjoy_session_id', this.sessionId);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    }
  },

  async loadMessages() {
    // Send welcome if first time
    const msgs = document.getElementById('chat-messages');
    const typing = document.getElementById('typing-indicator');
    
    // Clear existing bubbles except typing
    [...msgs.children].forEach(el => {
      if (el !== typing) el.remove();
    });

    const userName = localStorage.getItem('userName') || 'kamu';
    document.getElementById('chat-greeting').textContent = `Hi ${userName} 👋`;
    
    // Show welcome message
    this.addBubble(`heyy ${userName} 👋 aku Joy, seneng banget bisa ngobrol sama kamu. lagi gimana hari ini?`, 'joy');
  },

  addBubble(text, sender) {
    const msgs = document.getElementById('chat-messages');
    const typing = document.getElementById('typing-indicator');

    const div = document.createElement('div');
    div.className = `bubble bubble-${sender}`;
    div.textContent = text;

    msgs.insertBefore(div, typing);
    msgs.scrollTop = msgs.scrollHeight;
  },

  setTyping(show) {
    const el = document.getElementById('typing-indicator');
    const msgs = document.getElementById('chat-messages');
    el.classList.toggle('visible', show);
    if (show) msgs.scrollTop = msgs.scrollHeight;
  },

  async sendMessage() {
    if (this.isWaiting) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.autoResize(input);
    this.addBubble(text, 'user');

    this.isWaiting = true;
    document.getElementById('chat-send-btn').disabled = true;
    this.setTyping(true);

    try {
      const data = await VarjoyApp.post('/chat', {
        session_id: this.sessionId,
        message: text
      });

      this.setTyping(false);
      this.addBubble(data.reply, 'joy');

    } catch (err) {
      this.setTyping(false);
      if (err.message === 'Session expired') return;
      this.addBubble("sorry, ada gangguan bentar, coba lagi ya", 'joy');
      console.error(err);
    } finally {
      this.isWaiting = false;
      document.getElementById('chat-send-btn').disabled = false;
      input.focus();
    }
  },

  async resetChat() {
    if (!this.sessionId) return;

    try {
      await VarjoyApp.post('/reset', { session_id: this.sessionId });
    } catch (e) {}

    // Create new session
    try {
      const session = await VarjoyApp.post('/sessions', {});
      this.sessionId = session.id;
      localStorage.setItem('varjoy_session_id', this.sessionId);
    } catch (e) {}

    await this.loadMessages();
  },

  autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  },

  // ===================== SPEECH RECOGNITION =====================
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = 'id-ID';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      this.isRecording = true;
      const btn = document.getElementById('chat-mic-btn');
      btn.classList.add('recording');
      document.getElementById('chat-input').placeholder = 'Dengerin kamu...';
    };

    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      const input = document.getElementById('chat-input');
      input.value = transcript;
      this.autoResize(input);
    };

    rec.onend = () => {
      this.isRecording = false;
      const btn = document.getElementById('chat-mic-btn');
      btn.classList.remove('recording');
      document.getElementById('chat-input').placeholder = 'Ayo ungkapkan isi hatimu';

      const text = document.getElementById('chat-input').value.trim();
      if (text) this.sendMessage();
    };

    rec.onerror = (e) => {
      this.isRecording = false;
      document.getElementById('chat-mic-btn').classList.remove('recording');
      document.getElementById('chat-input').placeholder = 'Ayo ungkapkan isi hatimu';

      if (e.error === 'not-allowed') {
        this.addBubble("izin mikrofon ditolak, coba allow dulu di browser yaa", 'joy');
      }
    };

    return rec;
  },

  toggleMic() {
    if (!this.recognition) {
      this.recognition = this.initSpeechRecognition();
    }

    if (!this.recognition) {
      this.addBubble("browser kamu kayaknya ga support voice input dehh, coba pake Chrome yaa", 'joy');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }
};


// ============================================================
// Chat Settings Module
// ============================================================
const ChatSettings = {
  settings: {
    joyCallName: '',
    censoredWords: [],
    tone: 'Honest',
    desiredOutput: 'Assuring',
    language: 'Indonesian',
    notifyResponses: false
  },

  init() {
    this.loadSettings();
    document.getElementById('chat-settings-back')?.addEventListener('click', () => showScreen('chat'));
    document.getElementById('settings-notify-toggle')?.addEventListener('click', (e) => {
      this.settings.notifyResponses = !this.settings.notifyResponses;
      e.currentTarget.classList.toggle('active', this.settings.notifyResponses);
      this.saveSettings();
    });

    // Name input
    document.getElementById('settings-joy-name')?.addEventListener('change', (e) => {
      this.settings.joyCallName = e.target.value.trim();
      this.saveSettings();
    });

    // Tone buttons
    document.querySelectorAll('.tone-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tone-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.tone = btn.dataset.value;
        this.saveSettings();
      });
    });

    // Output buttons
    document.querySelectorAll('.output-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.output-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.desiredOutput = btn.dataset.value;
        this.saveSettings();
      });
    });

    // Censored words
    document.getElementById('settings-add-word')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const word = e.target.value.trim();
        if (word && !this.settings.censoredWords.includes(word)) {
          this.settings.censoredWords.push(word);
          this.renderCensoredWords();
          this.saveSettings();
        }
        e.target.value = '';
      }
    });
  },

  loadSettings() {
    const saved = localStorage.getItem('varjoy_chat_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {}
    }
    this.applyToUI();
  },

  saveSettings() {
    localStorage.setItem('varjoy_chat_settings', JSON.stringify(this.settings));
  },

  applyToUI() {
    const nameInput = document.getElementById('settings-joy-name');
    if (nameInput) nameInput.value = this.settings.joyCallName;

    const toggle = document.getElementById('settings-notify-toggle');
    if (toggle) toggle.classList.toggle('active', this.settings.notifyResponses);

    // Set active tone
    document.querySelectorAll('.tone-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === this.settings.tone);
    });

    // Set active output
    document.querySelectorAll('.output-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === this.settings.desiredOutput);
    });

    this.renderCensoredWords();
  },

  renderCensoredWords() {
    const container = document.getElementById('settings-censored-list');
    if (!container) return;

    container.innerHTML = this.settings.censoredWords.map(word => `
      <span class="settings-tag active" onclick="ChatSettings.removeWord('${word}')">
        ${word} ×
      </span>
    `).join('');
  },

  removeWord(word) {
    this.settings.censoredWords = this.settings.censoredWords.filter(w => w !== word);
    this.renderCensoredWords();
    this.saveSettings();
  }
};
