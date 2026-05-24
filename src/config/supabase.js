import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL     = 'https://yxlvgeatcgsodsrbakbq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GWPjU0tqGZBB75zzjBJl6w_O_9fFu5J';

// SecureStore su native (persistente tra riavvii), localStorage su web
const storage = Platform.OS === 'web'
  ? {
      getItem:    (key)        => Promise.resolve(localStorage.getItem(key)),
      setItem:    (key, value) => { localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key)        => { localStorage.removeItem(key);     return Promise.resolve(); },
    }
  : {
      // SecureStore accetta solo chiavi alfanumeriche + underscore
      getItem:    (key) => SecureStore.getItemAsync(key.replace(/[^a-zA-Z0-9_]/g, '_')),
      setItem:    (key, value) => SecureStore.setItemAsync(key.replace(/[^a-zA-Z0-9_]/g, '_'), value),
      removeItem: (key) => SecureStore.deleteItemAsync(key.replace(/[^a-zA-Z0-9_]/g, '_')),
    };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
