// Module d'internationalisation (i18n) partagé par toutes les vues du renderer.
//
// Utilisation dans le HTML (traduction déclarative) :
//   <h1 data-i18n="login.chooseRyvie"></h1>
//   <input data-i18n-placeholder="login.usernamePlaceholder" />
//   <button data-i18n-title="app.signOut">
//
// Utilisation dans le JS (traduction impérative) :
//   el.textContent = t('errors.fillAllFields');
//   el.textContent = t('login.connectingTo', { name: 'Mon Ryvie' });
//
// La langue est persistée côté main (ryvie-settings.json) pour survivre à une
// déconnexion, qui efface la config de connexion mais pas les préférences.
window.I18n = (function () {
  const TRANSLATIONS = {
    fr: {
      // --- Générique ---
      'common.signIn': 'Se connecter',
      'common.connecting': 'Connexion...',
      'common.creating': 'Création...',
      'common.continue': 'Continuer',
      'common.cancel': 'Annuler',
      'common.delete': 'Supprimer',
      'common.rename': 'Renommer',
      'common.refresh': 'Actualiser',
      'common.retry': 'Réessayer',
      'common.accept': 'Accepter',
      'common.refuse': 'Refuser',
      'common.later': 'Plus tard',
      'common.install': 'Installer',
      'common.error': 'Erreur',
      'common.checking': 'Vérification en cours...',
      'common.checkingShort': 'Vérification...',
      'common.email': 'Email',
      'common.password': 'Mot de passe',
      'common.confirm': 'Confirmer',
      'common.language': 'Langue',

      // --- Écran de connexion ---
      'login.chooseRyvie': 'Choisir un Ryvie',
      'login.createProfile': 'Créer un profil',
      'login.addRyvie': 'Ajouter un Ryvie',
      'login.noAccounts': 'Aucun compte enregistré. Cliquez sur « Ajouter » pour en créer un.',
      'login.profileName': 'Nom du profil',
      'login.connectionMethod': 'Méthode de connexion',
      'login.methodAuto': 'Automatique',
      'login.methodManual': 'Manuelle',
      'login.username': 'Nom d\'utilisateur',
      'login.usernamePlaceholder': 'Identifiant',
      'login.setupKey': 'Clé de configuration',
      'login.setupKeyPlaceholder': 'Collez votre clé de configuration ici',
      'login.backToProfiles': 'Retour à la sélection de profil',
      'login.renameThisProfile': 'Renommer ce profil',
      'login.deleteThisDevice': 'Supprimer cet appareil',
      'login.connectingTo': 'Connexion à {name}...',

      // --- Premier compte administrateur ---
      'firstTime.subtitle': 'Créez le premier compte administrateur',
      'firstTime.username': 'Identifiant',
      'firstTime.passwordPlaceholder': 'Min. 6 caractères',
      'firstTime.confirmPlaceholder': 'Retapez le mot de passe',
      'firstTime.createAccount': 'Créer le compte',

      // --- Nommage du Ryvie ---
      'ryvieName.subtitle': 'Donnez un nom à votre Ryvie',
      'ryvieName.label': 'Nom du Ryvie',
      'ryvieName.default': 'Mon Ryvie',

      // --- Vue connectée ---
      'app.signOut': 'Se déconnecter',
      'app.connecting': 'Connexion en cours...',
      'app.connected': 'Connecté',
      'app.disconnected': 'Déconnecté',
      'app.disconnectedHint': 'Choisissez comment vous souhaitez vous reconnecter',
      'app.connectionError': 'Erreur de connexion',
      'app.remoteAccess': 'Accès distant:',
      'app.ryvieId': 'Ryvie ID:',
      'app.showHide': 'Afficher/Masquer',
      'app.openRyvie': 'Ouvrir Ryvie',
      'app.active': 'Actif',
      'app.inactive': 'Inactif',
      'app.modeLabel': 'Mode:',
      'app.modeAuto': 'Connexion Automatique',
      'app.modeManual': 'Connexion Manuelle',
      'app.modeRemote': 'Connexion Distante',
      'app.modePublic': 'Connexion Publique',

      // --- Modales ---
      'modal.deleteTitle': 'Supprimer l\'appareil',
      'modal.deleteMessage': 'Voulez-vous vraiment supprimer cet appareil ?',
      'modal.deleteMessageNamed': 'Voulez-vous vraiment supprimer l\'appareil « {name} » ?',
      'modal.renameTitle': 'Renommer le profil',
      'modal.renameSubtitle': 'Entrez le nouveau nom pour ce profil',
      'modal.renamePlaceholder': 'Nouveau nom',
      'modal.newRyvieTitle': 'Nouveau Ryvie détecté',
      'modal.newRyvieMessage': 'Un autre serveur Ryvie a été détecté sur votre réseau local.',
      'modal.newRyvieConfirm': 'Voulez-vous vous connecter à ce nouveau serveur ?',
      'modal.current': 'Actuel :',
      'modal.new': 'Nouveau :',
      'modal.disconnectTitle': 'Confirmer la déconnexion',
      'modal.disconnectMessage': 'Êtes-vous sûr de vouloir vous déconnecter ?',
      'modal.disconnectWarning': 'Toutes vos données de connexion seront supprimées. Vous devrez vous reconnecter avec vos identifiants.',

      // --- Mises à jour ---
      'update.title': 'Mise à jour disponible',
      'update.message': 'Une nouvelle version de Ryvie Connect est disponible.',
      'update.versionLabel': 'Version :',
      'update.download': 'Télécharger',
      'update.installRestart': 'Installer et redémarrer',
      'update.checking': 'Vérification des mises à jour...',
      'update.available': 'Mise à jour disponible : {version}',
      'update.downloading': 'Téléchargement en cours...',
      'update.downloadingVersion': 'Téléchargement de la version {version}...',
      'update.downloadingPct': 'Téléchargement en cours... {percent}%',
      'update.downloadComplete': 'Téléchargement terminé !',
      'update.downloadError': 'Erreur lors du téléchargement',
      'update.installing': 'Installation en cours...',
      'update.error': 'Erreur lors de la mise à jour',
      'update.noneDetected': 'Aucune mise à jour détectée',

      // --- Erreurs ---
      'errors.fillAllFields': 'Veuillez remplir tous les champs',
      'errors.authError': 'Erreur d\'authentification : {details}',
      'errors.authFailed': 'Erreur d\'authentification',
      'errors.unexpected': 'Erreur inattendue : {details}',
      'errors.configError': 'Erreur de configuration : {details}',
      'errors.invalidKeyFormat': 'Format de clé invalide (attendu : UUID-IP)',
      'errors.incompleteKey': 'Clé de configuration incomplète',
      'errors.invalidIpInKey': 'Format d\'IP invalide dans la clé (ex : UUID-100.64.0.1)',
      'errors.enterName': 'Veuillez entrer un nom',
      'errors.enterProfileName': 'Veuillez entrer un nom pour le profil',
      'errors.missingData': 'Erreur : données manquantes',
      'errors.fetchInfoError': 'Erreur lors de la récupération des informations',
      'errors.switchDevice': 'Erreur lors du changement d\'appareil : {details}',
      'errors.renameError': 'Erreur lors du renommage : {details}',
      'errors.deleteError': 'Erreur lors de la suppression de l\'appareil : {details}',
      'errors.passwordMismatch': 'Les mots de passe ne correspondent pas',
      'errors.passwordTooShort': 'Le mot de passe doit contenir au moins 6 caractères',
      'errors.invalidEmail': 'Adresse email invalide',
      'errors.createError': 'Erreur lors de la création',
      'errors.cannotConnect': 'Impossible de se connecter à Ryvie',
      'errors.unreachable': 'Impossible de joindre ce Ryvie. Vérifiez qu\'il est bien allumé et connecté à Internet.',
      'errors.wrongLocalRyvie': 'Le Ryvie détecté en local n\'est pas celui de ce profil. Vérifiez que le bon Ryvie est allumé ou connectez-vous au même réseau.',
      'errors.incompleteConfig': 'Configuration incomplète. Veuillez vous reconnecter en local.',
      'errors.connectionImpossible': 'La connexion à votre Ryvie est impossible, merci de vérifier qu\'il est bien allumé',
      'errors.firstConnectLocal': 'Veuillez vous connecter une première fois à votre Ryvie depuis chez vous (réseau local).'
    },

    en: {
      // --- Generic ---
      'common.signIn': 'Sign in',
      'common.connecting': 'Connecting...',
      'common.creating': 'Creating...',
      'common.continue': 'Continue',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.rename': 'Rename',
      'common.refresh': 'Refresh',
      'common.retry': 'Try again',
      'common.accept': 'Accept',
      'common.refuse': 'Decline',
      'common.later': 'Later',
      'common.install': 'Install',
      'common.error': 'Error',
      'common.checking': 'Checking...',
      'common.checkingShort': 'Checking...',
      'common.email': 'Email',
      'common.password': 'Password',
      'common.confirm': 'Confirm',
      'common.language': 'Language',

      // --- Sign-in screen ---
      'login.chooseRyvie': 'Choose a Ryvie',
      'login.createProfile': 'Create a profile',
      'login.addRyvie': 'Add a Ryvie',
      'login.noAccounts': 'No account saved yet. Click "Add" to create one.',
      'login.profileName': 'Profile name',
      'login.connectionMethod': 'Connection method',
      'login.methodAuto': 'Automatic',
      'login.methodManual': 'Manual',
      'login.username': 'Username',
      'login.usernamePlaceholder': 'Username',
      'login.setupKey': 'Setup key',
      'login.setupKeyPlaceholder': 'Paste your setup key here',
      'login.backToProfiles': 'Back to profile selection',
      'login.renameThisProfile': 'Rename this profile',
      'login.deleteThisDevice': 'Delete this device',
      'login.connectingTo': 'Connecting to {name}...',

      // --- First administrator account ---
      'firstTime.subtitle': 'Create the first administrator account',
      'firstTime.username': 'Username',
      'firstTime.passwordPlaceholder': 'Min. 6 characters',
      'firstTime.confirmPlaceholder': 'Re-enter the password',
      'firstTime.createAccount': 'Create account',

      // --- Naming the Ryvie ---
      'ryvieName.subtitle': 'Give your Ryvie a name',
      'ryvieName.label': 'Ryvie name',
      'ryvieName.default': 'My Ryvie',

      // --- Connected view ---
      'app.signOut': 'Sign out',
      'app.connecting': 'Connecting...',
      'app.connected': 'Connected',
      'app.disconnected': 'Disconnected',
      'app.disconnectedHint': 'Choose how you want to reconnect',
      'app.connectionError': 'Connection error',
      'app.remoteAccess': 'Remote access:',
      'app.ryvieId': 'Ryvie ID:',
      'app.showHide': 'Show/Hide',
      'app.openRyvie': 'Open Ryvie',
      'app.active': 'Active',
      'app.inactive': 'Inactive',
      'app.modeLabel': 'Mode:',
      'app.modeAuto': 'Automatic connection',
      'app.modeManual': 'Manual connection',
      'app.modeRemote': 'Remote connection',
      'app.modePublic': 'Public connection',

      // --- Modals ---
      'modal.deleteTitle': 'Delete device',
      'modal.deleteMessage': 'Are you sure you want to delete this device?',
      'modal.deleteMessageNamed': 'Are you sure you want to delete the device "{name}"?',
      'modal.renameTitle': 'Rename profile',
      'modal.renameSubtitle': 'Enter the new name for this profile',
      'modal.renamePlaceholder': 'New name',
      'modal.newRyvieTitle': 'New Ryvie detected',
      'modal.newRyvieMessage': 'Another Ryvie server was detected on your local network.',
      'modal.newRyvieConfirm': 'Do you want to connect to this new server?',
      'modal.current': 'Current:',
      'modal.new': 'New:',
      'modal.disconnectTitle': 'Confirm sign-out',
      'modal.disconnectMessage': 'Are you sure you want to sign out?',
      'modal.disconnectWarning': 'All your connection data will be deleted. You will need to sign in again with your credentials.',

      // --- Updates ---
      'update.title': 'Update available',
      'update.message': 'A new version of Ryvie Connect is available.',
      'update.versionLabel': 'Version:',
      'update.download': 'Download',
      'update.installRestart': 'Install and restart',
      'update.checking': 'Checking for updates...',
      'update.available': 'Update available: {version}',
      'update.downloading': 'Downloading...',
      'update.downloadingVersion': 'Downloading version {version}...',
      'update.downloadingPct': 'Downloading... {percent}%',
      'update.downloadComplete': 'Download complete!',
      'update.downloadError': 'Download failed',
      'update.installing': 'Installing...',
      'update.error': 'Update failed',
      'update.noneDetected': 'No update detected',

      // --- Errors ---
      'errors.fillAllFields': 'Please fill in all fields',
      'errors.authError': 'Authentication error: {details}',
      'errors.authFailed': 'Authentication error',
      'errors.unexpected': 'Unexpected error: {details}',
      'errors.configError': 'Configuration error: {details}',
      'errors.invalidKeyFormat': 'Invalid key format (expected: UUID-IP)',
      'errors.incompleteKey': 'Incomplete setup key',
      'errors.invalidIpInKey': 'Invalid IP format in the key (e.g. UUID-100.64.0.1)',
      'errors.enterName': 'Please enter a name',
      'errors.enterProfileName': 'Please enter a name for the profile',
      'errors.missingData': 'Error: missing data',
      'errors.fetchInfoError': 'Failed to retrieve information',
      'errors.switchDevice': 'Failed to switch device: {details}',
      'errors.renameError': 'Rename failed: {details}',
      'errors.deleteError': 'Failed to delete the device: {details}',
      'errors.passwordMismatch': 'Passwords do not match',
      'errors.passwordTooShort': 'The password must be at least 6 characters long',
      'errors.invalidEmail': 'Invalid email address',
      'errors.createError': 'Account creation failed',
      'errors.cannotConnect': 'Unable to connect to Ryvie',
      'errors.unreachable': 'Unable to reach this Ryvie. Make sure it is powered on and connected to the Internet.',
      'errors.wrongLocalRyvie': 'The Ryvie detected on the local network is not the one for this profile. Make sure the right Ryvie is powered on, or connect to the same network.',
      'errors.incompleteConfig': 'Incomplete configuration. Please sign in again from the local network.',
      'errors.connectionImpossible': 'Cannot connect to your Ryvie, please check that it is powered on',
      'errors.firstConnectLocal': 'Please connect to your Ryvie from home (local network) at least once first.'
    }
  };

  const AVAILABLE = ['fr', 'en'];
  const FALLBACK = 'en';
  let current = FALLBACK;

  // Remplace les jetons {name} par les valeurs fournies
  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
    ));
  }

  function t(key, vars) {
    const dict = TRANSLATIONS[current] || TRANSLATIONS[FALLBACK];
    let str = dict[key];
    if (str === undefined) {
      // Repli sur la langue par défaut, puis sur la clé brute pour rester visible en dev
      str = (TRANSLATIONS[FALLBACK] || {})[key];
      if (str === undefined) {
        console.warn('[Ryvie][i18n] Clé de traduction manquante:', key);
        return key;
      }
    }
    return interpolate(str, vars);
  }

  // Applique les traductions à tous les éléments annotés d'un data-i18n*
  function apply(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    // data-i18n-value ne réécrit que les champs non modifiés par l'utilisateur,
    // pour ne pas effacer une saisie en cours lors d'un changement de langue.
    scope.querySelectorAll('[data-i18n-value]').forEach((el) => {
      const previous = el.dataset.i18nPrevious;
      if (previous === undefined || el.value === previous || el.value === '') {
        el.value = t(el.getAttribute('data-i18n-value'));
      }
      el.dataset.i18nPrevious = t(el.getAttribute('data-i18n-value'));
    });

    document.documentElement.lang = current;
  }

  function normalize(lang) {
    if (!lang) return null;
    const short = String(lang).toLowerCase().split(/[-_]/)[0];
    return AVAILABLE.includes(short) ? short : null;
  }

  function getLang() {
    return current;
  }

  // Change la langue et re-traduit le document. Notifie les vues qui doivent
  // régénérer du contenu construit en JS (liste des profils, etc.).
  function setLang(lang, options) {
    const next = normalize(lang);
    if (!next) {
      console.warn('[Ryvie][i18n] Langue non supportée, ignorée:', lang);
      return current;
    }
    const changed = next !== current;
    current = next;
    apply();
    if (changed && !(options && options.silent)) {
      document.dispatchEvent(new CustomEvent('ryvie:language-changed', { detail: { lang: current } }));
    }
    return current;
  }

  // Charge la langue persistée. Renvoie null si l'utilisateur n'a jamais choisi
  // (cas du premier lancement -> on doit afficher l'écran de choix de langue).
  async function load() {
    try {
      const stored = await window.electronAPI.getLanguage();
      const saved = normalize(stored && stored.language);
      if (saved) {
        setLang(saved, { silent: true });
        return saved;
      }
      // Pas encore de choix : on pré-sélectionne la langue du système dans le sélecteur
      const suggested = normalize(stored && stored.systemLocale) || FALLBACK;
      setLang(suggested, { silent: true });
      return null;
    } catch (error) {
      console.error('[Ryvie][i18n] Erreur de chargement de la langue:', error);
      setLang(FALLBACK, { silent: true });
      return null;
    }
  }

  // Persiste le choix de l'utilisateur puis applique la langue
  async function save(lang) {
    const next = normalize(lang) || FALLBACK;
    try {
      await window.electronAPI.setLanguage(next);
    } catch (error) {
      console.error('[Ryvie][i18n] Erreur de sauvegarde de la langue:', error);
    }
    setLang(next);
    return next;
  }

  return { t, apply, getLang, setLang, load, save, normalize, AVAILABLE };
})();

// Raccourci global pour le code impératif
window.t = function (key, vars) {
  return window.I18n.t(key, vars);
};
