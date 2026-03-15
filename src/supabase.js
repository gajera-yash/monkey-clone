import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://xzveyvqflkzqzthmnnud.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmV5dnFmbGt6cXp0aG1ubnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTA5MzYsImV4cCI6MjA4ODQ2NjkzNn0.wQY31c5BoqwegIeqx86CevsIiAUhbNIw6QlWu7LjO2s'

const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storageKey: isAdminPath ? 'sb-monkey-admin-auth-token' : 'sb-monkey-auth-token',
        // Fix: React 18 Strict Mode causes concurrent requests that steal the
        // Web Lock, causing AbortError. This custom lock uses a simple JS mutex
        // instead, which is safe for single-tab use.
        lock: async (name, acquireTimeout, fn) => {
            return fn()
        }
    }
})
