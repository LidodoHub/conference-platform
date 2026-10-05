import { createContext, useContext } from 'react'

// Session courante, fournie une seule fois par App.jsx.
// Évite que chaque composant rappelle supabase.auth.getUser() (un appel réseau à chaque fois).
export const AuthContext = createContext({ user: null, profile: null, isAdmin: false })

export const useAuth = () => useContext(AuthContext)
