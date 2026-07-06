// Coordinateur single-page : bascule entre la vue "login" (#login-view) et la
// vue "connecté" (#app-view) sans jamais recharger le document. Chaque vue
// enregistre son API d'initialisation, et le routeur appelle init() au moment
// où la vue devient visible. Les transitions réutilisent les animations CSS
// existantes (.page-exit pour la sortie, fadeInUp rejoué pour l'entrée).
window.Ryvie = (function () {
  let loginApi = null; // { init }
  let appApi = null;   // { init }
  let currentView = null; // 'login' | 'app'
  let started = false;

  const TRANSITION_MS = 220;

  function viewEl(name) {
    return document.getElementById(name === 'login' ? 'login-view' : 'app-view');
  }

  // Rejoue l'animation d'entrée (fadeInUp) du container de la vue affichée
  function replayEntrance(container) {
    if (!container) return;
    container.classList.remove('page-exit');
    container.style.animation = 'none';
    void container.offsetWidth; // force un reflow pour relancer l'animation
    container.style.animation = '';
  }

  function activate(name) {
    const el = viewEl(name);
    if (!el) return;
    el.classList.add('view-active');
    replayEntrance(el.querySelector('.container'));
    currentView = name;
    if (name === 'login' && loginApi) loginApi.init();
    if (name === 'app' && appApi) appApi.init();
  }

  function switchTo(name) {
    // Si on est déjà sur la vue, on ré-initialise simplement (ex: retour login)
    if (currentView === name) {
      if (name === 'login' && loginApi) loginApi.init();
      if (name === 'app' && appApi) appApi.init();
      return;
    }

    const fromEl = currentView ? viewEl(currentView) : null;
    const fromContainer = fromEl ? fromEl.querySelector('.container') : null;

    if (fromContainer) fromContainer.classList.add('page-exit');

    setTimeout(() => {
      if (fromEl) fromEl.classList.remove('view-active');
      if (fromContainer) fromContainer.classList.remove('page-exit');
      activate(name);
    }, fromEl ? TRANSITION_MS : 0);
  }

  async function start() {
    // On attend que les deux vues soient enregistrées avant de décider
    if (started || !loginApi || !appApi) return;
    started = true;

    let hasConfig = false;
    try {
      const cfg = await window.electronAPI.loadConfig();
      hasConfig = !!(cfg && (cfg.ryvieId || cfg.setupKey));
    } catch (e) {
      console.error('[Ryvie][Router] Erreur lecture config initiale:', e);
    }

    console.log('[Ryvie][Router] Vue initiale:', hasConfig ? 'app' : 'login');
    switchTo(hasConfig ? 'app' : 'login');
  }

  return {
    registerLogin(api) { loginApi = api; start(); },
    registerApp(api) { appApi = api; start(); },
    showLogin() { switchTo('login'); },
    showApp() { switchTo('app'); },
  };
})();
