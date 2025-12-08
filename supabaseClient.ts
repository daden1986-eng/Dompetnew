import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and public key
const SUPABASE_URL = 'https://ucbijjymqylibusqsqme.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cD_6aYtm3ZFyUwJlz4rJ_g_BmUTNdxA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
