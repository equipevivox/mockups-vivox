// Configuração pública do VIVOX Revista / Mockups
// Somente valores públicos. Credenciais do R2 ficam nas variáveis da Vercel.
(function(){
const config = {
  SUPABASE_URL: "https://kthestvyzvbbpnsulned.supabase.co",
  SUPABASE_KEY: "sb_publishable_yVKlLJLNj-tgaIIr1o6rBw_kSzs9sNM",
  BUCKET: "mockups",
  R2_PUBLIC_URL: "https://pub-42970d75c5c14ba1bda61b8fc81c9d5d.r2.dev",
  EXPIRY_DAYS: 7
};
if(typeof module!=="undefined" && module.exports) module.exports=config;
else window.VIVOX_CFG=config;
})();
