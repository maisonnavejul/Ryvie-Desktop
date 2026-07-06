// Vue CONNECTÉ — encapsulée dans une IIFE pour isoler son scope de login.js
// (les deux scripts cohabitent dans la même page en mode single-page).
(function () {
const LOCAL_APP_URL = 'http://ryvie.local';

let currentConfig = null;
let pendingNewConfig = null;
let hasAutoOpened = false; // évite les ouvertures multiples
let autoOpenTimer = null;  // timer de délai pour l'ouverture auto
let isInitialLoad = true;  // true uniquement au premier chargement de l'app
let isRyvieIdVisible = false;
let vpnStatusInterval = null; // timer pour vérifier le statut VPN périodiquement
let isNetbirdSetupInProgress = false; // true pendant le setup NetBird

// Éléments DOM
const loadingSection = document.getElementById('loading');
const connectedSection = document.getElementById('connected');
const disconnectedSection = document.getElementById('disconnected');
const errorSection = document.getElementById('error');
const warningModal = document.getElementById('warning-modal');
const disconnectModal = document.getElementById('disconnect-modal');
const confirmDisconnectBtn = document.getElementById('confirm-disconnect-btn');
const cancelDisconnectBtn = document.getElementById('cancel-disconnect-btn');

const connectionType = document.getElementById('connection-type');
const vpnStatusBadge = document.getElementById('vpn-status-badge');
const vpnStatusDot = document.getElementById('vpn-status-dot');
const vpnStatusText = document.getElementById('vpn-status-text');
const ryvieIdEl = document.getElementById('ryvie-id');
const ryvieIdValueEl = document.getElementById('ryvie-id-value');
const showRyvieIdBtn = document.getElementById('show-ryvie-id-btn');
const errorMessageEl = document.getElementById('error-message');
const openRyvieBtn = document.getElementById('open-ryvie-btn');
const refreshBtn = document.getElementById('refresh-btn');
const retryBtn = document.getElementById('retry-btn');
const disconnectBtn = document.getElementById('disconnect-btn');

const currentIdSpan = document.getElementById('current-id');
const newIdSpan = document.getElementById('new-id');
const acceptBtn = document.getElementById('accept-btn');
const refuseBtn = document.getElementById('refuse-btn');

const retryConnectionBtn = document.getElementById('retry-connection-btn');
const appTitleEl = document.getElementById('app-title');

const updateModal = document.getElementById('update-modal');
const updateVersionEl = document.getElementById('update-version');
const updateProgressEl = document.getElementById('update-progress');
const updateProgressBar = document.getElementById('update-progress-bar');
const updateProgressText = document.getElementById('update-progress-text');
const downloadUpdateBtn = document.getElementById('download-update-btn');
const installUpdateBtn = document.getElementById('install-update-btn');
const closeUpdateBtn = document.getElementById('close-update-btn');

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
  el.classList.remove('visible', 'hidden', 'active');
  if (visible) {
    el.classList.add('active');
    requestAnimationFrame(() => el.classList.add('visible'));
  } else {
    el.classList.add('hidden');
  }
}

// Fonctions d'affichage
function showLoading() {
  setVisibility(loadingSection, true);
  setVisibility(connectedSection, false);
  setVisibility(errorSection, false);
  setVisibility(disconnectedSection, false);
}

function showConnected() {
  setVisibility(loadingSection, false);
  setVisibility(errorSection, false);
  setVisibility(disconnectedSection, false);
  setVisibility(connectedSection, true);
  // Par défaut, le bouton reste désactivé tant que l'ouverture auto n'est pas terminée
  setButtonLoading(true);
}

function showError(message = 'Impossible de se connecter à Ryvie') {
  setVisibility(loadingSection, false);
  setVisibility(connectedSection, false);
  setVisibility(disconnectedSection, false);
  setVisibility(errorSection, true);
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
  }
}

function showDisconnected() {
  setVisibility(loadingSection, false);
  setVisibility(connectedSection, false);
  setVisibility(errorSection, false);
  setVisibility(disconnectedSection, true);
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

  // Single-page : le DOM persiste entre les vues -> réinitialiser l'état du bouton de
  // déconnexion (désactivé par une déconnexion précédente) à chaque affichage de la vue.
  if (disconnectBtn) {
    disconnectBtn.disabled = false;
    disconnectBtn.classList.remove('loading');
  }

  showLoading();

  // Charger la config sauvegardée
  const savedConfig = await window.electronAPI.loadConfig();
  console.log('[Ryvie][Renderer] Config sauvegardée:', savedConfig ? `ryvieId=${savedConfig.ryvieId}` : 'aucune');

  // Si pas de config, rediriger vers login
  if (!savedConfig || (!savedConfig.ryvieId && !savedConfig.setupKey)) {
    console.log('[Ryvie][Renderer] Aucune configuration trouvée, redirection vers login');
    window.Ryvie.showLogin();
    return;
  }

  // Tester le machine ID local
  console.log('[Ryvie][Renderer] 🔍 Test machine ID local...');
  const machineIdResult = await window.electronAPI.testMachineId();
  console.log('[Ryvie][Renderer] Résultat machine ID:', machineIdResult.success ? '✅ SUCCÈS' : '❌ ÉCHEC');

  if (machineIdResult.success) {
    // Machine ID local détecté
    const localMachineId = machineIdResult.ryvieId;
    console.log('[Ryvie][Renderer] 🏠 Machine ID local détecté:', localMachineId);

    // Vérifier si le Ryvie ID correspond
    if (savedConfig.ryvieId && savedConfig.ryvieId !== localMachineId) {
      console.warn('[Ryvie][Renderer] ⚠️  Machine ID différent détecté:', savedConfig.ryvieId, '->', localMachineId);
      console.log('[Ryvie][Renderer] 🌐 Basculement automatique en mode REMOTE');
      
      // ID différent - passer automatiquement en mode remote
      await switchToRemoteMode(savedConfig);
      return;
    }

    // Même ID - connexion locale
    console.log('[Ryvie][Renderer] ✅ Machine ID correspond, connexion locale');
    
    // Si on a un JWT token, l'utiliser pour récupérer les domaines
    if (savedConfig.jwtToken) {
      console.log('[Ryvie][Renderer] Utilisation du JWT token pour récupérer les domaines');
      const domainsResult = await window.electronAPI.getDomains(savedConfig.jwtToken);
      
      if (domainsResult.success) {
        const localData = domainsResult.data;
        console.log('[Ryvie][Renderer] ✅ Domaines récupérés avec JWT');
        console.log('[Ryvie][Renderer] localData.tunnelHost:', localData.tunnelHost);
        console.log('[Ryvie][Renderer] localData.setupKey:', localData.setupKey ? 'présent' : 'absent');
        
        currentConfig = {
          name: savedConfig.name,
          mode: 'local',
          ryvieId: localData.ryvieId,
          domains: localData.domains,
          tunnelHost: localData.tunnelHost,
          setupKey: localData.setupKey,
          url: LOCAL_APP_URL,
          jwtToken: savedConfig.jwtToken
        };
        
        await window.electronAPI.saveConfig(currentConfig);
        showConnected();
        updateUI(currentConfig);
        
        // Setup NetBird en arrière-plan
        if (localData.setupKey) {
          console.log('[Ryvie][Renderer] Configuration NetBird en arrière-plan');
          
          // Marquer le setup comme en cours
          isNetbirdSetupInProgress = true;
          
          // Afficher "Connexion en cours" pendant la configuration
          setVpnStatusConnecting();
          
          window.electronAPI.setupNetbird(localData.setupKey, localData.tunnelHost).then(netbirdResult => {
            // Marquer le setup comme terminé
            isNetbirdSetupInProgress = false;
            
            if (!netbirdResult.success) {
              console.error('[Ryvie][Renderer] Erreur setup NetBird:', netbirdResult.error);
            } else if (netbirdResult.alreadyConnected) {
              console.log('[Ryvie][Renderer] NetBird déjà connecté, tunnel accessible');
            } else {
              console.log('[Ryvie][Renderer] NetBird configuré avec succès');
            }
            
            // Mettre à jour le statut après la configuration
            updateVpnStatus();
          });
        }
      } else {
        console.warn('[Ryvie][Renderer] Échec récupération domaines avec JWT, utilisation config sauvegardée');
        currentConfig = savedConfig;
        currentConfig.mode = 'local';
        currentConfig.url = LOCAL_APP_URL;
        showConnected();
        updateUI(currentConfig);
      }
    } else {
      // Pas de JWT token, utiliser la config sauvegardée
      console.log('[Ryvie][Renderer] Pas de JWT token, utilisation config sauvegardée');
      currentConfig = savedConfig;
      currentConfig.mode = 'local';
      currentConfig.url = LOCAL_APP_URL;
      showConnected();
      updateUI(currentConfig);
    }
  } else {
    // Machine ID local non détecté - basculer en mode remote
    console.log('[Ryvie][Renderer] 🌐 Machine ID local non détecté -> mode REMOTE');
    await switchToRemoteMode(savedConfig);
    return;
  }
  
  // Appeler maybeAutoOpen UNE SEULE FOIS à la fin, après avoir configuré currentConfig
  console.log('[Ryvie][Renderer] 🚀 Connexion établie -> maybeAutoOpen');
  maybeAutoOpen();

  // Si l'utilisateur a déclenché manuellement (actualiser/réessayer), on réactive le bouton
  if (!isInitialLoad) {
    setButtonLoading(false);
  }
}

// Fonction pour basculer en mode remote
async function switchToRemoteMode(config) {
  console.log('[Ryvie][Renderer] Basculement en mode REMOTE');
  
  // Vérifier si c'est une configuration manuelle
  if (config && config.mode === 'manual' && config.tunnelHost) {
    console.log('[Ryvie][Renderer] 🔧 Configuration MANUELLE détectée - IP:', config.tunnelHost);
    const manualUrl = `http://${config.tunnelHost}:3000`;
      
      // Tester si l'URL manuelle est accessible
      try {
        const testResponse = await fetch(manualUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) 
        });
        
        if (!testResponse.ok) {
          throw new Error(`HTTP ${testResponse.status}`);
        }
      
      console.log('[Ryvie][Renderer] ✅ Connexion MANUELLE réussie');
      currentConfig = {
        name: config.name,
        mode: 'manual',
        ryvieId: config.ryvieId,
        tunnelHost: config.tunnelHost,
        setupKey: config.setupKey,
        url: manualUrl,
        domains: config.domains || {}
      };
      showConnected();
      updateUI(currentConfig);
      maybeAutoOpen();
      if (!isInitialLoad) {
        setButtonLoading(false);
      }
    } catch (error) {
      console.error('[Ryvie][Renderer] ❌ URL manuelle inaccessible:', error.message);
      showError('Impossible de joindre ce Ryvie. Vérifiez qu\'il est bien allumé et connecté à Internet.');
      return;
    }
  } else if (config && config.mode === 'local' && config.ryvieId) {
    // Mode local mais machine-id ne correspond pas (on est en switchToRemoteMode)
    // Tenter d'accéder via les domaines ou tunnelHost si disponibles
    if (config.domains && config.domains.app) {
      console.log('[Ryvie][Renderer] Mode LOCAL distant -> tentative via domaine app:', config.domains.app);
      const publicUrl = `https://${config.domains.app}`;
      try {
        const testResponse = await fetch(publicUrl, { method: 'GET', signal: AbortSignal.timeout(8000) });
        if (!testResponse.ok) throw new Error(`HTTP ${testResponse.status}`);
        console.log('[Ryvie][Renderer] ✅ Connexion remote via domaine réussie');
        currentConfig = {
          name: config.name,
          mode: 'remote',
          ryvieId: config.ryvieId,
          url: publicUrl,
          jwtToken: config.jwtToken,
          domains: config.domains || {}
        };
        showConnected();
        updateUI(currentConfig);
        maybeAutoOpen();
        if (!isInitialLoad) setButtonLoading(false);
      } catch (error) {
        console.error('[Ryvie][Renderer] ❌ Domaine app inaccessible:', error.message);
        showError('Impossible de joindre ce Ryvie. Vérifiez qu\'il est bien allumé et connecté à Internet.');
      }
    } else if (config.tunnelHost) {
      console.log('[Ryvie][Renderer] Mode LOCAL distant -> tentative via tunnelHost:', config.tunnelHost);
      const tunnelUrl = `http://${config.tunnelHost}:3000`;
      try {
        const testResponse = await fetch(tunnelUrl, { method: 'GET', signal: AbortSignal.timeout(8000) });
        if (!testResponse.ok) throw new Error(`HTTP ${testResponse.status}`);
        console.log('[Ryvie][Renderer] ✅ Connexion remote via tunnel réussie');
        currentConfig = {
          name: config.name,
          mode: 'remote',
          ryvieId: config.ryvieId,
          url: tunnelUrl,
          jwtToken: config.jwtToken,
          domains: config.domains || {}
        };
        showConnected();
        updateUI(currentConfig);
        maybeAutoOpen();
        if (!isInitialLoad) setButtonLoading(false);
      } catch (error) {
        console.error('[Ryvie][Renderer] ❌ Tunnel inaccessible:', error.message);
        showError('Impossible de joindre ce Ryvie. Vérifiez qu\'il est bien allumé et connecté à Internet.');
      }
    } else {
      console.warn('[Ryvie][Renderer] ⚠️ Ryvie local mais pas sur le bon réseau, aucun accès distant configuré');
      showError('Le Ryvie détecté en local n\'est pas celui de ce profil. Vérifiez que le bon Ryvie est allumé ou connectez-vous au même réseau.');
    }
    return;
  } else if (config && config.domains) {
    // Déterminer l'URL publique selon la présence de domains.app
    let publicUrl;
    if (config.domains.app) {
      // Cas 1: domains.app existe -> utiliser HTTPS
      publicUrl = `https://${config.domains.app}`;
      console.log('[Ryvie][Renderer] Mode REMOTE avec domaine app:', publicUrl);
    } else if (config.tunnelHost) {
      // Cas 2: pas de domains.app -> utiliser tunnelHost:3000
      publicUrl = `http://${config.tunnelHost}:3000`;
      console.log('[Ryvie][Renderer] Mode REMOTE avec tunnelHost:', publicUrl);
    } else {
      console.warn('[Ryvie][Renderer] ⚠️  Pas de domains.app ni tunnelHost');
      showError('Configuration incomplète. Veuillez vous reconnecter en local.');
      return;
    }
    
    console.log('[Ryvie][Renderer] Test accessibilité URL remote:', publicUrl);
    
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
      
      console.log('[Ryvie][Renderer] ✅ Passage en mode REMOTE');
      currentConfig = {
        name: config.name,
        mode: 'remote',
        ryvieId: config.ryvieId,
        domains: config.domains,
        tunnelHost: config.tunnelHost,
        url: publicUrl,
        jwtToken: config.jwtToken
      };
      await window.electronAPI.saveConfig(currentConfig);
      showConnected();
      updateUI(currentConfig);
      maybeAutoOpen();
      if (!isInitialLoad) {
        setButtonLoading(false);
      }
    } catch (error) {
      // URL publique inaccessible ou erreur réseau
      console.error('[Ryvie][Renderer] ❌ URL remote inaccessible:', error.message);
      showError('La connexion à votre Ryvie est impossible, merci de vérifier qu\'il est bien allumé');
      return;
    }
  } else {
    // Aucune config sauvegardée et pas de connexion locale
    console.warn('[Ryvie][Renderer] ⚠️  Aucune config + pas de réseau local');
    showError('Veuillez vous connecter une première fois à votre Ryvie depuis chez vous (réseau local).');
    return;
  }
}

// Fonction pour mettre à jour le statut d'accès distant
async function updateVpnStatus() {
  if (!vpnStatusBadge || !vpnStatusDot || !vpnStatusText) return;
  
  // Ne pas mettre à jour si le setup NetBird est en cours
  if (isNetbirdSetupInProgress) {
    console.log('[Ryvie][Renderer] Setup NetBird en cours, skip updateVpnStatus');
    return;
  }
  
  try {
    const status = await window.electronAPI.netbirdStatus();
    
    if (!status.installed) {
      // NetBird non installé
      vpnStatusDot.style.background = '#94a3b8';
      vpnStatusText.textContent = 'Inactif';
      vpnStatusBadge.style.background = 'rgba(148, 163, 184, 0.1)';
      vpnStatusBadge.style.color = '#64748b';
    } else if (status.connected) {
      // Accès distant actif
      vpnStatusDot.style.background = '#10b981';
      vpnStatusText.textContent = 'Actif';
      vpnStatusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
      vpnStatusBadge.style.color = '#059669';
    } else {
      // Accès distant inactif
      vpnStatusDot.style.background = '#f59e0b';
      vpnStatusText.textContent = 'Inactif';
      vpnStatusBadge.style.background = 'rgba(245, 158, 11, 0.1)';
      vpnStatusBadge.style.color = '#d97706';
    }
  } catch (error) {
    console.error('[Ryvie][Renderer] Erreur vérification statut accès distant:', error);
    vpnStatusDot.style.background = '#94a3b8';
    vpnStatusText.textContent = 'Erreur';
    vpnStatusBadge.style.background = 'rgba(148, 163, 184, 0.1)';
    vpnStatusBadge.style.color = '#64748b';
  }
}

// Fonction pour afficher l'état "Connexion en cours"
function setVpnStatusConnecting() {
  if (!vpnStatusBadge || !vpnStatusDot || !vpnStatusText) return;
  
  vpnStatusDot.style.background = '#3b82f6';
  vpnStatusText.textContent = 'Connexion en cours...';
  vpnStatusBadge.style.background = 'rgba(59, 130, 246, 0.1)';
  vpnStatusBadge.style.color = '#2563eb';
}

// Démarrer la vérification périodique du statut VPN
function startVpnStatusCheck() {
  // Vérifier immédiatement
  updateVpnStatus();
  
  // Puis vérifier toutes les 10 secondes
  if (vpnStatusInterval) {
    clearInterval(vpnStatusInterval);
  }
  vpnStatusInterval = setInterval(updateVpnStatus, 10000);
}

// Arrêter la vérification périodique du statut VPN
function stopVpnStatusCheck() {
  if (vpnStatusInterval) {
    clearInterval(vpnStatusInterval);
    vpnStatusInterval = null;
  }
}

function updateUI(config) {
  console.log('[Ryvie][Renderer] 🖥️  Mise à jour UI:', config.mode.toUpperCase(), '- ryvieId:', config.ryvieId);
  // Afficher le nom du Ryvie dans le titre (fallback si non défini, ex: anciennes configs)
  if (appTitleEl) {
    appTitleEl.textContent = config.name || 'Mon Ryvie';
  }
  if (config.mode === 'local') {
    connectionType.innerHTML = '<strong>Mode:</strong> Connexion Automatique <span aria-hidden="true">🏠</span>';
  } else if (config.mode === 'manual') {
    connectionType.innerHTML = '<strong>Mode:</strong> Connexion Manuelle <span aria-hidden="true">🔧</span>';
  } else if (config.mode === 'remote') {
    connectionType.innerHTML = '<strong>Mode:</strong> Connexion Distante <span aria-hidden="true">🌐</span>';
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
  
  // Démarrer la vérification du statut VPN
  startVpnStatusCheck();
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

// Ferme une modale avec une animation de sortie (le DOM persiste en single-page).
function closeModalAnimated(modalEl) {
  if (!modalEl || modalEl.classList.contains('hidden')) return;
  modalEl.classList.add('closing');
  setTimeout(() => {
    modalEl.classList.add('hidden');
    modalEl.classList.remove('closing');
  }, 180);
}

if (disconnectBtn) {
  disconnectBtn.addEventListener('click', () => {
    // Afficher la modale de confirmation (fondu d'entrée via l'animation CSS)
    if (disconnectModal) {
      disconnectModal.classList.remove('closing');
      disconnectModal.classList.remove('hidden');
    }
  });
}

if (confirmDisconnectBtn) {
  confirmDisconnectBtn.addEventListener('click', async () => {
    console.log('[Ryvie][Renderer] Déconnexion confirmée...');

    // Fermer la modale (fondu de sortie)
    closeModalAnimated(disconnectModal);
    
    // Désactiver le bouton de déconnexion
    if (disconnectBtn) {
      disconnectBtn.disabled = true;
      disconnectBtn.classList.add('loading');
    }
    
    // Arrêter la vérification VPN
    stopVpnStatusCheck();
    
    // Nettoyer les variables locales immédiatement
    currentConfig = null;
    pendingNewConfig = null;
    hasAutoOpened = false;
    isInitialLoad = false;
    isRyvieIdVisible = false;
    
    // Lancer la déconnexion en arrière-plan sans attendre
    window.electronAPI.disconnect().then(result => {
      if (result.success) {
        console.log('[Ryvie][Renderer] Déconnexion en arrière-plan réussie');
      } else {
        console.error('[Ryvie][Renderer] Erreur déconnexion en arrière-plan:', result.error);
      }
    }).catch(error => {
      console.error('[Ryvie][Renderer] Erreur déconnexion en arrière-plan:', error);
    });
    
    // Bascule vers la vue login (le routeur gère la transition fondu de sortie/entrée)
    console.log('[Ryvie][Renderer] Retour à la vue de connexion');
    window.Ryvie.showLogin();
  });
}

if (cancelDisconnectBtn) {
  cancelDisconnectBtn.addEventListener('click', () => {
    // Fermer la modale sans déconnecter (fondu de sortie)
    closeModalAnimated(disconnectModal);
  });
}

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
      isNetbirdSetupInProgress = true;
      setVpnStatusConnecting();
      
      const netbirdResult = await window.electronAPI.setupNetbird(pendingNewConfig.setupKey, pendingNewConfig.tunnelHost);
      isNetbirdSetupInProgress = false;
      
      if (!netbirdResult.success) {
        console.error('[Ryvie][Renderer] Erreur setup NetBird:', netbirdResult.error);
        showError('Erreur lors de la configuration du tunnel NetBird');
        hideWarningModal();
        return;
      }
      if (netbirdResult.alreadyConnected) {
        console.log('[Ryvie][Renderer] NetBird déjà connecté, tunnel accessible');
      } else {
        console.log('[Ryvie][Renderer] NetBird reconfigure avec succes');
      }
      updateVpnStatus();
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

if (retryConnectionBtn) {
  retryConnectionBtn.addEventListener('click', () => {
    isInitialLoad = false;
    checkConnection();
  });
}

// ========================================
// GESTION DES MISES À JOUR
// ========================================

function showUpdateModal(version) {
  if (!updateModal || !updateVersionEl) return;
  updateVersionEl.textContent = version;
  updateProgressEl.style.display = 'none';
  downloadUpdateBtn.style.display = 'inline-flex';
  installUpdateBtn.style.display = 'none';
  updateModal.classList.remove('hidden');
}

function hideUpdateModal() {
  if (!updateModal) return;
  updateModal.classList.add('hidden');
}

// Écouter les événements de mise à jour
if (window.electronAPI && window.electronAPI.onUpdateAvailable) {
  window.electronAPI.onUpdateAvailable((info) => {
    console.log('[Ryvie][Renderer] Mise à jour disponible:', info.version);
    showUpdateModal(info.version);
  });

  window.electronAPI.onDownloadProgress((progress) => {
    console.log('[Ryvie][Renderer] Progression téléchargement:', Math.round(progress.percent) + '%');
    if (updateProgressEl && updateProgressBar && updateProgressText) {
      updateProgressEl.style.display = 'block';
      updateProgressBar.style.width = progress.percent + '%';
      updateProgressText.textContent = `Téléchargement en cours... ${Math.round(progress.percent)}%`;
    }
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    console.log('[Ryvie][Renderer] Mise à jour téléchargée:', info.version);
    if (updateProgressText && downloadUpdateBtn && installUpdateBtn) {
      updateProgressText.textContent = 'Téléchargement terminé !';
      downloadUpdateBtn.style.display = 'none';
      installUpdateBtn.style.display = 'inline-flex';
    }
  });

  window.electronAPI.onUpdateError((error) => {
    console.error('[Ryvie][Renderer] Erreur mise à jour:', error);
    if (updateProgressText) {
      updateProgressText.textContent = 'Erreur lors du téléchargement';
      updateProgressText.style.color = '#ef4444';
    }
  });
}

// Bouton télécharger la mise à jour
if (downloadUpdateBtn) {
  downloadUpdateBtn.addEventListener('click', async () => {
    console.log('[Ryvie][Renderer] Téléchargement de la mise à jour...');
    downloadUpdateBtn.disabled = true;
    downloadUpdateBtn.classList.add('loading');
    
    try {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success) {
        console.error('[Ryvie][Renderer] Erreur téléchargement:', result.error);
        if (updateProgressText) {
          updateProgressText.textContent = 'Erreur lors du téléchargement';
          updateProgressText.style.color = '#ef4444';
        }
      }
    } catch (error) {
      console.error('[Ryvie][Renderer] Erreur:', error);
    } finally {
      downloadUpdateBtn.disabled = false;
      downloadUpdateBtn.classList.remove('loading');
    }
  });
}

// Bouton installer la mise à jour
if (installUpdateBtn) {
  installUpdateBtn.addEventListener('click', async () => {
    console.log('[Ryvie][Renderer] Installation de la mise à jour...');
    installUpdateBtn.disabled = true;
    installUpdateBtn.classList.add('loading');
    
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('[Ryvie][Renderer] Erreur installation:', error);
      installUpdateBtn.disabled = false;
      installUpdateBtn.classList.remove('loading');
    }
  });
}

// Bouton fermer la modal de mise à jour
if (closeUpdateBtn) {
  closeUpdateBtn.addEventListener('click', () => {
    hideUpdateModal();
  });
}

// Fermer la modal si on clique en dehors
if (updateModal) {
  updateModal.addEventListener('click', (e) => {
    if (e.target === updateModal) {
      hideUpdateModal();
    }
  });
}

// Écouter les mises à jour de statut NetBird en temps réel
if (window.electronAPI && window.electronAPI.onNetbirdStatus) {
  window.electronAPI.onNetbirdStatus((statusUpdate) => {
    console.log('[Ryvie][Renderer] Mise à jour statut NetBird:', statusUpdate);
    
    if (!vpnStatusBadge || !vpnStatusDot || !vpnStatusText) return;
    
    if (statusUpdate.status === 'connecting') {
      // Connexion en cours
      isNetbirdSetupInProgress = true;
      vpnStatusDot.style.background = '#3b82f6';
      vpnStatusText.textContent = statusUpdate.message || 'Connexion en cours...';
      vpnStatusBadge.style.background = 'rgba(59, 130, 246, 0.1)';
      vpnStatusBadge.style.color = '#2563eb';
    } else if (statusUpdate.status === 'connected') {
      // Connecté avec succès
      isNetbirdSetupInProgress = false;
      vpnStatusDot.style.background = '#10b981';
      vpnStatusText.textContent = 'Actif';
      vpnStatusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
      vpnStatusBadge.style.color = '#059669';
    } else if (statusUpdate.status === 'timeout' || statusUpdate.status === 'error') {
      // Timeout ou erreur
      isNetbirdSetupInProgress = false;
      vpnStatusDot.style.background = '#ef4444';
      vpnStatusText.textContent = 'Erreur de connexion';
      vpnStatusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
      vpnStatusBadge.style.color = '#dc2626';
    }
  });
}

// Enregistrement auprès du routeur single-page.
// checkConnection() est appelé par app.js à chaque affichage de la vue connectée
// (au démarrage si une config existe, et après un login/switch de profil).
window.Ryvie.registerApp({ init: checkConnection });
})();
