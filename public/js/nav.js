// Navegação entre telas + telas comuns aos 2 jogos (ano, nome, ranking).
// Fluxo: s-ano > s-nome > s-op > (jogo específico) ; o botão "Voltar" volta uma tela, "Início" volta ao começo.
const Nav = (variant) => {
  const $ = (s) => document.querySelector(s);
  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const user = { ano: Number(store.get('ano')) || 6, nick: store.get('nick'), turma: store.get('turma') };
  const enter = {}, leave = {}, hist = [];
  let cur = 's-ano';

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));
    $('#top').hidden = id === 's-ano';
    cur = id;
    window.scrollTo(0, 0);
    if (enter[id]) enter[id]();
  }
  function go(id) {
    if (id === cur) return;
    if (!$('#' + cur).hasAttribute('data-transient')) hist.push(cur); // telas de jogo/resultado não entram no "voltar"
    if (leave[cur]) leave[cur]();
    show(id);
  }
  function back() { if (leave[cur]) leave[cur](); show(hist.pop() || 's-ano'); }
  function home() { if (leave[cur]) leave[cur](); hist.length = 0; show('s-ano'); }
  $('#back').onclick = back;
  $('#home').onclick = home;

  // ---- 1) ano ----
  document.querySelectorAll('[data-ano]').forEach((b) => {
    b.onclick = () => { user.ano = Number(b.dataset.ano); store.set('ano', user.ano); go('s-nome'); };
  });

  // ---- 2) nome ----
  enter['s-nome'] = () => { $('#nick').value = user.nick; $('#turma').value = user.turma; $('#msg').textContent = ''; };
  $('#form-nome').onsubmit = (e) => {
    e.preventDefault();
    const nick = $('#nick').value.trim();
    const turma = $('#turma').value.trim().toUpperCase();
    if (nick.length < 2) { $('#msg').textContent = 'Escreva seu apelido (pelo menos 2 letras).'; return; }
    if (hasBadWord(nick) || hasBadWord(turma)) { $('#msg').textContent = 'Escolha um apelido/turma sem palavras ofensivas.'; return; }
    user.nick = nick; user.turma = turma;
    store.set('nick', user.nick); store.set('turma', user.turma);
    go('s-op');
  };
  enter['s-op'] = () => { $('#quem').textContent = `${user.nick} · ${user.ano}º ano`; };

  // ---- ranking (por ano e por operação) ----
  let rAno = 6, rOp = 'soma';
  function weekLabel() {
    const d = new Date();
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const f = (x) => x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `Semana de ${f(mon)} a ${f(sun)} (zera toda segunda)`;
  }
  async function loadRanking() {
    document.querySelectorAll('[data-rano]').forEach((b) => b.classList.toggle('active', Number(b.dataset.rano) === rAno));
    document.querySelectorAll('[data-rop]').forEach((b) => b.classList.toggle('active', b.dataset.rop === rOp));
    const ol = $('#rank');
    ol.innerHTML = '<li class="empty">Carregando…</li>';
    try {
      const rows = await API.ranking(variant, rOp, rAno);
      ol.innerHTML = '';
      if (!rows.length) ol.innerHTML = '<li class="empty">Ninguém jogou ainda. Seja o primeiro!</li>';
      rows.forEach((r) => {
        const li = document.createElement('li');
        if (rAno === user.ano && r.nickname.toLowerCase() === user.nick.toLowerCase() && r.turma === user.turma) li.className = 'me';
        const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = ['🥇', '🥈', '🥉'][r.pos - 1] || r.pos + 'º';
        const who = document.createElement('span'); who.className = 'who'; who.textContent = r.nickname;
        if (r.turma) { const t = document.createElement('small'); t.textContent = r.turma; who.append(t); }
        const pts = document.createElement('span'); pts.className = 'pts'; pts.textContent = r.score + ' pts';
        li.append(pos, who, pts);
        ol.append(li);
      });
    } catch {
      ol.innerHTML = '<li class="empty">Não consegui carregar o ranking. Tente de novo mais tarde.</li>';
    }
  }
  enter['s-rank'] = () => { $('#week').textContent = weekLabel(); loadRanking(); };
  document.querySelectorAll('[data-rano]').forEach((b) => { b.onclick = () => { rAno = Number(b.dataset.rano); loadRanking(); }; });
  document.querySelectorAll('[data-rop]').forEach((b) => { b.onclick = () => { rOp = b.dataset.rop; loadRanking(); }; });
  $('#to-rank').onclick = () => { rAno = user.ano; go('s-rank'); };

  return { user, go, back, home, enter, leave, rank: (op) => { rOp = op; rAno = user.ano; go('s-rank'); } };
};
