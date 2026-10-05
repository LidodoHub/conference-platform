// Traduit les messages d'erreur Supabase / Postgres les plus courants en français clair.
// Les messages levés par nos fonctions SQL (RAISE EXCEPTION) sont déjà en français : on les laisse tels quels.
const RULES = [
  [/invalid login credentials/i, 'Email ou mot de passe incorrect.'],
  [/email not confirmed/i, 'Confirme ton adresse email (lien reçu par mail) avant de te connecter.'],
  [/user already registered|already been registered/i, 'Un compte existe déjà avec cette adresse.'],
  [/password should be at least (\d+)/i, (m) => `Le mot de passe doit contenir au moins ${m[1]} caractères.`],
  [/rate limit|too many requests|security purposes/i, 'Trop de tentatives. Réessaie dans quelques minutes.'],
  [/unable to validate email|invalid email/i, 'Adresse email invalide.'],
  [/row-level security|permission denied/i, "Action refusée : tu n'as pas les droits nécessaires."],
  [/duplicate key value/i, 'Cet élément existe déjà.'],
  [/failed to fetch|network/i, 'Connexion au serveur impossible. Vérifie ta connexion internet.'],
  [/jwt expired/i, 'Ta session a expiré. Reconnecte-toi.'],
]

export function frError(error) {
  const message = typeof error === 'string' ? error : error?.message || 'Une erreur est survenue.'
  for (const [pattern, text] of RULES) {
    const m = message.match(pattern)
    if (m) return typeof text === 'function' ? text(m) : text
  }
  return message
}

// Avec la RLS, un UPDATE ou DELETE refusé ne lève pas d'erreur : il touche zéro ligne.
// À utiliser avec .select('id') : renvoie un message d'erreur, ou null si tout va bien.
export function writeError({ data, error }, refused = "Action refusée : tu n'as pas les droits nécessaires.") {
  if (error) return frError(error)
  if (!data || (Array.isArray(data) && data.length === 0)) return refused
  return null
}
