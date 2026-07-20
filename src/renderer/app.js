// Coordinateur single-page : bascule entre la vue "login" (#login-view) et la
// vue "connecté" (#app-view) sans jamais recharger le document. Chaque vue
// enregistre son API d'initialisation, et le routeur appelle init() au moment
// où la vue devient visible. Les transitions réutilisent les animations CSS
// existantes (.page-exit pour la sortie, fadeInUp rejoué pour l'entrée).
window.Ryvie = (function () {
  let loginApi = null; // { init }
  let appApi = null;   // { init }
  let currentView = null; // 'language' | 'login' | 'app'
  let started = false;
  let pendingView = null; // vue à afficher après le choix de langue au 1er lancement

  const TRANSITION_MS = 220;

  const VIEW_IDS = {
    language: 'language-view',
    login: 'login-view',
    app: 'app-view'
  };

  function viewEl(name) {
    return document.getElementById(VIEW_IDS[name]);
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
    window.I18n.apply(el);
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

  // Écran de choix de langue : affiché uniquement tant qu'aucune langue n'a été
  // choisie (premier lancement). Le choix est persisté, donc on n'y repasse plus.
  function setupLanguageChoice() {
    document.querySelectorAll('.language-choice-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.language-choice-btn').forEach((b) => { b.disabled = true; });
        await window.I18n.save(btn.getAttribute('data-lang'));
        switchTo(pendingView || 'login');
      });
    });
  }

  // Sélecteur de langue de l'écran de connexion
  function setupLanguageSwitcher() {
    const select = document.getElementById('language-select');
    if (!select) return;
    select.value = window.I18n.getLang();
    select.addEventListener('change', async () => {
      await window.I18n.save(select.value);
    });
    document.addEventListener('ryvie:language-changed', () => {
      select.value = window.I18n.getLang();
    });
  }

  async function start() {
    // On attend que les deux vues soient enregistrées avant de décider
    if (started || !loginApi || !appApi) return;
    started = true;

    // La langue doit être appliquée avant d'afficher quoi que ce soit,
    // sinon l'utilisateur voit un flash de texte non traduit.
    let chosenLanguage = null;
    try {
      chosenLanguage = await window.I18n.load();
    } catch (e) {
      console.error('[Ryvie][Router] Erreur chargement de la langue:', e);
    }

    setupLanguageChoice();
    setupLanguageSwitcher();

    let hasConfig = false;
    try {
      const cfg = await window.electronAPI.loadConfig();
      hasConfig = !!(cfg && (cfg.ryvieId || cfg.setupKey));
    } catch (e) {
      console.error('[Ryvie][Router] Erreur lecture config initiale:', e);
    }

    pendingView = hasConfig ? 'app' : 'login';

    if (!chosenLanguage) {
      console.log('[Ryvie][Router] Premier lancement: choix de la langue');
      switchTo('language');
      return;
    }

    console.log('[Ryvie][Router] Vue initiale:', pendingView);
    switchTo(pendingView);
  }

  return {
    registerLogin(api) { loginApi = api; start(); },
    registerApp(api) { appApi = api; start(); },
    showLogin() { switchTo('login'); },
    showApp() { switchTo('app'); },
  };
})();
