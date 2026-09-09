-- A versão é compartilhada entre navegadores e muda somente após o envio das páginas.
alter table public.mockups
  add column if not exists cover_version uuid not null default gen_random_uuid();

create or replace function public.renovar_versao_capa()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.cover_version := pg_catalog.gen_random_uuid();
  return new;
end;
$$;

-- UPDATE OF também dispara quando o PDF mantém a quantidade e o tamanho das páginas.
create or replace trigger mockups_renovar_versao_capa
before update of num_pages, aspect on public.mockups
for each row execute function public.renovar_versao_capa();

revoke execute on function public.renovar_versao_capa() from public, anon, authenticated;

comment on column public.mockups.cover_version is
  'Versão de cache das páginas; renovada após reenvio, sem alterar slug ou nome exibido.';
