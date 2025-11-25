const LOCAL_APP_URL = 'http://ryvie.local:3000';

let currentConfig = null;
let pendingNewConfig = null;
let hasAutoOpened = false; // évite les ouvertures multiples
let autoOpenTimer = null;  // timer de délai pour l'ouverture auto
let isInitialLoad = true;  // true uniquement au premier chargement de l'app
let isRyvieIdVisible = false;

// Éléments DOM
const loadingSection = document.getElementById('loading');
const connectedSection = document.getElementById('connected');
const errorSection = document.getElementById('error');
const warningModal = document.getElementById('warning-modal');

const connectionType = document.getElementById('connection-type');
const ryvieIdEl = document.getElementById('ryvie-id');
const ryvieIdValueEl = document.getElementById('ryvie-id-value');
const showRyvieIdBtn = document.getElementById('show-ryvie-id-btn');
const errorMessageEl = document.getElementById('error-message');
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

function showError(message = 'Impossible de se connecter à Ryvie') {
  setVisibility(loadingSection, false);
  setVisibility(connectedSection, false);
  setVisibility(errorSection, true);
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
  }
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
  console.log('[Ryvie][Renderer] === Vérification connexion démarrée ===');
  showLoading();

  // Charger la config sauvegardée
  const savedConfig = await window.electronAPI.loadConfig();
  console.log('[Ryvie][Renderer] Config sauvegardée:', savedConfig ? `ryvieId=${savedConfig.ryvieId}` : 'aucune');

  // Tester la connexion locale
  console.log('[Ryvie][Renderer] 🔍 Lancement test connexion locale...');
  const localResult = await window.electronAPI.testLocalConnection();
  console.log('[Ryvie][Renderer] Résultat test local:', localResult.success ? '✅ SUCCÈS' : '❌ ÉCHEC');

  if (localResult.success) {
    // Connexion locale réussie
    const localData = localResult.data;
    console.log('[Ryvie][Renderer] 🏠 Connexion LOCALE détectée - ryvieId:', localData.ryvieId);

    // Vérifier si le Ryvie ID a changé
    if (savedConfig && savedConfig.ryvieId && savedConfig.ryvieId !== localData.ryvieId) {
      console.warn('[Ryvie][Renderer] ⚠️  RyvieID différent détecté:', savedConfig.ryvieId, '->', localData.ryvieId);
      // ID différent - afficher l'avertissement
      pendingNewConfig = {
        mode: 'local',
        ryvieId: localData.ryvieId,
        domains: localData.domains,
        tunnelHost: localData.tunnelHost,
        setupKey: localData.setupKey,
        url: LOCAL_APP_URL
      };
      showWarningModal(savedConfig.ryvieId, localData.ryvieId);
      showConnected(); // Afficher l'ancienne connexion en arrière-plan
      updateUI(savedConfig);
    } else {
      // Même ID ou pas de config précédente - connexion directe
      console.log('[Ryvie][Renderer] ✅ Passage en mode LOCAL');
      currentConfig = {
        mode: 'local',
        ryvieId: localData.ryvieId,
        domains: localData.domains,
        tunnelHost: localData.tunnelHost,
        setupKey: localData.setupKey,
        url: LOCAL_APP_URL
      };
      
      await window.electronAPI.saveConfig(currentConfig);
      showConnected();
      updateUI(currentConfig);
      
      // Setup NetBird en arrière-plan APRÈS avoir affiché l'UI et permis l'ouverture
      if (localData.setupKey) {
        console.log('[Ryvie][Renderer] Verification et setup NetBird en arriere-plan');
        // Ne pas bloquer l'UI, lancer en async sans await
        window.electronAPI.setupNetbird(localData.setupKey).then(netbirdResult => {
          if (!netbirdResult.success) {
            console.error('[Ryvie][Renderer] Erreur setup NetBird:', netbirdResult.error);
          } else {
            console.log('[Ryvie][Renderer] NetBird configure avec succes');
          }
        });
      }
    }
  } else {
    // Connexion locale échouée - utiliser le mode public
    console.log('[Ryvie][Renderer] 🌐 Test local KO -> tentative connexion PUBLIQUE');
    if (savedConfig && savedConfig.domains) {
      // Déterminer l'URL publique selon la présence de domains.app
      let publicUrl;
      if (savedConfig.domains.app) {
        // Cas 1: domains.app existe -> utiliser HTTPS
        publicUrl = `https://${savedConfig.domains.app}`;
        console.log('[Ryvie][Renderer] Mode PUBLIC avec domaine app:', publicUrl);
      } else if (savedConfig.tunnelHost) {
        // Cas 2: pas de domains.app -> utiliser tunnelHost:3000
        publicUrl = `http://${savedConfig.tunnelHost}:3000`;
        console.log('[Ryvie][Renderer] Mode PUBLIC avec tunnelHost:', publicUrl);
      } else {
        console.warn('[Ryvie][Renderer] ⚠️  Pas de domains.app ni tunnelHost');
        showError('Configuration incomplète. Veuillez vous reconnecter en local.');
        return;
      }
      
      console.log('[Ryvie][Renderer] Test accessibilité URL publique:', publicUrl);
      
      // Tester si l'URL publique est accessible
      try {
        const testResponse = await fetch(publicUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) 
        });
        
        // Vérifier que la réponse est OK (status 200-299)
        if (!testResponse.ok) {
          throw new Error(`HTTP ${testResponse.status}`);
        }
        
        console.log('[Ryvie][Renderer] ✅ Passage en mode PUBLIC');
        currentConfig = {
          mode: 'public',
          ryvieId: savedConfig.ryvieId,
          domains: savedConfig.domains,
          tunnelHost: savedConfig.tunnelHost,
          url: publicUrl
        };
        showConnected();
        updateUI(currentConfig);
      } catch (error) {
        // URL publique inaccessible ou erreur réseau
        console.error('[Ryvie][Renderer] ❌ URL publique inaccessible:', error.message);
        showError('La connexion à votre Ryvie est impossible, merci de vérifier qu\'il est bien allumé');
        return; // Sortir sans appeler maybeAutoOpen
      }
    } else {
      // Aucune config sauvegardée et pas de connexion locale
      console.warn('[Ryvie][Renderer] ⚠️  Aucune config + pas de réseau local');
      showError('Veuillez vous connecter une première fois à votre Ryvie depuis chez vous (réseau local).');
      return; // Sortir sans appeler maybeAutoOpen
    }
  }
  
  // Appeler maybeAutoOpen UNE SEULE FOIS à la fin, après avoir configuré currentConfig
  console.log('[Ryvie][Renderer] 🚀 Connexion établie -> maybeAutoOpen');
  maybeAutoOpen();

  // Si l'utilisateur a déclenché manuellement (actualiser/réessayer), on réactive le bouton
  if (!isInitialLoad) {
    setButtonLoading(false);
  }
}

function updateUI(config) {
  console.log('[Ryvie][Renderer] 🖥️  Mise à jour UI:', config.mode.toUpperCase(), '- ryvieId:', config.ryvieId);
  if (config.mode === 'local') {
    connectionType.innerHTML = '<strong>Mode:</strong> Connexion Locale <span aria-hidden="true">🏠</span>';
  } else {
    connectionType.innerHTML = '<strong>Mode:</strong> Connexion Publique <span aria-hidden="true">🌐</span>';
  }
  if (ryvieIdValueEl) {
    if (config.ryvieId) {
      ryvieIdValueEl.textContent = isRyvieIdVisible
        ? config.ryvieId
        : '••••••••••••••••••••••••';
    } else {
      ryvieIdValueEl.textContent = '—';
    }
  }
  if (showRyvieIdBtn) {
    showRyvieIdBtn.title = isRyvieIdVisible ? 'Masquer' : 'Afficher';
    showRyvieIdBtn.style.display = config.ryvieId ? 'inline-flex' : 'none';
  }
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
    console.log('[Ryvie][Renderer] 👆 Clic utilisateur -> ouverture', currentConfig.url);
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

if (showRyvieIdBtn && ryvieIdValueEl) {
  showRyvieIdBtn.addEventListener('click', () => {
    if (!currentConfig || !currentConfig.ryvieId) {
      return;
    }
    isRyvieIdVisible = !isRyvieIdVisible;
    ryvieIdValueEl.textContent = isRyvieIdVisible
      ? currentConfig.ryvieId
      : '••••••••••••••••••••••••';
    showRyvieIdBtn.title = isRyvieIdVisible ? 'Masquer' : 'Afficher';
  });
}

acceptBtn.addEventListener('click', async () => {
  if (pendingNewConfig) {
    // Changement de Ryvie -> Setup NetBird avec la nouvelle setupKey
    if (pendingNewConfig.setupKey) {
      console.log('[Ryvie][Renderer] Changement de Ryvie -> Setup NetBird');
      const netbirdResult = await window.electronAPI.setupNetbird(pendingNewConfig.setupKey);
      if (!netbirdResult.success) {
        console.error('[Ryvie][Renderer] Erreur setup NetBird:', netbirdResult.error);
        showError('Erreur lors de la configuration du tunnel NetBird');
        hideWarningModal();
        return;
      }
      console.log('[Ryvie][Renderer] NetBird reconfigure avec succes');
    }
    
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
    if (currentConfig.domains.app) {
      currentConfig.url = `https://${currentConfig.domains.app}`;
    } else if (currentConfig.tunnelHost) {
      currentConfig.url = `http://${currentConfig.tunnelHost}:3000`;
    }
    updateUI(currentConfig);
  }
});

// Démarrage de l'application
checkConnection();
