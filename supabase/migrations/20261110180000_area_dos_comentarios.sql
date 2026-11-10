-- Comentário por área (arrastar com o mouse, como no Figma).
-- x,y continuam sendo a âncora do comentário; quando há área, são o canto
-- superior esquerdo dela. w,h são a largura e a altura, relativas à página (0..1).
-- w,h nulos = pin de ponto, como todos os comentários anteriores.

alter table public.comments add column if not exists w double precision;
alter table public.comments add column if not exists h double precision;

alter table public.comments drop constraint if exists comments_area_valida;
alter table public.comments add constraint comments_area_valida check (
  (w is null and h is null)
  or (x is not null and y is not null
      and w is not null and h is not null
      and w > 0 and h > 0 and w <= 1 and h <= 1)
);

-- Faz a API reconhecer as colunas novas imediatamente.
notify pgrst, 'reload schema';
