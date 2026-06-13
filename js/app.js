// -- VARJOY — App Navigation & Initialization --

let currentScreen = 'splash';

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById('screen-' + name);
  if (target) {
    target.classList.remove('hidden');
    currentScreen = name;
  }

  // Update bottom nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.screen === name);
  });

  // Show/hide bottom nav (only on main screens)
  const mainScreens = ['home', 'mood', 'chat', 'account'];
  const nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.style.display = mainScreens.includes(name) ? 'flex' : 'none';
  }
}

async function initChatAfterAuth() {
  showScreen('home');
  try {
    await Home.init();
    await Chat.init();
    await Mood.loadHistory();
    Journal.init();
    await Journal.loadJournals();
  } catch (e) {
    console.error('Init error:', e);
  }
}

// -- APP BOOT --
const initialHash = window.location.hash;
const initialSearch = window.location.search;

window.addEventListener('load', async () => {
  const searchParams = new URLSearchParams(initialSearch);
  const isRecovery = (initialHash && initialHash.includes('type=recovery')) ||
    searchParams.get('type') === 'recovery' ||
    (initialHash && initialHash.includes('access_token') && initialHash.includes('recovery'));

  await VarjoyApp.initSupabase();
  const client = VarjoyApp.getClient();

  if (isRecovery) {
    // Supabase sudah set session otomatis dari hash
    // Wait briefly for Supabase to process the recovery token
    await new Promise(r => setTimeout(r, 500));
    showScreen('reset-password');

    // Handle submit reset password
    document.getElementById('reset-submit-btn')?.addEventListener('click', async () => {
      const newPass = document.getElementById('reset-new-password').value;
      const confirmPass = document.getElementById('reset-confirm-password').value;
      const errorEl = document.getElementById('reset-error');
      errorEl.style.display = 'none';

      if (newPass.length < 6) {
        errorEl.textContent = 'Password minimal 6 karakter ya';
        errorEl.style.display = 'block';
        return;
      }
      if (newPass !== confirmPass) {
        errorEl.textContent = 'Password tidak sama nih';
        errorEl.style.display = 'block';
        return;
      }

      const btn = document.getElementById('reset-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      try {
        const { error } = await client.auth.updateUser({ password: newPass });
        if (error) throw error;
        VarjoyApp.showToast('Password berhasil diubah! 🎉');
        setTimeout(() => {
          // Clear the hash/params and go to login
          window.location.href = 'https://varjoy-web.vercel.app';
        }, 1500);
      } catch (err) {
        errorEl.textContent = err.message || 'Gagal reset password, coba lagi';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Simpan Password';
      }
    });

    return;
  }

  // Warm up backend biar ga cold start
  fetch('/config').catch(() => { });

  // Init Supabase
  await VarjoyApp.initSupabase();

  // Init chat settings module
  ChatSettings.init();

  // Check if user is already logged in
  const session = await VarjoyApp.getSession();

  if (session) {
    // User already logged in
    try {
      const profile = await VarjoyApp.get('/profile');
      if (profile?.display_name) {
        localStorage.setItem('userName', profile.display_name);
      }
    } catch (e) { }

    await initChatAfterAuth();
  } else {
    // Show splash
    showScreen('splash');
  }

  // Init auth module
  Auth.init();

  document.getElementById('reset-submit-btn')?.addEventListener('click', async () => {
    const newPass = document.getElementById('reset-new-password').value;
    const confirmPass = document.getElementById('reset-confirm-password').value;
    const errorEl = document.getElementById('reset-error');

    errorEl.style.display = 'none';

    if (newPass.length < 6) {
      errorEl.textContent = 'Password minimal 6 karakter ya';
      errorEl.style.display = 'block';
      return;
    }
    if (newPass !== confirmPass) {
      errorEl.textContent = 'Password tidak sama nih';
      errorEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('reset-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const client = VarjoyApp.getClient();
      const { error } = await client.auth.updateUser({ password: newPass });
      if (error) throw error;

      VarjoyApp.showToast('Password berhasil diubah! 🎉');
      setTimeout(() => showScreen('auth'), 1500);
    } catch (err) {
      errorEl.textContent = err.message || 'Gagal reset password, coba lagi';
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Password';
    }
  });

  // Bottom nav event listeners
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', async () => {
      const screen = item.dataset.screen;
      if (screen) {
        showScreen(screen);
        // Refresh data when navigating
        if (screen === 'home') await Home.init();
        if (screen === 'account') await Account.init();
        if (screen === 'mood') await Mood.loadHistory();
      }
    });
  });

  // Splash → Auth
  document.getElementById('btn-get-started')?.addEventListener('click', () => showScreen('auth'));

  // Viewport fix for mobile keyboards
  fixViewport();
  window.addEventListener('resize', fixViewport);
  window.visualViewport?.addEventListener('resize', fixViewport);
  window.visualViewport?.addEventListener('resize', () => {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  });
  document.addEventListener('focusin', () => {
    setTimeout(() => {
      const msgs = document.getElementById('chat-messages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 300);
  });
});

function fixViewport() {
  const vh = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;
  document.querySelector('.phone').style.height = vh + 'px';
}
