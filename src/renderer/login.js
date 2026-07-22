// Vue LOGIN — encapsulée dans une IIFE pour isoler son scope de renderer.js
// (les deux scripts cohabitent dans la même page en mode single-page).
(function () {
const LOCAL_APP_URL = 'http://ryvie.local';

let uidInput, passwordInput, loginBtn, loginError;
let loadingSection, firstTimeSection, loginSection, firstTimeForm, firstTimeError;
let firstTimeUidInput, firstTimeEmailInput, firstTimeLanguageSelect, firstTimePasswordInput, firstTimeConfirmPasswordInput, firstTimeCreateBtn;
let ryvieNameSection, ryvieNameInput, ryvieNameError, ryvieNameBtn;
let pendingFirstTimeData = null;
let usersSelectionSection, usersList, addUserBtn, usersError;
let confirmDeleteModal, confirmDeleteMessage, confirmDeleteBtn, cancelDeleteBtn;
let profileNameInput, methodLocalTab, methodManualTab, localFields, manualFields, manualSetupKeyInput;
let headerTitle, backToUsersBtn;
let renameModal, renameInput, renameError, confirmRenameBtn, cancelRenameBtn;
let renameAvatarPreview, renameImportBtn, renameRemoveBtn;
let renamePendingAvatar; // undefined = inchangé, null = retirer, string = nouvelle image
let userToRename = null;
let userToRenameKey = null;
let allUsers = [];
let isFirstTimeSetup = false;
let userToDelete = null;
let isConnecting = false;
let currentConnectionAbortController = null;
let currentConnectionMethod = 'local';

// Initialisation de la vue login. Appelée par le routeur (app.js) à chaque
// affichage de la vue. Le grab d'éléments et l'attache des listeners sont
// idempotents (guard dans attachEventListeners) ; l'état des champs est réinitialisé.
function bootLogin() {
  console.log('[Ryvie][Login] Initialisation de la vue login...');
  
  // Récupérer les éléments
  uidInput = document.getElementById('uid-input');
  passwordInput = document.getElementById('password-input');
  loginBtn = document.getElementById('login-btn');
  loginError = document.getElementById('login-error');
  profileNameInput = document.getElementById('profile-name-input');
  methodLocalTab = document.getElementById('method-local-tab');
  methodManualTab = document.getElementById('method-manual-tab');
  localFields = document.getElementById('local-fields');
  manualFields = document.getElementById('manual-fields');
  manualSetupKeyInput = document.getElementById('manual-setup-key-input');
  // Ciblage par id : plusieurs vues possèdent un `.header h1` (choix de langue,
  // login, vue connectée), un sélecteur générique attraperait la mauvaise.
  headerTitle = document.getElementById('login-header-title');
  backToUsersBtn = document.getElementById('back-to-users-btn');
  
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
  
  // Éléments nommage Ryvie
  ryvieNameSection = document.getElementById('ryvie-name-section');
  ryvieNameInput = document.getElementById('ryvie-name-input');
  ryvieNameError = document.getElementById('ryvie-name-error');
  ryvieNameBtn = document.getElementById('ryvie-name-btn');
  
  // Éléments sélection utilisateurs
  usersSelectionSection = document.getElementById('users-selection-section');
  usersList = document.getElementById('users-list');
  addUserBtn = document.getElementById('add-user-btn');
  usersError = document.getElementById('users-error');
  
  // Éléments modal confirmation suppression
  confirmDeleteModal = document.getElementById('confirm-delete-modal');
  confirmDeleteMessage = document.getElementById('confirm-delete-message');
  confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  
  // Éléments modal renommage
  renameModal = document.getElementById('rename-modal');
  renameInput = document.getElementById('rename-input');
  renameError = document.getElementById('rename-error');
  confirmRenameBtn = document.getElementById('confirm-rename-btn');
  cancelRenameBtn = document.getElementById('cancel-rename-btn');
  renameAvatarPreview = document.getElementById('rename-avatar-preview');
  renameImportBtn = document.getElementById('rename-import-btn');
  renameRemoveBtn = document.getElementById('rename-remove-btn');
  
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
    loginBtn.innerHTML = `<span>${t('common.signIn')}</span>`;
  }
  
  if (loginError) {
    loginError.style.display = 'none';
  }
  
  // Attacher les événements
  attachEventListeners();
  
  // Initialiser la méthode de connexion par défaut
  setConnectionMethod('local');
  
  console.log('[Ryvie][Login] Page complètement initialisée');
  
  // Vérifier si c'est la première fois
  checkFirstTimeSetup();

  console.log('[Ryvie][Login] Page complètement initialisée');
}

function setConnectionMethod(method) {
  currentConnectionMethod = method;
  
  if (method === 'local') {
    // Activer l'onglet Locale
    if (methodLocalTab) methodLocalTab.classList.add('active');
    if (methodManualTab) methodManualTab.classList.remove('active');
    // Afficher les champs locaux
    if (localFields) localFields.style.display = 'block';
    if (manualFields) manualFields.style.display = 'none';
  } else {
    // Activer l'onglet Manuelle
    if (methodLocalTab) methodLocalTab.classList.remove('active');
    if (methodManualTab) methodManualTab.classList.add('active');
    // Afficher les champs manuels
    if (localFields) localFields.style.display = 'none';
    if (manualFields) manualFields.style.display = 'block';
  }
  
  // Cacher l'erreur lors du changement de méthode
  if (loginError) {
    loginError.style.display = 'none';
  }
}

let listenersAttached = false;
function attachEventListeners() {
  // Idempotent : les listeners ne sont attachés qu'une seule fois même si
  // la vue login est réaffichée (ex: après déconnexion).
  if (listenersAttached) return;
  listenersAttached = true;

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
  
  // Event listeners pour les onglets de méthode
  if (methodLocalTab) {
    methodLocalTab.addEventListener('click', () => {
      setConnectionMethod('local');
    });
  }
  
  if (methodManualTab) {
    methodManualTab.addEventListener('click', () => {
      setConnectionMethod('manual');
    });
  }
  
  // Event listener pour le bouton de retour à la sélection de profil
  if (backToUsersBtn) {
    backToUsersBtn.addEventListener('click', () => {
      cancelCurrentConnection();
      showSection('users-selection-section');
    });
  }
  
  if (firstTimeCreateBtn) {
    firstTimeCreateBtn.addEventListener('click', handleFirstTimeSetup);
  }
  
  if (ryvieNameBtn) {
    ryvieNameBtn.addEventListener('click', handleRyvieName);
  }
  
  // Event listeners pour la section utilisateurs
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      cancelCurrentConnection();
      showSection('login-section');
    });
  }

  // Carrousel infini : flèches, boucle au scroll, et curseur (slider) de défilement
  const carouselPrev = document.getElementById('carousel-prev');
  const carouselNext = document.getElementById('carousel-next');
  carouselSlider = document.getElementById('carousel-slider');
  if (carouselPrev) carouselPrev.addEventListener('click', () => {
    if (carouselStep) usersList.scrollBy({ left: -carouselStep, behavior: 'smooth' });
  });
  if (carouselNext) carouselNext.addEventListener('click', () => {
    if (carouselStep) usersList.scrollBy({ left: carouselStep, behavior: 'smooth' });
  });
  if (usersList) {
    usersList.addEventListener('scroll', () => {
      carouselWrap();
      syncSliderFromScroll();
    });
  }
  if (carouselSlider) {
    carouselSlider.addEventListener('input', () => {
      if (!carouselCopyWidth) return;
      carouselSliderActive = true;
      const lo = carouselCopyWidth * 0.5;
      usersList.scrollLeft = lo + (Number(carouselSlider.value) / 1000) * carouselCopyWidth;
    });
    const stopSlider = () => { carouselSliderActive = false; };
    carouselSlider.addEventListener('change', stopSlider);
    carouselSlider.addEventListener('pointerup', stopSlider);
    carouselSlider.addEventListener('mouseup', stopSlider);
  }

  // Event listeners pour le modal de confirmation suppression
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (userToDelete) {
        await executeRemoveUser();
        hideConfirmDeleteModal();
      }
    });
  }
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', hideConfirmDeleteModal);
  }
  if (confirmDeleteModal) {
    confirmDeleteModal.addEventListener('click', (e) => {
      if (e.target === confirmDeleteModal) {
        hideConfirmDeleteModal();
      }
    });
  }
  
  // Event listeners pour le modal de renommage
  if (confirmRenameBtn) {
    confirmRenameBtn.addEventListener('click', executeRename);
  }
  if (cancelRenameBtn) {
    cancelRenameBtn.addEventListener('click', hideRenameModal);
  }
  if (renameModal) {
    renameModal.addEventListener('click', (e) => {
      if (e.target === renameModal) {
        hideRenameModal();
      }
    });
  }

  // Modale "Modifier ce profil" : import / retrait de l'image d'avatar
  if (renameImportBtn) {
    renameImportBtn.addEventListener('click', async () => {
      const dataUrl = await pickImageDataUrl();
      if (dataUrl) {
        renamePendingAvatar = dataUrl;
        updateRenamePreview(dataUrl);
      }
    });
  }
  if (renameRemoveBtn) {
    renameRemoveBtn.addEventListener('click', () => {
      renamePendingAvatar = null;
      updateRenamePreview(null);
    });
  }
}

async function handleLogin() {
  const profileName = profileNameInput ? profileNameInput.value.trim() : '';
  
  if (currentConnectionMethod === 'local') {
    const uid = uidInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!profileName || !uid || !password) {
      loginError.textContent = t('errors.fillAllFields');
      loginError.style.display = 'block';
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    loginBtn.innerHTML = `<span class="btn-spinner"></span><span>${t('common.connecting')}</span>`;
    loginError.style.display = 'none';
    
    try {
      console.log('[Ryvie][Login] Tentative d\'authentification locale...');
      
      const authResult = await window.electronAPI.authenticate({ uid, password });
      
      if (!authResult.success) {
        console.error('[Ryvie][Login] Erreur authentification:', authResult.error);
        loginError.textContent = t('errors.authError', { details: authResult.error });
        loginError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.innerHTML = `<span>${t('common.signIn')}</span>`;
        return;
      }
      
      console.log('[Ryvie][Login] Authentification réussie, récupération des domaines...');
      
      // Récupérer les domaines, setupKey et tunnelHost via le JWT
      const domainsResult = await window.electronAPI.getDomains(authResult.token);
      
      let setupKey = null;
      let tunnelHost = null;
      let domains = {};
      let ryvieId = authResult.ryvieId;
      
      if (domainsResult.success && domainsResult.data) {
        setupKey = domainsResult.data.setupKey || null;
        tunnelHost = domainsResult.data.tunnelHost || null;
        domains = domainsResult.data.domains || {};
        ryvieId = domainsResult.data.ryvieId || ryvieId;
        console.log('[Ryvie][Login] Domaines récupérés, setupKey:', setupKey ? 'présent' : 'absent');
      } else {
        console.warn('[Ryvie][Login] Impossible de récupérer les domaines, continuation sans');
      }
      
      // Configurer NetBird si une setupKey est disponible
      if (setupKey) {
        console.log('[Ryvie][Login] Configuration de NetBird...');
        const netbirdResult = await window.electronAPI.setupNetbird(setupKey, tunnelHost);
        if (netbirdResult.success) {
          console.log('[Ryvie][Login] NetBird configuré avec succès');
        } else {
          console.warn('[Ryvie][Login] Erreur configuration NetBird:', netbirdResult.error);
        }
      } else {
        console.warn('[Ryvie][Login] Pas de setupKey, NetBird non configuré');
      }
      
      // Créer le profil utilisateur avec le nom personnalisé
      const userConfig = {
        uid: uid,
        name: profileName || uid,
        email: '',
        role: authResult.role || 'User',
        ryvieId: ryvieId,
        setupKey: setupKey,
        tunnelHost: tunnelHost,
        jwtToken: authResult.token,
        domains: domains,
        mode: 'local'
      };
      
      await window.electronAPI.saveUserConfig(userConfig);
      console.log('[Ryvie][Login] Profil utilisateur sauvegardé');
      
      // Sauvegarder la configuration
      const config = {
        name: profileName || uid,
        uid: uid,
        mode: 'local',
        ryvieId: ryvieId,
        url: LOCAL_APP_URL,
        jwtToken: authResult.token,
        domains: domains
      };
      await window.electronAPI.saveConfig(config);
      console.log('[Ryvie][Login] Configuration sauvegardée');
      
      // Rediriger vers la page principale
      console.log('[Ryvie][Login] Redirection vers la page principale...');
      window.Ryvie.showApp();
      
    } catch (error) {
      console.error('[Ryvie][Login] Erreur inattendue:', error);
      loginError.textContent = t('errors.unexpected', { details: error.message });
      loginError.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = `<span>${t('common.signIn')}</span>`;
    }
  } else {
    // Mode manuel
    const setupKey = manualSetupKeyInput ? manualSetupKeyInput.value.trim() : '';
    
    if (!profileName || !setupKey) {
      loginError.textContent = t('errors.fillAllFields');
      loginError.style.display = 'block';
      return;
    }
    
    // Parse le format UUID-IP (ex: E455957B-10FE-4ED0-9F43-26D55E826E36-100.104.13.12)
    const lastDashIndex = setupKey.lastIndexOf('-');
    if (lastDashIndex === -1) {
      loginError.textContent = t('errors.invalidKeyFormat');
      loginError.style.display = 'block';
      return;
    }
    
    const key = setupKey.substring(0, lastDashIndex);
    const tunnelIp = setupKey.substring(lastDashIndex + 1);
    
    if (!key || !tunnelIp) {
      loginError.textContent = t('errors.incompleteKey');
      loginError.style.display = 'block';
      return;
    }
    
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (!ipRegex.test(tunnelIp)) {
      loginError.textContent = t('errors.invalidIpInKey');
      loginError.style.display = 'block';
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    loginBtn.innerHTML = `<span class="btn-spinner"></span><span>${t('common.connecting')}</span>`;
    loginError.style.display = 'none';
    
    try {
      console.log('[Ryvie][Login] Tentative de connexion manuelle avec IP:', tunnelIp);
      
      const setupResult = await window.electronAPI.setupNetbird(key, tunnelIp);
      
      if (!setupResult.success) {
        console.error('[Ryvie][Login] Erreur setup NetBird:', setupResult.error);
        loginError.textContent = t('errors.configError', { details: setupResult.error });
        loginError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.innerHTML = `<span>${t('common.signIn')}</span>`;
        return;
      }
      
      console.log('[Ryvie][Login] NetBird configuré avec succès');
      
      // Créer le profil utilisateur manuel
      const userConfig = {
        uid: profileName,
        name: profileName,
        email: '',
        role: 'User',
        ryvieId: 'manual-' + Date.now(),
        setupKey: key,
        tunnelHost: tunnelIp,
        jwtToken: '',
        domains: [],
        mode: 'manual'
      };
      
      await window.electronAPI.saveUserConfig(userConfig);
      console.log('[Ryvie][Login] Profil utilisateur manuel sauvegardé');
      
      // Sauvegarder la configuration
      const config = {
        name: profileName,
        uid: profileName,
        mode: 'manual',
        ryvieId: 'manual-' + Date.now(),
        url: `http://${tunnelIp}:3000`,
        jwtToken: '',
        domains: {},
        setupKey: key,
        tunnelHost: tunnelIp
      };
      await window.electronAPI.saveConfig(config);
      console.log('[Ryvie][Login] Configuration sauvegardée');
      
      // Rediriger vers la page principale
      console.log('[Ryvie][Login] Redirection vers la page principale...');
      window.Ryvie.showApp();
      
    } catch (error) {
      console.error('[Ryvie][Login] Erreur inattendue:', error);
      loginError.textContent = t('errors.unexpected', { details: error.message });
      loginError.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = `<span>${t('common.signIn')}</span>`;
    }
  }
}

async function handleRyvieName() {
  const ryvieName = ryvieNameInput.value.trim();
  
  if (!ryvieName) {
    ryvieNameError.textContent = t('errors.enterName');
    ryvieNameError.style.display = 'block';
    return;
  }
  
  if (!pendingFirstTimeData) {
    ryvieNameError.textContent = t('errors.missingData');
    ryvieNameError.style.display = 'block';
    return;
  }
  
  const { uid, email, password } = pendingFirstTimeData;
  
  ryvieNameBtn.disabled = true;
  ryvieNameBtn.classList.add('loading');
  ryvieNameBtn.innerHTML = `<span class="btn-spinner"></span><span>${t('common.connecting')}</span>`;
  ryvieNameError.style.display = 'none';
  
  try {
    console.log('[Ryvie][Login] Authentification après création...');
    
    const authResult = await window.electronAPI.authenticate({ uid, password });
    
    if (!authResult.success) {
      console.error('[Ryvie][Login] Authentification échouée:', authResult.error);
      ryvieNameError.textContent = t('errors.authFailed');
      ryvieNameError.style.display = 'block';
      ryvieNameBtn.disabled = false;
      ryvieNameBtn.classList.remove('loading');
      ryvieNameBtn.innerHTML = `<span>${t('common.continue')}</span>`;
      return;
    }
    
    console.log('[Ryvie][Login] Authentification réussie, récupération des domaines...');
    
    const domainsResult = await window.electronAPI.getDomains(authResult.token);
    
    if (!domainsResult.success) {
      console.error('[Ryvie][Login] Erreur récupération domaines');
      ryvieNameError.textContent = t('errors.fetchInfoError');
      ryvieNameError.style.display = 'block';
      ryvieNameBtn.disabled = false;
      ryvieNameBtn.classList.remove('loading');
      ryvieNameBtn.innerHTML = `<span>${t('common.continue')}</span>`;
      return;
    }
    
    const localData = domainsResult.data;
    console.log('[Ryvie][Login] Données récupérées avec succès');
    
    if (localData.setupKey) {
      console.log('[Ryvie][Login] Configuration de NetBird...');
      const netbirdResult = await window.electronAPI.setupNetbird(localData.setupKey, localData.tunnelHost);
      if (netbirdResult.success) {
        console.log('[Ryvie][Login] NetBird configuré avec succès');
      } else {
        console.warn('[Ryvie][Login] Erreur configuration NetBird:', netbirdResult.error);
      }
    }
    
    const config = {
      name: ryvieName,
      mode: 'local',
      ryvieId: localData.ryvieId,
      domains: localData.domains,
      tunnelHost: localData.tunnelHost,
      setupKey: localData.setupKey,
      url: 'http://ryvie.local',
      jwtToken: authResult.token
    };
    
    const userConfig = {
      uid: uid,
      name: ryvieName,
      email: email,
      role: localData.role || 'User',
      ryvieId: localData.ryvieId,
      setupKey: localData.setupKey,
      tunnelHost: localData.tunnelHost,
      jwtToken: authResult.token,
      domains: localData.domains,
      mode: 'local'
    };
    
    await window.electronAPI.saveUserConfig(userConfig);
    console.log('[Ryvie][Login] Profil utilisateur sauvegardé');
    
    await window.electronAPI.saveConfig(config);
    console.log('[Ryvie][Login] Configuration sauvegardée');
    
    console.log('[Ryvie][Login] Redirection vers la page principale...');
    window.Ryvie.showApp();

  } catch (error) {
    console.error('[Ryvie][Login] Erreur inattendue:', error);
    ryvieNameError.textContent = t('errors.unexpected', { details: error.message });
    ryvieNameError.style.display = 'block';
    ryvieNameBtn.disabled = false;
    ryvieNameBtn.classList.remove('loading');
    ryvieNameBtn.innerHTML = `<span>${t('common.continue')}</span>`;
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
      console.log('[Ryvie][Login] Utilisateurs existants, vérification des utilisateurs sauvegardés...');
      // Vérifier s'il y a des utilisateurs sauvegardés
      const usersResult = await window.electronAPI.getAllUsers();
      
      if (usersResult.success && usersResult.users && usersResult.users.length > 0) {
        console.log('[Ryvie][Login] Utilisateurs sauvegardés détectés:', usersResult.users.length);
        isFirstTimeSetup = false;
        loadAndShowUsers(usersResult.users);
      } else {
        console.log('[Ryvie][Login] Pas d\'utilisateurs sauvegardés, affichage du formulaire de connexion');
        isFirstTimeSetup = false;
        showLoginForm();
      }
    }
  } catch (error) {
    console.error('[Ryvie][Login] Erreur vérification first-time:', error);
    showLoginForm();
  }
}

function hideLoading() {
  if (loadingSection) {
    loadingSection.classList.remove('visible', 'active');
  }
}

function activateSection(sectionEl) {
  const allSections = [loadingSection, loginSection, firstTimeSection, usersSelectionSection];
  allSections.forEach(s => {
    if (s) s.classList.remove('visible', 'active');
  });
  if (sectionEl) {
    sectionEl.classList.add('active');
    requestAnimationFrame(() => sectionEl.classList.add('visible'));
  }
}

function setCompactHeader(compact) {
  // Portée limitée à la vue login : un sélecteur global viserait le header de
  // l'écran de choix de langue, qui apparaît en premier dans le document.
  const loginView = document.getElementById('login-view');
  const title = loginView ? loginView.querySelector('.header h1') : null;
  const header = loginView ? loginView.querySelector('.header') : null;
  if (compact) {
    if (title) { title.style.fontSize = '18px'; }
    if (header) { header.style.marginBottom = '6px'; }
  } else {
    if (title) { title.style.fontSize = ''; }
    if (header) { header.style.marginBottom = ''; }
  }
}

function showFirstTimeSetup() {
  hideLoading();
  setCompactHeader(true);
  activateSection(firstTimeSection);
}

function getUniqueProfileName() {
  const baseName = 'Mon Ryvie';
  const usersArray = Array.isArray(allUsers) ? allUsers : Object.values(allUsers);
  const existingNames = usersArray.map(u => u.name || u.uid || '');
  
  if (!existingNames.includes(baseName)) {
    return baseName;
  }
  
  let i = 2;
  while (existingNames.includes(baseName + ' ' + i)) {
    i++;
  }
  return baseName + ' ' + i;
}

function showLoginForm() {
  hideLoading();
  setCompactHeader(false);
  if (headerTitle) {
    headerTitle.textContent = t('login.createProfile');
  }
  activateSection(loginSection);
  
  if (profileNameInput) {
    profileNameInput.value = getUniqueProfileName();
  }
}

function showSection(sectionId) {
  hideLoading();
  setCompactHeader(false);
  
  // Mettre à jour le titre du header selon la section
  if (headerTitle) {
    if (sectionId === 'login-section') {
      headerTitle.textContent = t('login.createProfile');
    } else if (sectionId === 'users-selection-section') {
      headerTitle.textContent = t('login.chooseRyvie');
    }
  }
  
  if (sectionId === 'login-section') {
    activateSection(loginSection);
    if (profileNameInput) {
      profileNameInput.value = getUniqueProfileName();
    }
  } else if (sectionId === 'users-selection-section') {
    activateSection(usersSelectionSection);
  }
}

function loadAndShowUsers(users) {
  allUsers = users;
  hideLoading();
  setCompactHeader(false);
  if (headerTitle) {
    headerTitle.textContent = t('login.chooseRyvie');
  }
  activateSection(usersSelectionSection);
  
  // Afficher les utilisateurs
  displayAllUsers();
}

// Avatar par défaut : dégradé uniforme aux couleurs de Ryvie (identique pour tous).
// Un profil peut importer sa propre image pour personnaliser.
const AVATAR_DEFAULT_GRADIENT = 'linear-gradient(135deg, #38bdf8, #2563eb)';

// Redimensionne une image importée en carré (crop centré) -> data URL compact
function resizeImageToDataUrl(file, size) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Ouvre un sélecteur d'image et renvoie un data URL redimensionné (ou null si annulé)
function pickImageDataUrl() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) { resolve(null); return; }
      try {
        resolve(await resizeImageToDataUrl(file, 128));
      } catch (err) {
        console.error('[Ryvie][Login] Erreur lecture image:', err);
        resolve(null);
      }
    });
    input.click();
  });
}

// Initiales (1 à 2 lettres) à partir du nom du profil
function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Icône épingle (pin) pour le favori
const PIN_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>';

// ===== Carrousel infini de sélection de profil =====
// On rend 3 copies identiques de la liste. On maintient la position dans la copie centrale ;
// comme les copies sont identiques, un saut de ±copyWidth est invisible → boucle sans à-coup.
const CAROUSEL_GAP = 14;
const CAROUSEL_COPIES = 3;
let carouselStep = 0;        // largeur d'une carte + gap
let carouselCopyWidth = 0;   // largeur d'une copie complète (step × nb de profils)
let carouselSlider = null;
let carouselSliderActive = false;

// Mesure les dimensions du carrousel (après rendu)
function measureCarousel(perCopy) {
  const cards = usersList.querySelectorAll('.user-select-btn');
  if (!cards.length) { carouselStep = 0; carouselCopyWidth = 0; return; }
  carouselStep = cards[0].getBoundingClientRect().width + CAROUSEL_GAP;
  carouselCopyWidth = carouselStep * perCopy;
}

// Garde la position dans la copie centrale (défilement infini)
function carouselWrap() {
  if (!carouselCopyWidth) return;
  if (usersList.scrollLeft < carouselCopyWidth * 0.5) {
    usersList.scrollLeft += carouselCopyWidth;
  } else if (usersList.scrollLeft > carouselCopyWidth * 1.5) {
    usersList.scrollLeft -= carouselCopyWidth;
  }
}

// Met à jour le curseur selon la position de défilement
function syncSliderFromScroll() {
  if (!carouselSlider || !carouselCopyWidth || carouselSliderActive) return;
  const lo = carouselCopyWidth * 0.5;
  let v = ((usersList.scrollLeft - lo) / carouselCopyWidth) * 1000;
  v = Math.max(0, Math.min(1000, v));
  carouselSlider.value = String(Math.round(v));
}

// Centre le favori (1re carte de la copie centrale) au milieu du carrousel
function centerFavorite(perCopy) {
  measureCarousel(perCopy);
  if (!carouselCopyWidth) return;
  const cards = usersList.querySelectorAll('.user-select-btn');
  const card = cards[perCopy]; // copie centrale, 1er élément = favori
  if (!card) return;
  const listRect = usersList.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  usersList.scrollLeft += (cardRect.left - listRect.left) - (usersList.clientWidth - cardRect.width) / 2;
  syncSliderFromScroll();
}

function displayAllUsers() {
  if (!usersList) return;

  // Réinitialiser un éventuel verrou de connexion resté actif (ex: après une connexion
  // réussie puis une déconnexion → on réaffiche la liste, tout doit être cliquable).
  usersList.classList.remove('is-connecting');
  usersList.innerHTML = '';
  
  // allUsers peut être un tableau ou un objet
  const usersArray = Array.isArray(allUsers) ? allUsers : Object.values(allUsers);

  // Favori(s) en tête (tri stable : l'ordre relatif des autres est conservé)
  usersArray.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));

  if (usersArray.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'text-align: center; padding: 20px; color: #64748b; font-size: 13px;';
    emptyMsg.textContent = t('login.noAccounts');
    usersList.appendChild(emptyMsg);
    return;
  }
  
  // 3 copies identiques -> défilement infini (cartes des deux côtés du centre)
  for (let copy = 0; copy < CAROUSEL_COPIES; copy++) usersArray.forEach(user => {
    const userKey = user.userKey || user.email || user.uid;
    const displayName = user.name || user.uid || 'Mon Ryvie';
    const isManual = user.mode === 'manual';

    const userBtn = document.createElement('button');
    userBtn.className = 'user-select-btn' + (user.favorite ? ' is-favorite' : '');

    // Avatar : image importée si présente, sinon dégradé uniforme + initiales
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    if (user.avatar) {
      avatar.classList.add('has-image');
      avatar.style.backgroundImage = `url("${user.avatar}")`;
    } else {
      avatar.style.background = AVATAR_DEFAULT_GRADIENT;
      avatar.textContent = getInitials(displayName);
    }

    const userName = document.createElement('div');
    userName.className = 'user-name';
    userName.textContent = displayName;

    // Badge du type de connexion (sous le nom)
    const connectionTypeBadge = document.createElement('span');
    connectionTypeBadge.className = 'user-badge ' + (isManual ? 'user-badge--manual' : 'user-badge--auto');
    connectionTypeBadge.innerHTML = '<span class="dot"></span>' + (isManual ? 'Manuelle' : 'Automatique');

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.appendChild(userName);
    userInfo.appendChild(connectionTypeBadge);

    const userLeftSection = document.createElement('div');
    userLeftSection.className = 'user-left-section';
    userLeftSection.appendChild(avatar);
    userLeftSection.appendChild(userInfo);

    userBtn.appendChild(userLeftSection);

    // Étoile favori (coin haut-gauche). Un seul favori à la fois ; re-cliquer le retire.
    const favBtn = document.createElement('button');
    favBtn.className = 'user-fav-btn' + (user.favorite ? ' is-active' : '');
    favBtn.innerHTML = PIN_SVG;
    favBtn.title = user.favorite ? "Retirer l'épingle" : 'Épingler ce Ryvie';
    favBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await window.electronAPI.setFavoriteUser(userKey);
      if (res && res.success) {
        const r = await window.electronAPI.getAllUsers();
        if (r && r.success) {
          allUsers = r.users;
          displayAllUsers();
        }
      }
    });
    userBtn.appendChild(favBtn);

    // Bouton de renommage (crayon)
    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    renameBtn.className = 'user-action-btn rename';
    renameBtn.title = t('login.renameThisProfile');

    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showRenameModal(userKey, user.name || user.uid);
    });
    
    // Conteneur pour les boutons d'action (modifier + supprimer)
    const userActionsSection = document.createElement('div');
    userActionsSection.className = 'user-actions-section';
    userActionsSection.appendChild(renameBtn);
    
    // Bouton de suppression (croix)
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.className = 'user-action-btn delete';
    deleteBtn.title = t('login.deleteThisDevice');
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirmDeleteModal(userKey, user.name || user.uid);
    });
    
    userActionsSection.appendChild(deleteBtn);
    userBtn.appendChild(userActionsSection);
    
    // Event listener pour le switch d'utilisateur
    userBtn.addEventListener('click', async () => {
      // Une seule connexion à la fois : ignorer si une connexion est déjà en cours
      if (usersList.classList.contains('is-connecting')) return;

      // Cacher l'erreur précédente
      if (usersError) {
        usersError.style.display = 'none';
      }

      // Verrouiller la liste (désactive visuellement les autres cartes)
      usersList.classList.add('is-connecting');
      userBtn.disabled = true;
      userBtn.classList.add('user-connecting');
      userBtn.innerHTML = `
        <span class="btn-spinner" style="width: 20px; height: 20px; border-width: 2.5px;"></span>
        <span style="font-weight: 600; color: #4f46e5; font-size: 15px;">${t('login.connectingTo', { name: user.name || user.uid || t('ryvieName.default') })}</span>
      `;

      const ok = await switchUser(userKey);

      // En cas de succès on a navigué vers la vue connectée : rien à réinitialiser.
      // En cas d'échec/annulation, on remet la carte et on déverrouille la liste.
      if (!ok) {
        userBtn.disabled = false;
        userBtn.classList.remove('user-connecting');
        userBtn.innerHTML = '';
        userBtn.appendChild(userLeftSection);
        userBtn.appendChild(userActionsSection);
        usersList.classList.remove('is-connecting');
      }
    });

    usersList.appendChild(userBtn);
  });

  // Centrer le favori (copie centrale) au milieu du carrousel infini
  requestAnimationFrame(() => centerFavorite(usersArray.length));
}


async function switchUser(userKey) {
  console.log('[Ryvie][Login] Switch vers utilisateur:', userKey);
  
  // Annuler toute connexion en cours
  if (currentConnectionAbortController) {
    console.log('[Ryvie][Login] Annulation de la connexion précédente');
    currentConnectionAbortController.abort();
    currentConnectionAbortController = null;
  }
  
  // Créer un nouveau AbortController pour cette connexion
  currentConnectionAbortController = new AbortController();
  const signal = currentConnectionAbortController.signal;
  
  isConnecting = true;
  disableFilters(true);
  
  try {
    // Vérifier si l'opération a été annulée
    if (signal.aborted) {
      console.log('[Ryvie][Login] Connexion annulée avant le début');
      return false;
    }
    
    const switchResult = await window.electronAPI.switchUser(userKey);
    
    if (signal.aborted) {
      console.log('[Ryvie][Login] Connexion annulée après la réponse');
      return false;
    }
    
    if (!switchResult.success) {
      console.error('[Ryvie][Login] Erreur switch utilisateur:', switchResult.error);
      if (usersError) {
        usersError.textContent = t('errors.switchDevice', { details: switchResult.error });
        usersError.style.display = 'block';
      }
      return false;
    }

    // Sauvegarder la configuration
    await window.electronAPI.saveConfig(switchResult.config);
    console.log('[Ryvie][Login] Configuration utilisateur chargée');

    // Rediriger vers la page principale
    window.Ryvie.showApp();
    return true;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[Ryvie][Login] Connexion annulée');
      return false;
    }
    console.error('[Ryvie][Login] Erreur switch utilisateur:', error);
    if (usersError) {
      usersError.textContent = t('errors.switchDevice', { details: error.message });
      usersError.style.display = 'block';
    }
    return false;
  } finally {
    isConnecting = false;
    currentConnectionAbortController = null;
    disableFilters(false);
  }
}

function disableFilters(disabled) {
  // Plus de filtres à désactiver
  if (addUserBtn) {
    addUserBtn.disabled = disabled;
  }
}

function cancelCurrentConnection() {
  if (currentConnectionAbortController) {
    console.log('[Ryvie][Login] Annulation de la connexion en cours');
    currentConnectionAbortController.abort();
    currentConnectionAbortController = null;
  }
  isConnecting = false;
  disableFilters(false);
  resetUserButtons();
}

function resetUserButtons() {
  const userButtons = usersList.querySelectorAll('.user-btn');
  userButtons.forEach(btn => {
    btn.disabled = false;
    const spinner = btn.querySelector('.btn-spinner');
    if (spinner) {
      btn.innerHTML = '';
      // Restaurer le contenu original (conteneurs)
      const userLeftSection = btn.querySelector('.user-left-section');
      const userActionsSection = btn.querySelector('.user-actions-section');
      if (userLeftSection) {
        btn.appendChild(userLeftSection);
      }
      if (userActionsSection) {
        btn.appendChild(userActionsSection);
      }
    }
  });
}

function showConfirmDeleteModal(userKey, userName) {
  userToDelete = { key: userKey, name: userName };
  if (confirmDeleteMessage) {
    confirmDeleteMessage.textContent = t('modal.deleteMessageNamed', { name: userName });
  }
  if (confirmDeleteModal) {
    confirmDeleteModal.style.display = 'flex';
  }
}

function hideConfirmDeleteModal() {
  if (confirmDeleteModal) {
    confirmDeleteModal.classList.add('hidden');
    confirmDeleteModal.style.display = 'none';
  }
  userToDelete = null;
}

// Met à jour l'aperçu d'avatar de la modale (image, ou dégradé + initiales)
function updateRenamePreview(avatarValue) {
  if (!renameAvatarPreview) return;
  const name = renameInput ? renameInput.value : '';
  if (avatarValue) {
    renameAvatarPreview.textContent = '';
    renameAvatarPreview.style.background = '';
    renameAvatarPreview.style.backgroundImage = `url("${avatarValue}")`;
    if (renameRemoveBtn) renameRemoveBtn.style.display = '';
  } else {
    renameAvatarPreview.style.backgroundImage = '';
    renameAvatarPreview.style.background = AVATAR_DEFAULT_GRADIENT;
    renameAvatarPreview.textContent = getInitials(name || '');
    if (renameRemoveBtn) renameRemoveBtn.style.display = 'none';
  }
}

function showRenameModal(userKey, currentName) {
  userToRenameKey = userKey;
  userToRename = allUsers.find(u => (u.userKey || u.email || u.uid) === userKey);

  if (renameInput) {
    renameInput.value = currentName || '';
    renameInput.focus();
  }

  if (renameError) {
    renameError.style.display = 'none';
  }

  // Avatar : on part de l'image actuelle (inchangée tant qu'on n'importe/retire rien)
  renamePendingAvatar = undefined;
  updateRenamePreview(userToRename ? userToRename.avatar : null);

  if (renameModal) {
    renameModal.classList.remove('hidden');
    renameModal.style.display = 'flex';
  }
}

function hideRenameModal() {
  if (renameModal) {
    renameModal.classList.add('hidden');
    renameModal.style.display = 'none';
  }
  if (renameInput) {
    renameInput.value = '';
  }
  if (renameError) {
    renameError.style.display = 'none';
  }
  renamePendingAvatar = undefined;
  userToRename = null;
  userToRenameKey = null;
}

async function executeRename() {
  if (!userToRename || !userToRenameKey) {
    return;
  }
  
  const newName = renameInput.value.trim();

  if (!newName) {
    renameError.textContent = t('errors.enterProfileName');
    renameError.style.display = 'block';
    return;
  }

  const nameChanged = newName !== (userToRename.name || userToRename.uid);
  const avatarChanged = renamePendingAvatar !== undefined;

  if (!nameChanged && !avatarChanged) {
    hideRenameModal();
    return;
  }

  try {
    if (nameChanged) {
      const renameResult = await window.electronAPI.renameUser(userToRenameKey, newName);
      if (!renameResult.success) {
        renameError.textContent = renameResult.error || 'Erreur lors du renommage';
        renameError.style.display = 'block';
        return;
      }
    }
    if (avatarChanged) {
      await window.electronAPI.setUserAvatar(userToRenameKey, renamePendingAvatar);
    }
    console.log('[Ryvie][Login] Profil modifié avec succès');

    // Rafraîchir l'affichage des utilisateurs
    const usersResult = await window.electronAPI.getAllUsers();
    if (usersResult.success && usersResult.users) {
      allUsers = usersResult.users;
      displayAllUsers();
    }

    hideRenameModal();

  } catch (error) {
    console.error('[Ryvie][Login] Erreur modification profil:', error);
    renameError.textContent = t('errors.renameError', { details: error.message });
    renameError.style.display = 'block';
  }
}

async function executeRemoveUser() {
  if (!userToDelete) return;
  
  const userKey = userToDelete.key;
  console.log('[Ryvie][Login] Suppression utilisateur:', userKey);
  
  try {
    const result = await window.electronAPI.removeUser(userKey);
    
    if (!result.success) {
      console.error('[Ryvie][Login] Erreur suppression utilisateur:', result.error);
      if (usersError) {
        usersError.textContent = t('errors.deleteError', { details: result.error });
        usersError.style.display = 'block';
      }
      return;
    }
    
    console.log('[Ryvie][Login] Utilisateur supprimé:', userKey);
    
    // Recharger la liste des utilisateurs
    const usersResult = await window.electronAPI.getAllUsers();
    if (usersResult.success) {
      allUsers = usersResult.users;
      displayAllUsers();
    }
    
  } catch (error) {
    console.error('[Ryvie][Login] Erreur suppression utilisateur:', error);
    if (usersError) {
      usersError.textContent = t('errors.deleteError', { details: error.message });
      usersError.style.display = 'block';
    }
  }
}

async function handleFirstTimeSetup() {
  const uid = firstTimeUidInput.value.trim();
  const email = firstTimeEmailInput.value.trim();
  const language = firstTimeLanguageSelect.value;
  const password = firstTimePasswordInput.value.trim();
  const confirmPassword = firstTimeConfirmPasswordInput.value.trim();
  
  if (!uid || !email || !password || !confirmPassword) {
    firstTimeError.textContent = t('errors.fillAllFields');
    firstTimeError.style.display = 'block';
    return;
  }
  
  if (password !== confirmPassword) {
    firstTimeError.textContent = t('errors.passwordMismatch');
    firstTimeError.style.display = 'block';
    return;
  }
  
  if (password.length < 6) {
    firstTimeError.textContent = t('errors.passwordTooShort');
    firstTimeError.style.display = 'block';
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    firstTimeError.textContent = t('errors.invalidEmail');
    firstTimeError.style.display = 'block';
    return;
  }
  
  firstTimeCreateBtn.disabled = true;
  firstTimeCreateBtn.classList.add('loading');
  firstTimeCreateBtn.innerHTML = `<span class="btn-spinner"></span><span>${t('common.creating')}</span>`;
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
      firstTimeError.textContent = createResult.error || t('errors.createError');
      firstTimeError.style.display = 'block';
      firstTimeCreateBtn.disabled = false;
      firstTimeCreateBtn.classList.remove('loading');
      firstTimeCreateBtn.innerHTML = `<span>${t('firstTime.createAccount')}</span>`;
      return;
    }
    
    console.log('[Ryvie][Login] Utilisateur créé avec succès');
    
    // Stocker les données pour l'étape de nommage
    pendingFirstTimeData = {
      uid: uid,
      email: email,
      password: password,
      language: language
    };
    
    // Afficher la page de nommage du Ryvie
    hideLoading();
    setCompactHeader(true);
    activateSection(ryvieNameSection);
    
    if (ryvieNameInput) {
      ryvieNameInput.value = getUniqueProfileName();
    }
    
  } catch (error) {
    console.error('[Ryvie][Login] Erreur inattendue:', error);
    firstTimeError.textContent = t('errors.unexpected', { details: error.message });
    firstTimeError.style.display = 'block';
    firstTimeCreateBtn.disabled = false;
    firstTimeCreateBtn.classList.remove('loading');
    firstTimeCreateBtn.innerHTML = `<span>${t('firstTime.createAccount')}</span>`;
  }
}

// Enregistrement auprès du routeur single-page (app.js appelle bootLogin à l'affichage)
// La liste des profils est construite en JS : les attributs data-i18n du HTML
// ne la couvrent pas, il faut donc la régénérer à chaque changement de langue.
document.addEventListener('ryvie:language-changed', () => {
  if (usersList && allUsers) {
    displayAllUsers();
  }
});

window.Ryvie.registerLogin({ init: bootLogin });
})();
