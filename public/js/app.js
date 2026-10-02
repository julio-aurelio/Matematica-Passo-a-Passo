(() => {
  const $ = (s) => document.querySelector(s);
  const nav = Nav('guiado');
  const tab = tabuadaPanel('#tabuada-btn', '#tabuada-panel');
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  const ROUNDS = 5; // contas por partida
  const COL_S = ['unidade', 'dezena', 'centena', 'unidade de milhar'];
  const COL_P = ['unidades', 'dezenas', 'centenas', 'unidades de milhar'];
  const ABBR = ['U', 'D', 'C', 'UM'];
  const SIGN = { soma: '+', subtracao: '−', multiplicacao: '×', divisao: '÷' };
  const solveArmada = (p) => ({ soma: p.a + p.b, subtracao: p.a - p.b, multiplicacao: p.a * p.b, divisao: p.a / p.b })[p.op];

  // ================= gerador de contas =================
  const digits = (n, len) => String(n).padStart(len, '0').split('').reverse().map(Number); // unidade primeiro

  // nível 1: sem reagrupar | nível 2: com reagrupar (2 dígitos) | nível 3: 3 dígitos com reagrupar
  function genAddSub(op, level) {
    const n = level === 3 ? 3 : 2;
    const lo = 10 ** (n - 1), hi = 10 ** n - 1;
    for (;;) {
      let a = rnd(lo, hi), b = rnd(lo, hi);
      if (op === 'subtracao') { if (a === b) continue; if (a < b) [a, b] = [b, a]; }
      const A = digits(a, n), B = digits(b, n);
      let regroups = 0;
      if (op === 'soma') {
        let c = 0;
        for (let i = 0; i < n; i++) { const t = A[i] + B[i] + c; c = t >= 10 ? 1 : 0; regroups += c; }
      } else {
        const top = [...A];
        for (let i = 0; i < n; i++) {
          if (top[i] < B[i]) {
            if (i + 1 >= n || top[i + 1] === 0) { regroups = -1; break; } // não pedimos emprestado de um zero
            top[i + 1]--; regroups++;
          }
        }
      }
      if (regroups < 0) continue;
      if (level === 1 ? regroups !== 0 : regroups === 0) continue;
      return { op, a, b, A, B, n, level };
    }
  }

  // nível 1/2: multiplicando de 2 dígitos | nível 3: 3 dígitos. Multiplicador: sempre 1 algarismo (2-9).
  function genMultiplication(level) {
    const n = level === 3 ? 3 : 2;
    const lo = 10 ** (n - 1), hi = 10 ** n - 1;
    for (;;) {
      const a = rnd(lo, hi), mult = rnd(2, 9);
      const A = digits(a, n);
      let carry = 0, regroups = 0;
      for (let i = 0; i < n; i++) { const t = A[i] * mult + carry; carry = Math.floor(t / 10); if (carry) regroups++; }
      if (level === 1 ? regroups !== 0 : regroups === 0) continue;
      return { op: 'multiplicacao', a, b: mult, A, B: Array(n).fill(mult), n, level };
    }
  }

  // divisão por 1 algarismo (2-9), sempre exata (resto final 0). n dígitos no dividendo: nível 1→2, 2→3, 3→4.
  // ponytail: só divisor de 1 algarismo e divisão exata — divisor de 2 algarismos/resto ficam para uma v2, se pedirem.
  function genDivision(level) {
    const n = level + 1;
    const d = rnd(2, 9);
    const q0max = Math.floor(9 / d);
    const q0 = rnd(1, q0max);
    const r0max = Math.min(d - 1, 9 - q0 * d);
    const r0 = r0max > 0 ? rnd(0, r0max) : 0;
    const A = [q0 * d + r0];
    let rem = r0;
    for (let i = 1; i < n; i++) {
      let dig;
      if (i === n - 1) {
        const opts = [];
        for (let x = 0; x <= 9; x++) if ((rem * 10 + x) % d === 0) opts.push(x);
        dig = opts[rnd(0, opts.length - 1)];
      } else {
        dig = rnd(0, 9);
      }
      const window = rem * 10 + dig;
      rem = window - Math.floor(window / d) * d;
      A.push(dig);
    }
    const a = Number(A.join(''));
    return { op: 'divisao', a, b: d, A, n, level, divisor: d };
  }

  function genProblem(op, level) {
    if (op === 'divisao') return genDivision(level);
    if (op === 'multiplicacao') return genMultiplication(level);
    return genAddSub(op, level);
  }

  // ================= estado da conta atual =================
  let session = null; // { op, level, i, points, sent }
  let S = null;       // estado da conta

  function newState(p) {
    return {
      p, col: 0, phase: 'total', carry: 0, rem: 0, qGuess: null,
      top: [...p.A], borrowed: Array(p.n).fill(false), lent: Array(p.n).fill(false),
      res: Array(p.n + 1).fill(null), extra: Array(p.n + 1).fill(null),
      errors: 0, tries: 0, marks: new Map(), typed: '', ok: false, msg: '', msgClass: '', next: null, pts: 0,
    };
  }
  function resetStep() { S.tries = 0; S.marks = new Map(); S.typed = ''; S.ok = false; S.msg = ''; S.msgClass = ''; S.next = null; }
  function enterCol() {
    resetStep();
    if (S.p.op === 'divisao') { S.phase = 'quot'; return; }
    S.phase = S.p.op === 'subtracao' && S.top[S.col] < S.p.B[S.col] ? 'canTake' : 'total';
  }

  // valores da etapa atual (soma/subtração/multiplicação)
  const combine = () => (S.p.op === 'multiplicacao' ? S.p.A[S.col] * S.p.B[S.col] : S.p.A[S.col] + S.p.B[S.col]) + S.carry;
  const subEff = () => S.top[S.col] + (S.borrowed[S.col] ? 10 : 0);
  function expected() {
    const { p, col: c } = S;
    if (p.op === 'divisao') {
      const window = S.rem * 10 + p.A[c];
      return S.phase === 'quot' ? Math.floor(window / p.divisor) : window - S.qGuess * p.divisor;
    }
    if (S.phase === 'final') return S.carry;
    if (S.phase === 'write') return combine() - 10;
    return (p.op === 'soma' || p.op === 'multiplicacao') ? combine() : subEff() - p.B[c];
  }

  // ================= textos =================
  function promptText() {
    const { p, col: c } = S;
    if (p.op === 'divisao') {
      const window = S.rem * 10 + p.A[c];
      if (S.phase === 'quot') {
        const desceu = c > 0 ? `Descemos o ${p.A[c]}: temos ${window}. ` : '';
        return `${desceu}Quantas vezes o ${p.divisor} cabe em ${window}?`;
      }
      if (S.phase === 'take') return `${S.qGuess} × ${p.divisor} = ${S.qGuess * p.divisor}. ${window} − ${S.qGuess * p.divisor} = quanto sobra?`;
      if (S.phase === 'done') return `Conta resolvida! ${p.a} ÷ ${p.divisor} = ${p.a / p.divisor}. Você ganhou ${S.pts} pontos.`;
      return '';
    }
    const intro = c === 0 ? `Vamos começar pela ${COL_S[0]}, a coluna da direita. ` : `Agora a ${COL_S[c]}. `;
    switch (S.phase) {
      case 'total':
        if (p.op === 'soma' || p.op === 'multiplicacao') {
          const extra = S.carry ? ` + ${S.carry} (o "vai" que veio da coluna ao lado)` : '';
          return `${intro}Quanto é ${p.A[c]} ${SIGN[p.op]} ${p.B[c]}${extra}?`;
        }
        if (S.borrowed[c]) return `${intro}A ${COL_S[c]} agora vale ${S.top[c]} + 10 = ${subEff()}. Quanto é ${subEff()} − ${p.B[c]}?`;
        return `${intro}${S.lent[c] ? `Ela emprestou 1, então o ${p.A[c]} virou ${S.top[c]}. ` : ''}Quanto é ${S.top[c]} − ${p.B[c]}?`;
      case 'write': {
        const t = combine();
        return `${t} tem 10 ou mais! Dez bolinhas formam 1 ${COL_S[c + 1]}, e ela vai para a coluna do lado ("vai"). Sobram ${t - 10} na ${COL_S[c]}. Que número escrevemos embaixo, na ${COL_S[c]}?`;
      }
      case 'final':
        return `Acabaram os números! Desça o ${S.carry} que veio do "vai". Que número escrevemos na ${COL_S[p.n]}?`;
      case 'canTake':
        return `${intro}Dá para tirar ${p.B[c]} de ${S.top[c]}?`;
      case 'borrow':
        return `${S.top[c]} é menor que ${p.B[c]}, então não dá. Vamos pedir emprestado! Pegamos 1 ${COL_S[c + 1]} (que vale 10 ${COL_P[c]}) da coluna da ${COL_S[c + 1]}.`;
      case 'done':
        return `Conta resolvida! ${p.a} ${SIGN[p.op]} ${p.b} = ${solveArmada(p)}. Você ganhou ${S.pts} pontos.`;
    }
    return '';
  }

  function hintText(tries) {
    const { p, col: c } = S;
    if (p.op === 'divisao') {
      if (S.phase === 'quot') return tries === 1 ? 'Se quiser, toque nas bolinhas para contar de quanto em quanto — ou digite a resposta direto.' : 'Vamos contar juntos!';
      return tries === 1 ? 'Se quiser, toque nas bolinhas para riscar e ver o que sobra — ou digite direto.' : 'Vamos riscar juntos!';
    }
    if (S.phase === 'write') return `Dez bolinhas viram 1 ${COL_S[c + 1]}. Quantas bolinhas sobram na ${COL_S[c]}? ${combine()} − 10 = ?`;
    if (S.phase === 'final') return 'É só descer o número que está no quadradinho verde do "vai".';
    if (p.op === 'soma' || p.op === 'multiplicacao') return tries === 1 ? 'Quase! Se quiser, toque em cada bolinha para contar — ou já digite a resposta.' : 'Vamos contar juntos! Olhe as bolinhas.';
    return tries === 1 ? `Quase! Se quiser, toque nas ${p.B[c]} bolinhas que você precisa tirar — ou já digite a resposta.` : 'Vamos tirar juntos! Olhe as bolinhas.';
  }

  // ================= fluxo =================
  function startGame(op, level) {
    session = { op, level, i: 0, points: 0, sent: false };
    nextProblem();
  }

  function nextProblem() {
    S = newState(genProblem(session.op, session.level));
    enterCol();
    nav.go('s-jogo');
    render();
  }

  function nextCol() {
    S.col++;
    if (S.col < S.p.n) return enterCol();
    if ((S.p.op === 'soma' || S.p.op === 'multiplicacao') && S.carry) { S.phase = 'final'; return resetStep(); }
    finishProblem();
  }

  function finishProblem() {
    const base = 20 + 10 * (session.level - 1);
    S.pts = Math.max(4, base - 4 * S.errors);
    session.points += S.pts;
    S.phase = 'done';
    resetStep();
  }

  function correct() {
    const { p, col: c } = S;
    S.ok = true; S.msgClass = 'good'; S.tries = 0;
    if (p.op === 'divisao') {
      if (S.phase === 'quot') {
        S.qGuess = expected();
        S.msg = `Isso! ${S.qGuess} vezes.`;
        S.next = () => { S.phase = 'take'; resetStep(); };
      } else {
        const window = S.rem * 10 + p.A[c];
        S.res[c] = S.qGuess;
        S.rem = window - S.qGuess * p.divisor;
        S.msg = `Certo! Sobrou ${S.rem}.`;
        S.next = () => { S.col++; if (S.col < p.n) { S.phase = 'quot'; resetStep(); } else finishProblem(); };
      }
      return;
    }
    if (S.phase === 'total' && (p.op === 'soma' || p.op === 'multiplicacao')) {
      const t = combine();
      if (t >= 10) {
        S.msg = `Certo, ${t}! Mas ${t} não cabe numa casa só…`;
        S.next = () => { S.phase = 'write'; resetStep(); };
      } else {
        S.res[c] = t; S.carry = 0;
        S.msg = `Certo! Escreva o ${t} embaixo, na ${COL_S[c]}. 🎉`;
        S.next = nextCol;
      }
    } else if (S.phase === 'write') {
      const t = combine();
      S.res[c] = t - 10; S.carry = 1; S.extra[c + 1] = 1;
      S.msg = `Isso! Escrevemos ${t - 10} embaixo e o 1 "vai" para a ${COL_S[c + 1]}. 🎉`;
      S.next = nextCol;
    } else if (S.phase === 'final') {
      S.res[p.n] = S.carry;
      S.msg = `Isso! Desceu o ${S.carry}. 🎉`;
      S.next = finishProblem;
    } else { // subtração 'total'
      const v = subEff() - p.B[c];
      S.res[c] = v;
      S.msg = `Certo! Escreva o ${v} embaixo, na ${COL_S[c]}. 🎉`;
      S.next = nextCol;
    }
  }

  function submitNumber() {
    if (S.ok || S.typed === '') return;
    if (Number(S.typed) === expected()) return correct();
    const exp = expected();
    S.errors++; S.tries++;
    S.typed = ''; S.msgClass = 'hint';
    if (S.tries >= 3) {
      S.typed = String(exp);
      S.msg = `Tudo bem, errar faz parte! A resposta é ${exp}. Aperte OK para continuar.`;
    } else {
      S.msg = hintText(S.tries);
      if (S.tries === 2) autoHelp();
    }
  }

  function choose(ans) { // etapa "dá para tirar?"
    if (S.ok) return;
    if (ans === 'nao') {
      S.ok = true; S.msgClass = 'good';
      S.msg = `Isso! ${S.top[S.col]} é menor que ${S.p.B[S.col]}, então não dá.`;
      S.next = () => { S.phase = 'borrow'; resetStep(); };
    } else {
      S.errors++; S.tries++; S.msgClass = 'hint';
      S.msg = `Olhe as bolinhas: temos só ${S.top[S.col]} e precisamos tirar ${S.p.B[S.col]}. Será que dá?`;
    }
  }

  function doBorrow() {
    const c = S.col;
    S.top[c + 1]--; S.borrowed[c] = true; S.lent[c + 1] = true; S.extra[c + 1] = S.top[c + 1];
    const msg = `Pronto! O ${S.p.A[c + 1]} virou ${S.top[c + 1]} e a ${COL_S[c]} ganhou 10: ${S.top[c]} + 10 = ${S.top[c] + 10}.`;
    S.phase = 'total'; resetStep();
    S.msg = msg; S.msgClass = 'good';
  }

  function proceed() {
    if (S.phase === 'done') {
      if (session.i + 1 >= ROUNDS) return endGame();
      session.i++;
      return nextProblem();
    }
    if (!S.ok || !S.next) return;
    const f = S.next; S.next = null;
    f();
  }

  // ================= bolinhas (sempre opcionais — quem quiser pode digitar direto) =================
  function ballGroups() {
    const { p, col: c } = S;
    const mk = (k, n, cls) => Array.from({ length: n }, (_, i) => ({ id: `${k}-${i}`, cls }));
    if (p.op === 'divisao') {
      const window = S.rem * 10 + p.A[c];
      return { groups: [{ balls: mk('w', window, 'blue'), cap: `${window}` }], mode: S.phase === 'quot' ? 'count' : 'strike' };
    }
    switch (S.phase) {
      case 'total':
        if (p.op === 'soma' || p.op === 'multiplicacao') {
          const g = p.op === 'soma'
            ? [{ balls: mk('a', p.A[c], 'blue'), cap: `${p.A[c]}` }, { balls: mk('b', p.B[c], 'orange'), cap: `+ ${p.B[c]}` }]
            : [{ balls: mk('a', p.A[c] * p.B[c], 'blue'), cap: `${p.A[c]} × ${p.B[c]}` }];
          if (S.carry) g.push({ balls: mk('c', S.carry, 'green'), cap: '+ ' + S.carry + ' do "vai"' });
          return { groups: g, mode: 'count' };
        }
        return {
          groups: [{ balls: [...mk('t', S.borrowed[c] ? 10 : 0, 'green'), ...mk('u', S.top[c], 'blue')].map((b, i) => ({ ...b, id: 't-' + i })), cap: `${subEff()}${S.borrowed[c] ? ' (10 emprestadas + ' + S.top[c] + ')' : ''}` }],
          mode: 'strike',
        };
      case 'write': {
        const t = combine();
        return { groups: [{ balls: mk('x', 10, 'green'), cap: '10 bolinhas = 1 ' + COL_S[c + 1], ten: true }, { balls: mk('y', t - 10, 'blue'), cap: `sobram ${t - 10}` }], mode: 'static' };
      }
      case 'canTake':
      case 'borrow': {
        const g = [{ balls: mk('a', S.top[c], 'blue'), cap: `temos ${S.top[c]}` }, { balls: mk('b', p.B[c], 'orange'), cap: `tirar ${p.B[c]}`, ghost: true }];
        if (S.phase === 'borrow') g.push({ balls: mk('x', 10, 'green'), cap: `1 ${COL_S[c + 1]} = 10 ${COL_P[c]}`, ten: true, ghost: true });
        return { groups: g, mode: 'static' };
      }
    }
    return { groups: [], mode: 'static' };
  }

  const strikeTarget = () => (S.p.op === 'divisao' ? S.qGuess * S.p.divisor : S.p.B[S.col]);

  function tapBall(id) {
    const { mode } = ballGroups();
    if (S.ok) return;
    if (mode === 'count') { if (!S.marks.has(id)) S.marks.set(id, S.marks.size + 1); }
    else if (mode === 'strike') { if (S.marks.has(id)) S.marks.delete(id); else S.marks.set(id, 1); }
    render();
  }

  // animação "conta/tira pra mim" — mesmo recurso, sem exigir que a criança toque
  function autoHelp() {
    const my = S, step = S.phase + S.col;
    const { groups, mode } = ballGroups();
    if (mode !== 'count' && mode !== 'strike') return;
    const ids = groups.flatMap((g) => g.balls.map((b) => b.id));
    my.marks = new Map();
    const target = strikeTarget();
    const list = mode === 'count' ? ids : ids.slice(ids.length - target);
    list.forEach((id, i) => setTimeout(() => {
      if (S !== my || my.phase + my.col !== step || my.ok) return;
      my.marks.set(id, mode === 'count' ? i + 1 : 1);
      render();
    }, 450 * (i + 1)));
  }

  // ================= renderização =================
  function renderSum() {
    const { p } = S, n = p.n, m = (p.op === 'soma' || p.op === 'multiplicacao') ? n + 1 : n;
    const active = S.phase !== 'done';
    const cur = (i) => (active && i === S.col ? ' cur' : '');
    let h = `<div class="grid" style="grid-template-columns: 36px repeat(${m}, var(--cell))">`;
    h += '<div></div>';
    for (let i = m - 1; i >= 0; i--) h += `<div class="hd${cur(i)}">${ABBR[i]}</div>`;
    // linha de cima: "vai" (soma/multiplicação) ou novo valor após emprestar (subtração)
    h += '<div></div>';
    for (let i = m - 1; i >= 0; i--) {
      if (p.op === 'soma' || p.op === 'multiplicacao') h += i === 0 ? '<div></div>' : `<div class="cell extra${S.extra[i] != null ? ' filled' : ''}">${S.extra[i] ?? ''}</div>`;
      else h += S.lent[i] ? `<div class="cell extra filled">${S.extra[i]}</div>` : '<div class="cell extra" style="border-color:transparent"></div>';
    }
    // número de cima
    h += '<div></div>';
    for (let i = m - 1; i >= 0; i--) {
      if (i >= n) { h += '<div class="cell"></div>'; continue; }
      const cls = 'cell num' + cur(i) + (p.op === 'subtracao' && S.lent[i] ? ' struck' : '');
      h += `<div class="${cls}">${S.borrowed[i] ? '<span class="ten">1</span>' : ''}${p.A[i]}</div>`;
    }
    // número de baixo (na multiplicação só mostra o multiplicador uma vez, na unidade)
    h += `<div class="sign">${SIGN[p.op]}</div>`;
    for (let i = m - 1; i >= 0; i--) {
      if (i >= n || (p.op === 'multiplicacao' && i !== 0)) { h += '<div class="cell"></div>'; continue; }
      h += `<div class="cell num${cur(i)}">${p.B[i]}</div>`;
    }
    h += '<div class="line"></div>';
    // resultado
    h += '<div></div>';
    for (let i = m - 1; i >= 0; i--) h += `<div class="cell res${cur(i)}${S.res[i] != null ? ' filled' : ''}">${S.res[i] ?? ''}</div>`;
    h += '</div>';
    $('#sum').innerHTML = h;
  }

  function renderDivision() {
    const { p, col: c } = S;
    let h = '<div class="lgrid"><div class="lq">';
    for (let i = 0; i < p.n; i++) h += `<span class="lqd${i === c && S.phase !== 'done' ? ' cur' : ''}">${S.res[i] ?? ''}</span>`;
    h += '</div><div class="lrow"><span class="ldiv">' + p.divisor + '</span><span class="lbar">⟌</span><span class="ldig">';
    for (let i = 0; i < p.n; i++) {
      const cls = S.phase === 'done' ? '' : i < c ? 'used' : i === c ? 'cur' : '';
      h += `<span class="${cls}">${p.A[i]}</span>`;
    }
    h += '</span></div></div>';
    $('#sum').innerHTML = h;
  }

  function renderBalls() {
    const { groups, mode } = ballGroups();
    let h = '';
    groups.forEach((g) => {
      h += `<div class="grp${g.ten ? ' ten' : ''}${g.ghost ? ' ghost' : ''}"><div class="g5">`;
      g.balls.forEach((b) => {
        const marked = S.marks.has(b.id);
        const struck = mode === 'strike' && marked;
        const label = mode === 'count' && marked ? S.marks.get(b.id) : struck ? '✕' : '';
        h += `<button class="ball ${struck ? 'struck' : b.cls}" data-id="${b.id}" ${mode === 'static' || S.ok ? 'disabled' : ''} aria-label="bolinha">${label}</button>`;
      });
      h += `</div><div class="cap">${g.cap}</div></div>`;
    });
    if (mode === 'count') h += `<p class="count">Contadas: ${S.marks.size}</p>`;
    if (mode === 'strike') h += `<p class="count">Você tirou ${S.marks.size} de ${strikeTarget()}. Sobraram ${ballGroups().groups[0].balls.length - S.marks.size}.</p>`;
    $('#balls').innerHTML = h;
    const interactive = mode === 'count' || mode === 'strike';
    $('#help').hidden = !interactive || S.ok;
    $('#clear').hidden = !interactive || S.ok;
    $('#help').textContent = mode === 'strike' ? '🫧 Tirar pra mim' : '🫧 Contar pra mim';
  }

  function renderAction() {
    let h = '';
    if (S.phase === 'done') {
      h = `<button class="wide" data-act="proceed">${session.i + 1 >= ROUNDS ? 'Ver resultado 🏁' : 'Próxima conta ▶'}</button>`;
    } else if (S.ok) {
      h = '<button class="wide" data-act="proceed" autofocus>Continuar ▶</button>';
    } else if (S.phase === 'canTake') {
      h = '<div class="choices"><button data-act="sim">👍 Sim, dá</button><button data-act="nao">👎 Não dá</button></div>';
    } else if (S.phase === 'borrow') {
      h = '<button class="wide" data-act="borrow">Pedir emprestado 1 ' + COL_S[S.col + 1] + ' 🔟</button>';
    } else {
      h = `<div class="typed" aria-live="polite">${S.typed || '&nbsp;'}</div><div class="keypad">` +
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}">${d}</button>`).join('') +
        '<button data-act="back">⌫</button><button data-d="0">0</button><button class="ok" data-act="ok">OK</button></div>';
    }
    $('#action').innerHTML = h;
  }

  function render() {
    if (S.p.op === 'divisao') renderDivision(); else renderSum();
    $('#prompt').textContent = promptText();
    renderBalls();
    renderAction();
    const fb = $('#feedback');
    fb.textContent = S.msg; fb.className = 'feedback ' + S.msgClass;
    $('#progress').textContent = `Conta ${session.i + 1} de ${ROUNDS}`;
    $('#points').textContent = session.points;
    tab.setNumber(S.p.op === 'multiplicacao' ? S.p.B[0] : S.p.op === 'divisao' ? S.p.divisor : null);
  }

  // ================= eventos =================
  $('#action').onclick = (e) => {
    const b = e.target.closest('button'); if (!b || !S) return;
    if (b.dataset.d !== undefined) { if (!S.ok && S.typed.length < 2) S.typed += b.dataset.d; }
    else switch (b.dataset.act) {
      case 'back': S.typed = S.typed.slice(0, -1); break;
      case 'ok': submitNumber(); break;
      case 'sim': case 'nao': choose(b.dataset.act); break;
      case 'borrow': doBorrow(); break;
      case 'proceed': proceed(); break;
    }
    render();
  };
  $('#balls').onclick = (e) => { const b = e.target.closest('.ball'); if (b) tapBall(b.dataset.id); };
  $('#help').onclick = () => { if (S && !S.ok) { autoHelp(); } };
  $('#clear').onclick = () => { if (S) { S.marks = new Map(); render(); } };
  $('#speak').onclick = () => {
    if (!('speechSynthesis' in window) || !S) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance($('#prompt').textContent.replace('−', 'menos').replace('+', 'mais').replace('×', 'vezes').replace('÷', 'dividido por'));
    u.lang = 'pt-BR'; u.rate = 0.9;
    speechSynthesis.speak(u);
  };
  if (!('speechSynthesis' in window)) $('#speak').hidden = true;

  document.addEventListener('keydown', (e) => {
    if ($('#s-jogo').hidden || !S) return;
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter' && e.target.tagName === 'BUTTON') return; // o clique do botão já trata
    if (/^[0-9]$/.test(e.key)) { if (!S.ok && ['total', 'write', 'final', 'quot', 'take'].includes(S.phase) && S.typed.length < 2) S.typed += e.key; }
    else if (e.key === 'Backspace') S.typed = S.typed.slice(0, -1);
    else if (e.key === 'Enter') { e.preventDefault(); if (S.ok || S.phase === 'done') proceed(); else submitNumber(); }
    else return;
    render();
  });

  // ================= fim da partida =================
  async function send() {
    if (session.sent) return;
    const st = $('#r-status'); st.className = 'msg'; st.textContent = 'Enviando pontuação…';
    $('#retry-send').hidden = true;
    try {
      await API.submit('guiado', session.op, nav.user.ano, nav.user.nick, nav.user.turma, session.points, ROUNDS);
      session.sent = true;
      st.textContent = '✅ Pontuação enviada para o ranking!';
    } catch {
      st.className = 'msg err'; st.textContent = 'Não consegui enviar a pontuação.';
      $('#retry-send').hidden = false;
    }
  }
  function endGame() {
    $('#r-score').textContent = session.points;
    $('#r-count').textContent = ROUNDS;
    nav.go('s-fim');
    send();
  }
  $('#retry-send').onclick = send;
  let pendingOp = null;
  document.querySelectorAll('[data-jogar]').forEach((b) => { b.onclick = () => { pendingOp = b.dataset.jogar; nav.go('s-nivel'); }; });
  document.querySelectorAll('[data-nivel]').forEach((b) => { b.onclick = () => startGame(pendingOp, Number(b.dataset.nivel)); });
  $('#again').onclick = () => startGame(session.op, session.level);
  $('#see-rank').onclick = () => nav.rank(session.op);
})();
