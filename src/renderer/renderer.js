const LOCAL_APP_URL = 'http://ryvie.local:3000';

let currentConfig = null;
let pendingNewConfig = null;
let hasAutoOpened = false; // évite les ouvertures multiples
let autoOpenTimer = null;  // timer de délai pour l'ouverture auto
let isInitialLoad = true;  // true uniquement au premier chargement de l'app

// Éléments DOM
const loadingSection = document.getElementById('loading');
const connectedSection = document.getElementById('connected');
const errorSection = document.getElementById('error');
const warningModal = document.getElementById('warning-modal');

const connectionType = document.getElementById('connection-type');
const ryvieIdEl = document.getElementById('ryvie-id');
const openRyvieBtn = document.getElementById('open-ryvie-btn');
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');

const currentIdSpan = document.getElementById('current-id');
const newIdSpan = document.getElementById('new-id');
const acceptBtn = document.getElementById('accept-btn');
const refuseBtn = document.getElementById('refuse-btn');

// Helpers UI
function setButtonLoading(isLoading) {
  if (!openRyvieBtn) return;
  if (isLoading) {
    openRyvieBtn.classList.add('loading');
    openRyvieBtn.disabled = true;
  } else {
    openRyvieBtn.classList.remove('loading');
    openRyvieBtn.disabled = false;
  }
}
function setVisibility(el, visible) {
  if (!el) return;
  el.classList.remove('visible');
  el.classList.remove('hidden');
  el.classList.add(visible ? 'visible' : 'hidden');
}

// Fonctions d'affichage
function showLoading() {
  setVisibility(loadingSection, true);
  setVisibility(connectedSection, false);
  setVisibility(errorSection, false);
}

function showConnected() {
  setVisibility(loadingSection, false);
  setVisibility(connectedSection, true);
  setVisibility(errorSection, false);
  // Par défaut, le bouton reste désactivé tant que l'ouverture auto n'est pas terminée
  setButtonLoading(true);
}

function showError() {
  setVisibility(loadingSection, false);
  setVisibility(connectedSection, false);
  setVisibility(errorSection, true);
}

function showWarningModal(currentId, newId) {
  currentIdSpan.textContent = currentId;
  newIdSpan.textContent = newId;
  warningModal.classList.remove('hidden');
}

function hideWarningModal() {
  warningModal.classList.add('hidden');
}

function maybeAutoOpen() {
  // IMPORTANT: N'ouvrir QUE si c'est le chargement initial ET qu'on n'a pas encore ouvert
  if (!isInitialLoad || hasAutoOpened) {
    return;
  }
  
  // Annuler tout timer existant pour éviter les doublons
  if (autoOpenTimer) {
    clearTimeout(autoOpenTimer);
    autoOpenTimer = null;
  }
  
  // Marquer immédiatement comme "en cours d'ouverture" pour éviter les appels multiples
  hasAutoOpened = true;
  setButtonLoading(true);
  
  if (currentConfig && currentConfig.url) {
    autoOpenTimer = setTimeout(() => {
      window.electronAPI.openUrl(currentConfig.url);
      autoOpenTimer = null;
      // Une fois ouvert automatiquement, on réactive le bouton
      setButtonLoading(false);
    }, 2000); // 1.2s après l'affichage de la page "Connecté"
  }
}

// Logique de connexion
async function checkConnection() {
  showLoading();

  // Charger la config sauvegardée
  const savedConfig = await window.electronAPI.loadConfig();

  // Tester la connexion locale
  const localResult = await window.electronAPI.testLocalConnection();

  if (localResult.success) {
    // Connexion locale réussie
    const localData = localResult.data;

    // Vérifier si le Ryvie ID a changé
    if (savedConfig && savedConfig.ryvieId && savedConfig.ryvieId !== localData.ryvieId) {
      // ID différent - afficher l'avertissement
      pendingNewConfig = {
        mode: 'local',
        ryvieId: localData.ryvieId,
        domains: localData.domains,
        url: LOCAL_APP_URL
      };
      showWarningModal(savedConfig.ryvieId, localData.ryvieId);
      showConnected(); // Afficher l'ancienne connexion en arrière-plan
      updateUI(savedConfig);
    } else {
      // Même ID ou pas de config précédente - connexion directe
      currentConfig = {
        mode: 'local',
        ryvieId: localData.ryvieId,
        domains: localData.domains,
        url: LOCAL_APP_URL
      };
      await window.electronAPI.saveConfig(currentConfig);
      showConnected();
      updateUI(currentConfig);
    }
  } else {
    // Connexion locale échouée - utiliser le mode public
    if (savedConfig && savedConfig.domains && savedConfig.domains.app) {
      currentConfig = {
        mode: 'public',
        ryvieId: savedConfig.ryvieId,
        domains: savedConfig.domains,
        url: `https://${savedConfig.domains.app}`
      };
      showConnected();
      updateUI(currentConfig);
    } else {
      // Aucune config sauvegardée et pas de connexion locale
      showError();
      return; // Sortir sans appeler maybeAutoOpen
    }
  }
  
  // Appeler maybeAutoOpen UNE SEULE FOIS à la fin, après avoir configuré currentConfig
  maybeAutoOpen();
}

function updateUI(config) {
  if (config.mode === 'local') {
    connectionType.innerHTML = '<strong>Mode:</strong> Connexion Locale <span aria-hidden="true">🏠</span>';
  } else {
    connectionType.innerHTML = '<strong>Mode:</strong> Connexion Publique <span aria-hidden="true">🌐</span>';
  }
  ryvieIdEl.innerHTML = `<strong>Ryvie ID:</strong> ${config.ryvieId || '—'}`;
}

// Gestionnaires d'événements
openRyvieBtn.addEventListener('click', () => {
  if (currentConfig && currentConfig.url) {
    // Annuler le timer d'auto-ouverture si l'utilisateur clique manuellement
    if (autoOpenTimer) { 
      clearTimeout(autoOpenTimer); 
      autoOpenTimer = null; 
    }
    hasAutoOpened = true;
    setButtonLoading(true);
    isInitialLoad = false;
    window.electronAPI.openUrl(currentConfig.url);
    // Réactiver après un court délai pour éviter double clic
    setTimeout(() => setButtonLoading(false), 1200);
  }
});

refreshBtn.addEventListener('click', () => {
  // Désactiver l'auto-ouverture pour les refreshs manuels
  isInitialLoad = false;
  checkConnection();
});

retryBtn.addEventListener('click', () => {
  // Désactiver l'auto-ouverture pour les retry manuels
  isInitialLoad = false;
  checkConnection();
});

acceptBtn.addEventListener('click', async () => {
  if (pendingNewConfig) {
    currentConfig = pendingNewConfig;
    await window.electronAPI.saveConfig(currentConfig);
    updateUI(currentConfig);
    hideWarningModal();
    pendingNewConfig = null;
    // Ne pas appeler maybeAutoOpen ici car c'est une action manuelle
  }
});

refuseBtn.addEventListener('click', () => {
  hideWarningModal();
  pendingNewConfig = null;
  // Garder l'ancienne configuration
  if (currentConfig) {
    // Basculer en mode public si le local est refusé
    currentConfig.mode = 'public';
    currentConfig.url = `https://${currentConfig.domains.app}`;
    updateUI(currentConfig);
  }
});

// Démarrage de l'application
checkConnection();
