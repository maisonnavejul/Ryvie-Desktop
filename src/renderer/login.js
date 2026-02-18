let uidInput, passwordInput, loginBtn, loginError, manualSetupBtnLogin;
let manualSetupModal, manualSetupKeyInput, manualSetupError, manualSetupConfirmBtn, manualSetupCancelBtn;
let loadingSection, firstTimeSection, loginSection, firstTimeForm, firstTimeError;
let firstTimeUidInput, firstTimeEmailInput, firstTimeLanguageSelect, firstTimePasswordInput, firstTimeConfirmPasswordInput, firstTimeCreateBtn;
let isFirstTimeSetup = false;

// Attendre que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Ryvie][Login] DOM chargé, initialisation...');
  
  // Récupérer les éléments
  uidInput = document.getElementById('uid-input');
  passwordInput = document.getElementById('password-input');
  loginBtn = document.getElementById('login-btn');
  loginError = document.getElementById('login-error');
  manualSetupBtnLogin = document.getElementById('manual-setup-btn-login');
  
  manualSetupModal = document.getElementById('manual-setup-modal');
  manualSetupKeyInput = document.getElementById('manual-setup-key-input');
  manualSetupError = document.getElementById('manual-setup-error');
  manualSetupConfirmBtn = document.getElementById('manual-setup-confirm-btn');
  manualSetupCancelBtn = document.getElementById('manual-setup-cancel-btn');
  
  // Éléments first-time setup
  loadingSection = document.getElementById('loading-section');
  firstTimeSection = document.getElementById('first-time-section');
  loginSection = document.getElementById('login-section');
  firstTimeForm = document.getElementById('first-time-form');
  firstTimeError = document.getElementById('first-time-error');
  firstTimeUidInput = document.getElementById('first-time-uid-input');
  firstTimeEmailInput = document.getElementById('first-time-email-input');
  firstTimeLanguageSelect = document.getElementById('first-time-language-select');
  firstTimePasswordInput = document.getElementById('first-time-password-input');
  firstTimeConfirmPasswordInput = document.getElementById('first-time-confirm-password-input');
  firstTimeCreateBtn = document.getElementById('first-time-create-btn');
  
  // Forcer l'activation des champs
  if (uidInput) {
    uidInput.removeAttribute('disabled');
    uidInput.removeAttribute('readonly');
    uidInput.disabled = false;
    uidInput.readOnly = false;
    uidInput.value = '';
    uidInput.style.pointerEvents = 'auto';
    uidInput.style.userSelect = 'text';
    console.log('[Ryvie][Login] UID input activé');
  }
  
  if (passwordInput) {
    passwordInput.removeAttribute('disabled');
    passwordInput.removeAttribute('readonly');
    passwordInput.disabled = false;
    passwordInput.readOnly = false;
    passwordInput.value = '';
    passwordInput.style.pointerEvents = 'auto';
    passwordInput.style.userSelect = 'text';
    console.log('[Ryvie][Login] Password input activé');
  }
  
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.classList.remove('loading');
    loginBtn.innerHTML = '<span>Se connecter</span>';
  }
  
  if (loginError) {
    loginError.style.display = 'none';
  }
  
  // Attacher les événements
  attachEventListeners();
  
  // Vérifier si c'est la première fois
  checkFirstTimeSetup();
  
  console.log('[Ryvie][Login] Page complètement initialisée');
});

function attachEventListeners() {
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  
  if (uidInput) {
    uidInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }
  
  if (manualSetupBtnLogin) {
    manualSetupBtnLogin.addEventListener('click', showManualSetupModal);
  }
  
  if (manualSetupConfirmBtn) {
    manualSetupConfirmBtn.addEventListener('click', handleManualSetup);
  }
  
  if (manualSetupCancelBtn) {
    manualSetupCancelBtn.addEventListener('click', hideManualSetupModal);
  }
  
  if (firstTimeCreateBtn) {
    firstTimeCreateBtn.addEventListener('click', handleFirstTimeSetup);
  }
}

function showManualSetupModal() {
  manualSetupModal.classList.remove('hidden');
  manualSetupKeyInput.value = '';
  manualSetupError.style.display = 'none';
  manualSetupKeyInput.focus();
}

function hideManualSetupModal() {
  manualSetupModal.classList.add('hidden');
  manualSetupKeyInput.value = '';
  manualSetupError.style.display = 'none';
}

async function handleLogin() {
  const uid = uidInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!uid || !password) {
    loginError.textContent = 'Veuillez remplir tous les champs';
    loginError.style.display = 'block';
    return;
  }
  
  loginBtn.disabled = true;
  loginBtn.classList.add('loading');
  loginBtn.innerHTML = '<span class="btn-spinner"></span><span>Connexion...</span>';
  loginError.style.display = 'none';
  
  try {
    console.log('[Ryvie][Login] Tentative d\'authentification...');
    
    // Authentification
    const authResult = await window.electronAPI.authenticate({ uid, password });
    
    if (!authResult.success) {
      console.error('[Ryvie][Login] Authentification échouée:', authResult.error);
      loginError.textContent = authResult.error || 'Identifiants incorrects';
      loginError.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = '<span>Se connecter</span>';
      return;
    }
    
    console.log('[Ryvie][Login] Authentification réussie, récupération des domaines...');
    
    // Récupérer les domaines avec le token JWT
    const domainsResult = await window.electronAPI.getDomains(authResult.token);
    
    if (!domainsResult.success) {
      console.error('[Ryvie][Login] Erreur récupération domaines');
      loginError.textContent = 'Erreur lors de la récupération des informations';
      loginError.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = '<span>Se connecter</span>';
      return;
    }
    
    const localData = domainsResult.data;
    console.log('[Ryvie][Login] Données récupérées avec succès');
    
    // Créer la configuration
    const config = {
      mode: 'local',
      ryvieId: localData.ryvieId,
      domains: localData.domains,
      tunnelHost: localData.tunnelHost,
      setupKey: localData.setupKey,
      url: 'http://ryvie.local',
      jwtToken: authResult.token
    };
    
    // Sauvegarder la configuration
    await window.electronAPI.saveConfig(config);
    console.log('[Ryvie][Login] Configuration sauvegardée');
    
    // Rediriger vers la page principale (NetBird sera configuré par renderer.js)
    console.log('[Ryvie][Login] Redirection vers la page principale...');
    window.location.href = 'index.html';
    
  } catch (error) {
    console.error('[Ryvie][Login] Erreur inattendue:', error);
    loginError.textContent = 'Erreur inattendue: ' + error.message;
    loginError.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.classList.remove('loading');
    loginBtn.innerHTML = '<span>Se connecter</span>';
  }
}

async function checkFirstTimeSetup() {
  try {
    console.log('[Ryvie][Login] Vérification first-time setup...');
    const result = await window.electronAPI.checkFirstTime();
    
    if (result.success && result.isFirstTime) {
      console.log('[Ryvie][Login] Premier utilisateur détecté, affichage du formulaire de création');
      isFirstTimeSetup = true;
      showFirstTimeSetup();
    } else {
      console.log('[Ryvie][Login] Utilisateurs existants, affichage du formulaire de connexion');
      isFirstTimeSetup = false;
      showLoginForm();
    }
  } catch (error) {
    console.error('[Ryvie][Login] Erreur vérification first-time:', error);
    showLoginForm();
  }
}

function hideLoading() {
  if (loadingSection) {
    loadingSection.classList.remove('visible');
    loadingSection.style.display = 'none';
  }
}

function setCompactHeader(compact) {
  const logo = document.querySelector('.header .logo');
  const title = document.querySelector('.header h1');
  const header = document.querySelector('.header');
  if (compact) {
    if (logo) { logo.style.width = '50px'; logo.style.height = '50px'; logo.style.marginBottom = '4px'; }
    if (title) { title.style.fontSize = '18px'; }
    if (header) { header.style.marginBottom = '6px'; }
  } else {
    if (logo) { logo.style.width = ''; logo.style.height = ''; logo.style.marginBottom = ''; }
    if (title) { title.style.fontSize = ''; }
    if (header) { header.style.marginBottom = ''; }
  }
}

function showFirstTimeSetup() {
  hideLoading();
  setCompactHeader(true);
  if (loginSection) {
    loginSection.classList.remove('visible');
    loginSection.style.display = 'none';
  }
  if (firstTimeSection) {
    firstTimeSection.style.display = 'block';
    requestAnimationFrame(() => firstTimeSection.classList.add('visible'));
  }
}

function showLoginForm() {
  hideLoading();
  setCompactHeader(false);
  if (firstTimeSection) {
    firstTimeSection.classList.remove('visible');
    firstTimeSection.style.display = 'none';
  }
  if (loginSection) {
    loginSection.style.display = 'block';
    requestAnimationFrame(() => loginSection.classList.add('visible'));
  }
}

async function handleFirstTimeSetup() {
  const uid = firstTimeUidInput.value.trim();
  const email = firstTimeEmailInput.value.trim();
  const language = firstTimeLanguageSelect.value;
  const password = firstTimePasswordInput.value.trim();
  const confirmPassword = firstTimeConfirmPasswordInput.value.trim();
  
  if (!uid || !email || !password || !confirmPassword) {
    firstTimeError.textContent = 'Veuillez remplir tous les champs';
    firstTimeError.style.display = 'block';
    return;
  }
  
  if (password !== confirmPassword) {
    firstTimeError.textContent = 'Les mots de passe ne correspondent pas';
    firstTimeError.style.display = 'block';
    return;
  }
  
  if (password.length < 6) {
    firstTimeError.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
    firstTimeError.style.display = 'block';
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    firstTimeError.textContent = 'Adresse email invalide';
    firstTimeError.style.display = 'block';
    return;
  }
  
  firstTimeCreateBtn.disabled = true;
  firstTimeCreateBtn.classList.add('loading');
  firstTimeCreateBtn.innerHTML = '<span class="btn-spinner"></span><span>Création...</span>';
  firstTimeError.style.display = 'none';
  
  try {
    console.log('[Ryvie][Login] Création du premier utilisateur...');
    
    const createResult = await window.electronAPI.createFirstUser({
      uid: uid,
      name: uid,
      email: email,
      password: password,
      language: language
    });
    
    if (!createResult.success) {
      console.error('[Ryvie][Login] Erreur création utilisateur:', createResult.error);
      firstTimeError.textContent = createResult.error || 'Erreur lors de la création';
      firstTimeError.style.display = 'block';
      firstTimeCreateBtn.disabled = false;
      firstTimeCreateBtn.classList.remove('loading');
      firstTimeCreateBtn.innerHTML = '<span>Créer le compte</span>';
      return;
    }
    
    console.log('[Ryvie][Login] Utilisateur créé avec succès, authentification...');
    
    const authResult = await window.electronAPI.authenticate({ uid, password });
    
    if (!authResult.success) {
      console.error('[Ryvie][Login] Authentification échouée après création:', authResult.error);
      firstTimeError.textContent = 'Utilisateur créé mais erreur d\'authentification';
      firstTimeError.style.display = 'block';
      firstTimeCreateBtn.disabled = false;
      firstTimeCreateBtn.classList.remove('loading');
      firstTimeCreateBtn.innerHTML = '<span>Créer le compte</span>';
      return;
    }
    
    console.log('[Ryvie][Login] Authentification réussie, récupération des domaines...');
    
    const domainsResult = await window.electronAPI.getDomains(authResult.token);
    
    if (!domainsResult.success) {
      console.error('[Ryvie][Login] Erreur récupération domaines');
      firstTimeError.textContent = 'Erreur lors de la récupération des informations';
      firstTimeError.style.display = 'block';
      firstTimeCreateBtn.disabled = false;
      firstTimeCreateBtn.classList.remove('loading');
      firstTimeCreateBtn.innerHTML = '<span>Créer le compte</span>';
      return;
    }
    
    const localData = domainsResult.data;
    console.log('[Ryvie][Login] Données récupérées avec succès');
    
    const config = {
      mode: 'local',
      ryvieId: localData.ryvieId,
      domains: localData.domains,
      tunnelHost: localData.tunnelHost,
      setupKey: localData.setupKey,
      url: 'http://ryvie.local',
      jwtToken: authResult.token
    };
    
    await window.electronAPI.saveConfig(config);
    console.log('[Ryvie][Login] Configuration sauvegardée');
    
    console.log('[Ryvie][Login] Redirection vers la page principale...');
    window.location.href = 'index.html';
    
  } catch (error) {
    console.error('[Ryvie][Login] Erreur inattendue:', error);
    firstTimeError.textContent = 'Erreur inattendue: ' + error.message;
    firstTimeError.style.display = 'block';
    firstTimeCreateBtn.disabled = false;
    firstTimeCreateBtn.classList.remove('loading');
    firstTimeCreateBtn.innerHTML = '<span>Créer le compte</span>';
  }
}

async function handleManualSetup() {
  const configKey = manualSetupKeyInput.value.trim();
  
  if (!configKey) {
    manualSetupError.textContent = 'Veuillez entrer une clé de configuration';
    manualSetupError.style.display = 'block';
    manualSetupKeyInput.focus();
    return;
  }
  
  // Parse le format UUID-IP (ex: E455957B-10FE-4ED0-9F43-26D55E826E36-100.104.13.12)
  const lastDashIndex = configKey.lastIndexOf('-');
  if (lastDashIndex === -1) {
    manualSetupError.textContent = 'Format de clé invalide (attendu: UUID-IP)';
    manualSetupError.style.display = 'block';
    manualSetupKeyInput.focus();
    return;
  }
  
  const setupKey = configKey.substring(0, lastDashIndex);
  const tunnelIp = configKey.substring(lastDashIndex + 1);
  
  if (!setupKey || !tunnelIp) {
    manualSetupError.textContent = 'Clé de configuration incomplète';
    manualSetupError.style.display = 'block';
    manualSetupKeyInput.focus();
    return;
  }
  
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (!ipRegex.test(tunnelIp)) {
    manualSetupError.textContent = 'Format d\'IP invalide dans la clé (ex: UUID-100.64.0.1)';
    manualSetupError.style.display = 'block';
    manualSetupKeyInput.focus();
    return;
  }
  
  manualSetupConfirmBtn.disabled = true;
  manualSetupConfirmBtn.classList.add('loading');
  manualSetupConfirmBtn.innerHTML = '<span class="btn-spinner"></span><span>Configuration...</span>';
  manualSetupError.style.display = 'none';
  
  try {
    console.log('[Ryvie][Login] Configuration manuelle NetBird avec IP:', tunnelIp);
    
    const netbirdResult = await window.electronAPI.setupNetbird(setupKey, tunnelIp);
    
    if (!netbirdResult.success) {
      console.error('[Ryvie][Login] Erreur setup NetBird:', netbirdResult.error);
      manualSetupError.textContent = 'Erreur lors de la configuration: ' + (netbirdResult.error || 'Erreur inconnue');
      manualSetupError.style.display = 'block';
      manualSetupConfirmBtn.disabled = false;
      manualSetupConfirmBtn.classList.remove('loading');
      manualSetupConfirmBtn.innerHTML = '<span>Confirmer</span>';
      return;
    }
    
    if (netbirdResult.alreadyConnected) {
      console.log('[Ryvie][Login] NetBird déjà connecté, tunnel accessible');
    } else {
      console.log('[Ryvie][Login] NetBird configuré avec succès');
    }
    
    const manualConfig = {
      mode: 'manual',
      ryvieId: 'manual-' + Date.now(),
      tunnelHost: tunnelIp,
      setupKey: setupKey,
      url: `http://${tunnelIp}:3000`,
      domains: {}
    };
    
    await window.electronAPI.saveConfig(manualConfig);
    console.log('[Ryvie][Login] Configuration manuelle sauvegardée');
    
    hideManualSetupModal();
    window.location.href = 'index.html';
    
  } catch (error) {
    console.error('[Ryvie][Login] Erreur inattendue:', error);
    manualSetupError.textContent = 'Erreur inattendue: ' + error.message;
    manualSetupError.style.display = 'block';
  } finally {
    manualSetupConfirmBtn.disabled = false;
    manualSetupConfirmBtn.classList.remove('loading');
    manualSetupConfirmBtn.innerHTML = '<span>Confirmer</span>';
  }
}
