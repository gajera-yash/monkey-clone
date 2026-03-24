import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration missing! Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file.');
}

const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

// Custom fetch wrapper to catch 401 Unauthorized errors (expired JWT) 
// and retry the request after forcing a session refresh.
const customFetch = async (url, options) => {
    let response = await fetch(url, options);
    
    // If we get a 401, the JWT is likely expired (race condition in SPA navigation)
    if (response.status === 401) {
        console.warn('Supabase fetch returned 401. Attempting to force token refresh and retry...');
        // Force session refresh. supabase is hoisted so we can call it.
        const { data, error } = await supabase.auth.getSession();
        
        if (data?.session && !error) {
            // Update the Authorization header with the newly refreshed token
            const newHeaders = new Headers(options.headers);
            newHeaders.set('Authorization', `Bearer ${data.session.access_token}`);
            
            // Retry the original request
            response = await fetch(url, { ...options, headers: newHeaders });
            console.log('Retry after 401 successful.');
        }
    }
    
    return response;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storageKey: isAdminPath ? 'sb-monkey-admin-auth-token' : 'sb-monkey-auth-token',
        lock: async (name, acquireTimeout, fn) => {
            return fn()
        }
    },
    global: {
        fetch: customFetch
    }
})
