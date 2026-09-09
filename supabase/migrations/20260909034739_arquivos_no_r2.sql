-- Nulo preserva as páginas existentes no Supabase. Novos envios usam versões no R2.
alter table public.mockups add column r2_prefix text;
alter table public.mockups add constraint mockups_r2_prefix_valido check (
  r2_prefix is null or (
    r2_prefix ~ '^materials/[A-Z0-9_]+/[a-f0-9-]{36}$'
    and split_part(r2_prefix, '/', 2) = id
  )
);
comment on column public.mockups.r2_prefix is 'Pasta versionada no Cloudflare R2; nulo mantém o Storage legado.';
