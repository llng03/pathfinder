import { createClient } from '@supabase/supabase-js'
import { createDemoClient, isDemoMode } from './demoClient'

function createRealClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase-Konfiguration fehlt: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env.local setzen.'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Im Demo-Modus ersetzt ein localStorage-Client die Datenbank komplett —
// es verlässt keine einzige Anfrage den Browser.
export const supabase = isDemoMode() ? createDemoClient() : createRealClient()
