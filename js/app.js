// ============================================================
// VARJOY — App Navigation & Initialization
// ============================================================

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
  } catch (e) {
    console.error('Init error:', e);
  }
}

// ===================== APP BOOT =====================
window.addEventListener('load', async () => {
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
    } catch (e) {}

    await initChatAfterAuth();
  } else {
    // Show splash
    showScreen('splash');
  }

  // Init auth module
  Auth.init();

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
