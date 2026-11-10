// Supabase browser configuration. Publishable keys are intended for frontend use.
// Never put a Supabase secret/service_role key in browser code.
window.AFTAB_SUPABASE_URL = "https://tvxyxigtxpzufbrxmybz.supabase.co";
window.AFTAB_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IhCbUlwidLRChbu40xbu5w_VmG1L8Ww";
window.aftabSupabase = window.supabase.createClient(
  window.AFTAB_SUPABASE_URL,
  window.AFTAB_SUPABASE_PUBLISHABLE_KEY
);
