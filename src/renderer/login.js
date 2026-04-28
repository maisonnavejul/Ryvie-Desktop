const LOCAL_APP_URL = 'http://ryvie.local';

let uidInput, passwordInput, loginBtn, loginError;
let loadingSection, firstTimeSection, loginSection, firstTimeForm, firstTimeError;
let firstTimeUidInput, firstTimeEmailInput, firstTimeLanguageSelect, firstTimePasswordInput, firstTimeConfirmPasswordInput, firstTimeCreateBtn;
let usersSelectionSection, usersList, addUserBtn, usersError;
let confirmDeleteModal, confirmDeleteMessage, confirmDeleteBtn, cancelDeleteBtn;
let profileNameInput, methodLocalTab, methodManualTab, localFields, manualFields, manualSetupKeyInput;
let headerTitle, backToUsersBtn;
let renameModal, renameInput, renameError, confirmRenameBtn, cancelRenameBtn;
let userToRename = null;
let userToRenameKey = null;
let allUsers = [];
let isFirstTimeSetup = false;
let userToDelete = null;
let isConnecting = false;
let currentConnectionAbortController = null;
let currentConnectionMethod = 'local';

// Attendre que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Ryvie][Login] DOM chargé, initialisation...');
  
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
  headerTitle = document.querySelector('.header h1');
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
  
  // Initialiser la méthode de connexion par défaut
  setConnectionMethod('local');
  
  console.log('[Ryvie][Login] Page complètement initialisée');
  
  // Vérifier si c'est la première fois
  checkFirstTimeSetup();
  
  console.log('[Ryvie][Login] Page complètement initialisée');
});

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
  
  // Event listeners pour la section utilisateurs
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      cancelCurrentConnection();
      showSection('login-section');
    });
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
}

async function handleLogin() {
  const profileName = profileNameInput ? profileNameInput.value.trim() : '';
  
  if (currentConnectionMethod === 'local') {
    const uid = uidInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!profileName || !uid || !password) {
      loginError.textContent = 'Veuillez remplir tous les champs';
      loginError.style.display = 'block';
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    loginBtn.innerHTML = '<span class="btn-spinner"></span><span>Connexion...</span>';
    loginError.style.display = 'none';
    
    try {
      console.log('[Ryvie][Login] Tentative d\'authentification locale...');
      
      const authResult = await window.electronAPI.authenticate({ uid, password });
      
      if (!authResult.success) {
        console.error('[Ryvie][Login] Erreur authentification:', authResult.error);
        loginError.textContent = 'Erreur d\'authentification: ' + authResult.error;
        loginError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.innerHTML = '<span>Se connecter</span>';
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
      window.electronAPI.navigateTo('index.html');
      
    } catch (error) {
      console.error('[Ryvie][Login] Erreur inattendue:', error);
      loginError.textContent = 'Erreur inattendue: ' + error.message;
      loginError.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = '<span>Se connecter</span>';
    }
  } else {
    // Mode manuel
    const setupKey = manualSetupKeyInput ? manualSetupKeyInput.value.trim() : '';
    
    if (!profileName || !setupKey) {
      loginError.textContent = 'Veuillez remplir tous les champs';
      loginError.style.display = 'block';
      return;
    }
    
    // Parse le format UUID-IP (ex: E455957B-10FE-4ED0-9F43-26D55E826E36-100.104.13.12)
    const lastDashIndex = setupKey.lastIndexOf('-');
    if (lastDashIndex === -1) {
      loginError.textContent = 'Format de clé invalide (attendu: UUID-IP)';
      loginError.style.display = 'block';
      return;
    }
    
    const key = setupKey.substring(0, lastDashIndex);
    const tunnelIp = setupKey.substring(lastDashIndex + 1);
    
    if (!key || !tunnelIp) {
      loginError.textContent = 'Clé de configuration incomplète';
      loginError.style.display = 'block';
      return;
    }
    
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (!ipRegex.test(tunnelIp)) {
      loginError.textContent = 'Format d\'IP invalide dans la clé (ex: UUID-100.64.0.1)';
      loginError.style.display = 'block';
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    loginBtn.innerHTML = '<span class="btn-spinner"></span><span>Connexion...</span>';
    loginError.style.display = 'none';
    
    try {
      console.log('[Ryvie][Login] Tentative de connexion manuelle avec IP:', tunnelIp);
      
      const setupResult = await window.electronAPI.setupNetbird(key, tunnelIp);
      
      if (!setupResult.success) {
        console.error('[Ryvie][Login] Erreur setup NetBird:', setupResult.error);
        loginError.textContent = 'Erreur de configuration: ' + setupResult.error;
        loginError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.innerHTML = '<span>Se connecter</span>';
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
      window.electronAPI.navigateTo('index.html');
      
    } catch (error) {
      console.error('[Ryvie][Login] Erreur inattendue:', error);
      loginError.textContent = 'Erreur inattendue: ' + error.message;
      loginError.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = '<span>Se connecter</span>';
    }
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
  const title = document.querySelector('.header h1');
  const header = document.querySelector('.header');
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
    headerTitle.textContent = 'Créer un profil';
  }
  activateSection(loginSection);
  
  // Réinitialiser le champ Nom du profil avec un nom unique
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
      headerTitle.textContent = 'Créer un profil';
    } else if (sectionId === 'users-selection-section') {
      headerTitle.textContent = 'Choisir un Ryvie';
    }
  }
  
  if (sectionId === 'login-section') {
    activateSection(loginSection);
    // Réinitialiser le champ Nom du profil avec un nom unique
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
    headerTitle.textContent = 'Choisir un Ryvie';
  }
  activateSection(usersSelectionSection);
  
  // Afficher les utilisateurs
  displayAllUsers();
}

function displayAllUsers() {
  if (!usersList) return;
  
  usersList.innerHTML = '';
  
  // allUsers peut être un tableau ou un objet
  const usersArray = Array.isArray(allUsers) ? allUsers : Object.values(allUsers);
  
  if (usersArray.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'text-align: center; padding: 20px; color: #64748b; font-size: 13px;';
    emptyMsg.textContent = 'Aucun compte enregistré. Cliquez sur "Ajouter" pour en créer un.';
    usersList.appendChild(emptyMsg);
    return;
  }
  
  usersArray.forEach(user => {
    const userKey = user.userKey || user.email || user.uid;
    const userBtn = document.createElement('button');
    userBtn.className = 'btn user-select-btn';
    userBtn.style.cssText = `
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      font-size: 16px;
      transition: all 0.2s;
      cursor: pointer;
      flex-wrap: wrap;
    `;
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.style.cssText = `
      flex: 1;
      text-align: left;
      min-width: 0;
      overflow: hidden;
    `;
    
    const userName = document.createElement('div');
    userName.style.cssText = `
      font-weight: 600;
      color: #0f172a;
      font-size: 17px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    userName.textContent = user.name || user.uid || 'Mon Ryvie';
    
    userInfo.appendChild(userName);
    
    // Conteneur pour userInfo + badge (partie gauche)
    const userLeftSection = document.createElement('div');
    userLeftSection.className = 'user-left-section';
    userLeftSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    `;
    
    userLeftSection.appendChild(userInfo);
    
    // Badge pour le type de connexion (local ou manuel)
    const connectionTypeBadge = document.createElement('span');
    const isManual = user.mode === 'manual';
    connectionTypeBadge.style.cssText = `
      display: inline-block;
      padding: 5px 12px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 600;
      background: ${isManual ? '#fef3c7' : '#dbeafe'};
      color: ${isManual ? '#d97706' : '#2563eb'};
      flex-shrink: 0;
    `;
    connectionTypeBadge.textContent = isManual ? 'Manuelle' : 'Automatique';
    userLeftSection.appendChild(connectionTypeBadge);
    
    userBtn.appendChild(userLeftSection);
    
    // Bouton de renommage (crayon)
    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    renameBtn.style.cssText = `
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: #f1f5f9;
      color: #64748b;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: 4px;
      flex-shrink: 0;
    `;
    renameBtn.title = 'Renommer ce profil';
    
    renameBtn.addEventListener('mouseenter', () => {
      renameBtn.style.background = '#3b82f6';
      renameBtn.style.color = 'white';
    });
    
    renameBtn.addEventListener('mouseleave', () => {
      renameBtn.style.background = '#f1f5f9';
      renameBtn.style.color = '#64748b';
    });
    
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showRenameModal(userKey, user.name || user.uid);
    });
    
    // Conteneur pour les boutons d'action (rename + delete)
    const userActionsSection = document.createElement('div');
    userActionsSection.className = 'user-actions-section';
    userActionsSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    `;
    
    userActionsSection.appendChild(renameBtn);
    
    // Bouton de suppression (croix)
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.style.cssText = `
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: none;
      background: #f1f5f9;
      color: #64748b;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: 4px;
      flex-shrink: 0;
    `;
    deleteBtn.title = 'Supprimer cet appareil';
    
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = '#ef4444';
      deleteBtn.style.color = 'white';
    });
    
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = '#f1f5f9';
      deleteBtn.style.color = '#64748b';
    });
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirmDeleteModal(userKey, user.name || user.uid);
    });
    
    userActionsSection.appendChild(deleteBtn);
    userBtn.appendChild(userActionsSection);
    
    // Event listener pour le switch d'utilisateur
    userBtn.addEventListener('click', async () => {
      // Cacher l'erreur précédente
      if (usersError) {
        usersError.style.display = 'none';
      }
      
      // Annuler toute connexion en cours avant de commencer une nouvelle
      cancelCurrentConnection();
      
      userBtn.disabled = true;
      userBtn.style.justifyContent = 'center';
      userBtn.style.borderColor = '#667eea';
      userBtn.style.background = 'linear-gradient(135deg, #f0f4ff, #e8eeff)';
      userBtn.innerHTML = `
        <span class="btn-spinner" style="width: 20px; height: 20px; border-width: 2.5px;"></span>
        <span style="font-weight: 600; color: #4f46e5; font-size: 15px;">Connexion à ${user.name || user.uid || 'Mon Ryvie'}...</span>
      `;
      
      try {
        await switchUser(userKey);
      } catch (error) {
        console.error('[Ryvie][Login] Erreur switch utilisateur:', error);
        userBtn.disabled = false;
        userBtn.style.justifyContent = '';
        userBtn.style.borderColor = '#e2e8f0';
        userBtn.style.background = 'white';
        userBtn.innerHTML = '';
        userBtn.appendChild(userLeftSection);
        userBtn.appendChild(userActionsSection);
      }
    });
    
    // Hover effect
    userBtn.addEventListener('mouseenter', () => {
      userBtn.style.borderColor = '#667eea';
      userBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
    });
    
    userBtn.addEventListener('mouseleave', () => {
      userBtn.style.borderColor = '#e2e8f0';
      userBtn.style.boxShadow = 'none';
    });
    
    usersList.appendChild(userBtn);
  });
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
      return;
    }
    
    const switchResult = await window.electronAPI.switchUser(userKey);
    
    if (signal.aborted) {
      console.log('[Ryvie][Login] Connexion annulée après la réponse');
      return;
    }
    
    if (!switchResult.success) {
      console.error('[Ryvie][Login] Erreur switch utilisateur:', switchResult.error);
      if (usersError) {
        usersError.textContent = 'Erreur lors du changement d\'appareil: ' + switchResult.error;
        usersError.style.display = 'block';
      }
      return;
    }
    
    // Sauvegarder la configuration
    await window.electronAPI.saveConfig(switchResult.config);
    console.log('[Ryvie][Login] Configuration utilisateur chargée');
    
    // Rediriger vers la page principale
    window.electronAPI.navigateTo('index.html');
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[Ryvie][Login] Connexion annulée');
      return;
    }
    console.error('[Ryvie][Login] Erreur switch utilisateur:', error);
    if (usersError) {
      usersError.textContent = 'Erreur lors du changement d\'appareil: ' + error.message;
      usersError.style.display = 'block';
    }
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
    confirmDeleteMessage.textContent = `Voulez-vous vraiment supprimer l'appareil "${userName}" ?`;
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
  userToRename = null;
  userToRenameKey = null;
}

async function executeRename() {
  if (!userToRename || !userToRenameKey) {
    return;
  }
  
  const newName = renameInput.value.trim();
  
  if (!newName) {
    renameError.textContent = 'Veuillez entrer un nom pour le profil';
    renameError.style.display = 'block';
    return;
  }
  
  if (newName === (userToRename.name || userToRename.uid)) {
    hideRenameModal();
    return;
  }
  
  try {
    // Renommer l'utilisateur via l'API dédiée (ne modifie que le champ name)
    const renameResult = await window.electronAPI.renameUser(userToRenameKey, newName);
    if (!renameResult.success) {
      renameError.textContent = renameResult.error || 'Erreur lors du renommage';
      renameError.style.display = 'block';
      return;
    }
    console.log('[Ryvie][Login] Profil renommé avec succès');
    
    // Rafraîchir l'affichage des utilisateurs
    const usersResult = await window.electronAPI.getAllUsers();
    if (usersResult.success && usersResult.users) {
      allUsers = usersResult.users;
      displayAllUsers();
    }
    
    hideRenameModal();
    
  } catch (error) {
    console.error('[Ryvie][Login] Erreur lors du renommage:', error);
    renameError.textContent = 'Erreur lors du renommage: ' + error.message;
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
        usersError.textContent = 'Erreur lors de la suppression de l\'appareil: ' + result.error;
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
      usersError.textContent = 'Erreur lors de la suppression de l\'appareil: ' + error.message;
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
    
    // Configurer NetBird si une setupKey est disponible
    if (localData.setupKey) {
      console.log('[Ryvie][Login] Configuration de NetBird (first-time)...');
      const netbirdResult = await window.electronAPI.setupNetbird(localData.setupKey, localData.tunnelHost);
      if (netbirdResult.success) {
        console.log('[Ryvie][Login] NetBird configuré avec succès');
      } else {
        console.warn('[Ryvie][Login] Erreur configuration NetBird:', netbirdResult.error);
      }
    }
    
    const config = {
      name: uid,
      mode: 'local',
      ryvieId: localData.ryvieId,
      domains: localData.domains,
      tunnelHost: localData.tunnelHost,
      setupKey: localData.setupKey,
      url: 'http://ryvie.local',
      jwtToken: authResult.token
    };
    
    // Sauvegarder l'utilisateur avec le nouveau système multi-utilisateurs
    const userConfig = {
      uid: uid,
      name: uid,
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
    console.log('[Ryvie][Login] Utilisateur sauvegardé avec le nouveau système');
    
    await window.electronAPI.saveConfig(config);
    console.log('[Ryvie][Login] Configuration sauvegardée');
    
    console.log('[Ryvie][Login] Redirection vers la page principale...');
    window.electronAPI.navigateTo('index.html');
    
  } catch (error) {
    console.error('[Ryvie][Login] Erreur inattendue:', error);
    firstTimeError.textContent = 'Erreur inattendue: ' + error.message;
    firstTimeError.style.display = 'block';
    firstTimeCreateBtn.disabled = false;
    firstTimeCreateBtn.classList.remove('loading');
    firstTimeCreateBtn.innerHTML = '<span>Créer le compte</span>';
  }
}
