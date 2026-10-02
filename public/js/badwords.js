// Filtro de palavras ofensivas (palavrão, xingamento, racismo, conteúdo sexual) para apelido/turma.
// ponytail: lista fixa + normalização básica (sem acento, minúsculo, leetspeak comum) — é a 1ª barreira, no
// front, pra já avisar a criança. Quem realmente impede salvar no banco é a checagem em submit_score (SQL).
// Não pega tudo (evasões criativas passam); se um dia precisar de mais cobertura, trocar por um serviço de moderação.
const BAD_WORDS = [
  'arrombad', 'babaca', 'bicha', 'boiola', 'boceta', 'bosta', 'buceta', 'burro', 'cacete', 'caralho',
  'corno', 'crioulo', 'cuzao', 'cuzud', 'escroto', 'fdp', 'foda', 'fudace', 'fuder', 'fudeu',
  'gozad', 'idiota', 'imbecil', 'macaco', 'merda', 'otario', 'pica', 'piroca', 'porra', 'pqp',
  'punhet', 'retardado', 'safad', 'tarad', 'tnc', 'transar', 'vagabund', 'viad', 'vsf', 'xereca', 'xoxota',
];
function normalizeForFilter(s) {
  let t = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const leet = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', '$': 's' };
  t = t.replace(/[013457$@8]/g, (c) => leet[c] || c);
  return t.replace(/[^a-z]/g, '');
}
function hasBadWord(text) {
  const n = normalizeForFilter(text);
  return BAD_WORDS.some((w) => n.includes(w));
}
