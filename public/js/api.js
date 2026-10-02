// Comunicação com o Supabase (REST, sem biblioteca).
const API = (() => {
  const { SUPABASE_URL: U, SUPABASE_KEY: K } = window.CONFIG;
  async function rpc(fn, body) {
    const headers = { 'Content-Type': 'application/json', apikey: K };
    if (K.startsWith('eyJ')) headers.Authorization = 'Bearer ' + K;
    const r = await fetch(`${U}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  }
  return {
    submit: (variant, operation, ano, nickname, turma, score, correct) =>
      rpc('submit_score', { p_variant: variant, p_operation: operation, p_ano: ano, p_nickname: nickname, p_turma: turma, p_score: score, p_correct: correct }),
    ranking: (variant, operation, ano) =>
      rpc('get_weekly_ranking', { p_variant: variant, p_operation: operation, p_ano: ano, p_limit: 20 }),
  };
})();
