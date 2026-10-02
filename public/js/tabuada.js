// Painel de tabuada (ajuda para multiplicação/divisão), compartilhado pelos 2 jogos.
function tabuadaPanel(btnSel, panelSel) {
  const btn = document.querySelector(btnSel), panel = document.querySelector(panelSel);
  let n = null;
  function render() {
    if (n == null) return;
    let h = `<div class="tab-head">Tabuada do ${n} <button class="tab-close" type="button">✕</button></div><div class="tab-grid">`;
    for (let i = 1; i <= 10; i++) h += `<div>${n} × ${i} = ${n * i}</div>`;
    panel.innerHTML = h + '</div>';
    panel.querySelector('.tab-close').onclick = () => { panel.hidden = true; };
  }
  if (btn) btn.onclick = () => { render(); panel.hidden = !panel.hidden; };
  return {
    setNumber(v) { n = v; if (btn) btn.hidden = v == null; if (!panel.hidden) render(); },
    hide() { if (panel) panel.hidden = true; },
  };
}
