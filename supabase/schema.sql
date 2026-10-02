-- Ranking semanal dos jogos de matemática (usado pelos 2 jogos: variant 'normal' e 'guiado'), separado por ano (6 a 9)
create table if not exists public.mat_scores (
  id         bigint generated always as identity primary key,
  variant    text not null check (variant in ('normal','guiado')),
  operation  text not null check (operation in ('soma','subtracao','multiplicacao','divisao')),
  ano        smallint not null check (ano between 6 and 9),
  nickname   text not null check (char_length(nickname) between 2 and 20),
  turma      text not null default '' check (char_length(turma) <= 12),
  score      int  not null check (score between 0 and 2000),
  correct    int  not null check (correct between 0 and 200),
  week_start date not null default (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date,
  created_at timestamptz not null default now()
);

create index if not exists mat_scores_rank_idx
  on public.mat_scores (variant, operation, ano, week_start, score desc);

alter table public.mat_scores enable row level security;

-- Qualquer um pode LER o ranking; ninguém insere direto na tabela (só pela função abaixo).
drop policy if exists "ler ranking" on public.mat_scores;
create policy "ler ranking" on public.mat_scores
  for select to anon, authenticated using (true);

-- Filtro de palavrão/xingamento/racismo/conteúdo sexual no apelido e na turma (mesma lista do front, ver badwords.js).
-- ponytail: lista fixa + leetspeak comum (0/1/3/4/5/7/8/$/@) — não pega tudo, é a barreira que impede SALVAR no banco.
create extension if not exists unaccent;

create or replace function public.has_bad_word(txt text) returns boolean
language sql immutable as $$
  select exists (
    select 1 from unnest(array[
      'arrombad','babaca','bicha','boiola','boceta','bosta','buceta','burro','cacete','caralho',
      'corno','crioulo','cuzao','cuzud','escroto','fdp','foda','fudace','fuder','fudeu',
      'gozad','idiota','imbecil','macaco','merda','otario','pica','piroca','porra','pqp',
      'punhet','retardado','safad','tarad','tnc','transar','vagabund','viad','vsf','xereca','xoxota'
    ]) as w
    where position(w in translate(lower(unaccent(coalesce(txt, ''))), '0134578$@', 'oieastbsa')) > 0
  );
$$;

grant execute on function public.has_bad_word(text) to anon, authenticated;

create or replace function public.submit_score(
  p_variant text, p_operation text, p_ano int, p_nickname text, p_turma text, p_score int, p_correct int
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.has_bad_word(p_nickname) or public.has_bad_word(p_turma) then
    raise exception 'apelido ou turma contém palavra não permitida' using errcode = '22023';
  end if;
  insert into public.mat_scores (variant, operation, ano, nickname, turma, score, correct)
  values (p_variant, p_operation, p_ano, btrim(p_nickname), upper(btrim(coalesce(p_turma, ''))), p_score, p_correct);
end $$;

-- Melhor pontuação de cada aluno na semana atual (semana começa na segunda, horário de Brasília).
create or replace function public.get_weekly_ranking(
  p_variant text, p_operation text, p_ano int, p_limit int default 20
) returns table (pos bigint, nickname text, turma text, score int, correct int)
language sql stable set search_path = public as $$
  with best as (
    select distinct on (lower(s.nickname), s.turma)
           s.nickname, s.turma, s.score, s.correct, s.created_at
    from public.mat_scores s
    where s.variant = p_variant
      and s.operation = p_operation
      and s.ano = p_ano
      and s.week_start = (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date
    order by lower(s.nickname), s.turma, s.score desc, s.created_at
  )
  select row_number() over (order by b.score desc, b.created_at)::bigint,
         b.nickname, b.turma, b.score, b.correct
  from best b
  order by 1
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.submit_score(text, text, int, text, text, int, int) to anon, authenticated;
grant execute on function public.get_weekly_ranking(text, text, int, int) to anon, authenticated;

-- Migração aplicada depois da criação inicial da tabela, para quem for recriar o banco do zero
-- (quem já rodou o script acima com 'multiplicacao'/'divisao' incluídos não precisa rodar isto):
-- alter table public.mat_scores drop constraint if exists mat_scores_operation_check;
-- alter table public.mat_scores add constraint mat_scores_operation_check
--   check (operation in ('soma','subtracao','multiplicacao','divisao'));
