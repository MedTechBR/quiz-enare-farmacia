/* ============================================================
   mtconquistas.js — emblemas e ofensiva diária dos apps de estudo MedTech (22/10/2026)
   Cópia fiel em cada app (não editar lá; editar aqui e copiar).

   O app chama MTConquistas.init({...}) com:
     chave        localStorage dos emblemas ganhos {id: momento}  (sincronizar como mapa)
     chaveDias    localStorage das sessões que contam o dia {"AAAA-MM-DD": n} (flashcards, treino; mapa)
     dias()       {"AAAA-MM-DD": nº de questões respondidas no dia}
     minQuestoes  questões no dia para o dia contar (padrão 5); uma sessão em chaveDias também conta
     familias     [{id, nome, icone}]
     emblemas     [{id, fam, nome, desc, frase, icone, secreto?, teste(ctx) -> {ok, p (0..1), txt}}]
     ctx()        objeto com os dados do app, calculado uma vez por avaliação; o motor junta ctx.ofensiva
     painel       elemento (ou id) onde desenhar o resumo e a grade
     cores        {famId: "#hex"} (texto branco precisa de 4,5:1)

   Ofensiva: dias seguidos com estudo. A cada 7 dias de estudo ganha-se uma FOLGA (no máximo 2 guardadas):
   um dia sem estudo gasta a folga e não quebra a ofensiva (não soma dia). Tudo é recalculado do histórico,
   então vale igual em qualquer aparelho e não há contador para dessincronizar.
   Emblema ganho fica ganho (mesmo que o critério deixe de valer depois, ex.: zerar as respostas).
   Na primeira vez (sem nada salvo) os emblemas que a pessoa já merecia entram juntos, num aviso só.
   ============================================================ */
(function () {
  "use strict";
  var C = null, ganhos = {}, fila = [], mostrando = false, tAval = null, ultimo = null, primeira = false;
  var DIA = 86400000;

  function iso(d) { var x = d || new Date(); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
  function ler(k, pad) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return (v && typeof v === "object" && !Array.isArray(v)) ? v : pad; } catch (e) { return pad; } }
  function grava() { try { localStorage.setItem(C.chave, JSON.stringify(ganhos)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- ofensiva com folga ---------- */
  function diasEstudados() {
    var q = {}, s = {};
    try { q = C.dias() || {}; } catch (e) {}
    var x = ler(C.chaveDias, {});
    var out = {};
    Object.keys(q).forEach(function (k) { if ((+q[k] || 0) >= C.minQuestoes) out[k] = 1; });
    Object.keys(x).forEach(function (k) { if ((+x[k] || 0) > 0) out[k] = 1; });
    return out;
  }
  function ofensiva() {
    var est = diasEstudados(), ks = Object.keys(est).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort();
    var hoje = iso(), r = { atual: 0, max: 0, folgas: 0, folgaDias: [], hoje: !!est[hoje], diasTotal: ks.length, ontem: false };
    if (!ks.length) return r;
    var run = 0, cont7 = 0, folgas = 0, folgaDias = [], max = 0;
    var d = new Date(ks[0] + "T12:00:00"), fim = new Date(hoje + "T12:00:00");
    for (; d < fim; d.setDate(d.getDate() + 1)) {
      var k = iso(d);
      if (est[k]) { run++; cont7++; if (run > max) max = run; if (cont7 >= 7) { cont7 = 0; folgas = Math.min(2, folgas + 1); } }
      else if (run > 0 && folgas > 0) { folgas--; folgaDias.push(k); }
      else { run = 0; cont7 = 0; folgas = 0; }
    }
    if (est[hoje]) { run++; if (run > max) max = run; }
    r.atual = run; r.max = max; r.folgas = folgas; r.folgaDias = folgaDias;
    return r;
  }

  /* ---------- avaliação ---------- */
  function avaliar(agora) {
    if (!C) return;
    clearTimeout(tAval);
    if (!agora) { tAval = setTimeout(function () { avaliar(true); }, 350); return; }
    var ctx = {};
    try { ctx = C.ctx() || {}; } catch (e) { ctx = {}; }
    ctx.ofensiva = ofensiva();
    ganhos = ler(C.chave, {});
    var novos = [], res = {};
    C.emblemas.forEach(function (e) {
      var t = { ok: false, p: 0, txt: "" };
      try { t = e.teste(ctx) || t; } catch (x) {}
      t.p = Math.max(0, Math.min(1, +t.p || 0));
      res[e.id] = t;
      if (t.ok && !ganhos[e.id]) { ganhos[e.id] = Date.now(); novos.push(e); }
    });
    if (novos.length) grava();
    ultimo = { ctx: ctx, res: res };
    if (novos.length) {
      /* muitos de uma vez (primeira vez, ou o progresso chegou da conta num aparelho limpo): um aviso só */
      if (primeira || novos.length >= 4) { var p0 = primeira; primeira = false; boasVindas(novos, !p0); }
      else novos.forEach(function (e) { fila.push(e); });
      proximo();
    }
    primeira = false;
    pinta();
  }

  /* ---------- medalha ---------- */
  function corDe(e) { return (C.cores && C.cores[e.fam]) || "#2563EB"; }
  function medalha(e, ganho, tam) {
    var oculto = e.secreto && !ganho;
    return '<span class="cq-med' + (ganho ? " on" : "") + '" style="--k:' + corDe(e) + (tam ? ";--t:" + tam + "px" : "") + '">' +
      '<svg class="cq-ic"><use href="#cq-' + (oculto ? "segredo" : (ganho ? e.icone : "cadeado")) + '"/></svg></span>';
  }

  /* ---------- painel ---------- */
  function pinta() {
    var raiz = typeof C.painel === "string" ? document.getElementById(C.painel) : C.painel;
    if (!raiz || !ultimo) return;
    var of = ultimo.ctx.ofensiva, res = ultimo.res;
    var tot = C.emblemas.length, n = C.emblemas.filter(function (e) { return ganhos[e.id]; }).length;
    /* próximo emblema: o bloqueado (não secreto) mais perto de sair */
    var prox = C.emblemas.filter(function (e) { return !ganhos[e.id] && !e.secreto; })
      .sort(function (a, b) { return res[b.id].p - res[a.id].p; }).slice(0, 2);
    var proxSeq = C.emblemas.filter(function (e) { return e.fam === "seq" && !ganhos[e.id]; })[0];
    var subOf = of.hoje ? "Você já estudou hoje" + (proxSeq ? ". Próximo: " + esc(proxSeq.nome) : "")
      : (of.atual ? "Estude hoje para manter a sequência" : "Responda " + C.minQuestoes + " questões ou faça uma sessão para começar");
    var folga = of.folgas ? '<span class="cq-folga" title="Um dia sem estudo gasta a folga e não quebra a sequência"><svg class="cq-ic"><use href="#cq-escudo"/></svg>' +
      of.folgas + " folga" + (of.folgas > 1 ? "s" : "") + " guardada" + (of.folgas > 1 ? "s" : "") + "</span>" : "";
    var html = '<div class="cq-topo">' +
      '<span class="cq-chama' + (of.hoje ? " viva" : "") + '"><svg class="cq-ic"><use href="#cq-chama"/></svg></span>' +
      '<div class="cq-of"><b>' + (of.atual ? of.atual + (of.atual > 1 ? " dias seguidos" : " dia de estudo") : "Sem sequência ainda") + "</b>" +
      "<span>" + subOf + "</span>" + folga + "</div>" +
      '<div class="cq-cont"><b>' + n + "</b><span>de " + tot + " emblemas</span></div></div>";
    if (prox.length) {
      html += '<div class="cq-prox">' + prox.map(function (e) {
        var t = res[e.id];
        return '<div class="cq-pi">' + medalha(e, false, 40) + '<div class="cq-pt"><b>' + esc(e.nome) + "</b><span>" + esc(t.txt || e.desc) + "</span>" +
          '<i class="cq-bar"><i style="width:' + Math.round(100 * t.p) + "%;background:" + corDe(e) + '"></i></i></div></div>';
      }).join("") + "</div>";
    }
    html += '<details class="cq-todos"' + (raiz.querySelector(".cq-todos[open]") ? " open" : "") + '><summary>Ver todos os emblemas</summary>';
    C.familias.forEach(function (f) {
      var es = C.emblemas.filter(function (e) { return e.fam === f.id; });
      if (!es.length) return;
      var nf = es.filter(function (e) { return ganhos[e.id]; }).length;
      html += '<p class="cq-fam"><svg class="cq-ic"><use href="#cq-' + f.icone + '"/></svg>' + esc(f.nome) + "<small>" + nf + "/" + es.length + "</small></p><div class=\"cq-grade\">";
      es.forEach(function (e) {
        var g = ganhos[e.id], t = res[e.id] || { p: 0 }, oc = e.secreto && !g;
        html += '<button type="button" class="cq-b' + (g ? " on" : "") + '" data-cq="' + e.id + '">' + medalha(e, !!g) +
          "<b>" + (oc ? "???" : esc(e.nome)) + "</b><span>" + (oc ? "Emblema secreto" : g ? "Ganho em " + new Date(g).toLocaleDateString("pt-BR") : esc(t.txt || e.desc)) + "</span>" +
          (!g && !oc ? '<i class="cq-bar"><i style="width:' + Math.round(100 * t.p) + "%;background:" + corDe(e) + '"></i></i>' : "") + "</button>";
      });
      html += "</div>";
    });
    html += "</details>";
    raiz.innerHTML = html;
    raiz.querySelectorAll("[data-cq]").forEach(function (b) {
      b.onclick = function () {
        var e = C.emblemas.filter(function (x) { return x.id === b.dataset.cq; })[0];
        if (e && ganhos[e.id]) { fila.push(Object.assign({ _rever: true }, e)); proximo(); }
      };
    });
  }

  /* ---------- comemoração ---------- */
  function proximo() {
    if (mostrando || !fila.length) return;
    mostrando = true;
    var e = fila.shift(), resto = fila.length;
    var ov = document.createElement("div");
    ov.className = "cq-ov";
    ov.innerHTML = '<div class="cq-card" role="dialog" aria-modal="true" aria-label="Emblema conquistado" style="--k:' + corDe(e) + '">' +
      (e._rever ? "" : '<div class="cq-conf">' + new Array(14).join("<i></i>") + "</div>") +
      '<div class="cq-raios"></div>' + medalha(e, true, 96) +
      '<p class="cq-tag">' + (e._rever ? "Emblema" : "Emblema conquistado") + "</p>" +
      "<h2>" + esc(e.nome) + "</h2><p class=\"cq-frase\">" + esc(e.frase || e.desc) + "</p>" +
      '<p class="cq-desc">' + esc(e.desc) + "</p>" +
      '<button type="button" class="cq-ok">' + (resto ? "Próximo (" + resto + ")" : "Continuar") + "</button></div>";
    document.body.appendChild(ov);
    var fecha = function () { ov.classList.add("sai"); setTimeout(function () { ov.remove(); mostrando = false; proximo(); }, 220); };
    ov.querySelector(".cq-ok").onclick = fecha;
    ov.onclick = function (ev) { if (ev.target === ov) fecha(); };
    ov.querySelector(".cq-ok").focus();
  }
  function boasVindas(lista, chegou) {
    if (mostrando) { fila = fila.concat(lista); return; }
    mostrando = true;
    var ov = document.createElement("div");
    ov.className = "cq-ov";
    ov.innerHTML = '<div class="cq-card" role="dialog" aria-modal="true" aria-label="Seus emblemas">' +
      '<p class="cq-tag">Conquistas</p><h2>' + (chegou ? "Você ganhou " : "Você já tinha ") + lista.length + " emblema" + (lista.length > 1 ? "s" : "") + "</h2>" +
      '<p class="cq-frase">' + (chegou ? "Seu progresso da conta chegou a este aparelho." : "Contamos o que você estudou até aqui. Daqui para a frente, cada emblema novo aparece na hora.") + "</p>" +
      '<div class="cq-mini">' + lista.slice(0, 12).map(function (e) { return medalha(e, true, 44); }).join("") + "</div>" +
      '<button type="button" class="cq-ok">Ver no Painel</button></div>';
    document.body.appendChild(ov);
    var fecha = function (ir) { ov.classList.add("sai"); setTimeout(function () { ov.remove(); mostrando = false; if (ir && C.abrePainel) C.abrePainel(); proximo(); }, 220); };
    ov.querySelector(".cq-ok").onclick = function () { fecha(true); };
    ov.onclick = function (ev) { if (ev.target === ov) fecha(false); };
  }

  /* ---------- estilos e ícones ---------- */
  var CSS = '' +
    '.cq-ic{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}' +
    '.cq-med{--t:56px;width:var(--t);height:var(--t);border-radius:50%;display:inline-grid;place-items:center;flex:0 0 auto;font-size:calc(var(--t)*.46);' +
    'background:#F1F3F9;color:#98A2B3;border:2px dashed #D0D5DD;box-sizing:border-box}' +
    '.cq-med .cq-ic{width:46%;height:46%}.cq-chama .cq-ic{width:26px;height:26px}' +
    '.cq-med.on{background:var(--k);color:#fff;border:0;box-shadow:0 0 0 calc(var(--t)*.07) color-mix(in srgb,var(--k) 22%,#fff),0 6px 14px color-mix(in srgb,var(--k) 30%,transparent)}' +
    '.cq-topo{display:flex;align-items:center;gap:14px;flex-wrap:wrap}' +
    '.cq-chama{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-size:26px;background:#F1F3F9;color:#98A2B3}' +
    '.cq-chama.viva{background:#FDF1E3;color:#C2410C}.cq-chama.viva .cq-ic{animation:cqChama 1.6s ease-in-out infinite;transform-origin:50% 90%}' +
    '.cq-of{flex:1;min-width:180px}.cq-of b{display:block;font-size:18px;letter-spacing:-.01em}.cq-of>span{display:block;font-size:13.5px;color:#5D6579}' +
    '.cq-folga{display:inline-flex!important;align-items:center;gap:6px;margin-top:6px;font-size:12.5px;font-weight:600;color:#1D4ED8;background:#EAF1FF;border-radius:999px;padding:3px 10px}' +
    '.cq-cont{text-align:right}.cq-cont b{display:block;font-size:24px;font-variant-numeric:tabular-nums;line-height:1.1}.cq-cont span{font-size:12.5px;color:#5D6579}' +
    '.cq-prox{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:14px}' +
    '.cq-pi{display:flex;gap:10px;align-items:center;background:#F7F8FC;border-radius:16px;padding:10px 12px}' +
    '.cq-pt{flex:1;min-width:0}.cq-pt b{display:block;font-size:14px}.cq-pt>span{display:block;font-size:12.5px;color:#5D6579}' +
    '.cq-bar{display:block;height:5px;border-radius:999px;background:#E7EAF3;overflow:hidden;margin-top:6px}.cq-bar>i{display:block;height:100%;border-radius:999px;transition:width .6s}' +
    '.cq-todos{margin-top:14px}.cq-todos summary{cursor:pointer;font-weight:600;font-size:14px;color:#344054;list-style:none;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:#F1F3F9}' +
    '.cq-todos summary::-webkit-details-marker{display:none}.cq-todos summary::after{content:"";width:7px;height:7px;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg) translateY(-2px);transition:transform .2s}' +
    '.cq-todos[open] summary::after{transform:rotate(-135deg) translateY(-1px)}' +
    '.cq-fam{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:#344054;margin:16px 0 8px}.cq-fam small{margin-left:auto;font-weight:500;color:#667085}' +
    '.cq-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px}' +
    '.cq-b{font:inherit;color:inherit;cursor:default;background:#fff;border:1px solid #E3E7F0;border-radius:18px;padding:14px 8px 12px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px}' +
    '.cq-b.on{cursor:pointer;transition:transform .2s cubic-bezier(.34,1.56,.64,1)}.cq-b.on:hover{transform:translateY(-3px)}' +
    '.cq-b .cq-med{margin-bottom:6px}.cq-b b{font-size:13px;line-height:1.25}.cq-b>span:not(.cq-med){font-size:11.5px;color:#667085;line-height:1.3}.cq-b .cq-bar{width:80%}' +
    '.cq-b:not(.on) b{color:#5D6579}' +
    '.cq-ov{position:fixed;inset:0;z-index:9000;background:rgba(15,18,30,.55);display:grid;place-items:center;padding:20px;animation:cqFundo .25s ease both}' +
    '.cq-ov.sai{opacity:0;transition:opacity .2s}' +
    '.cq-card{--k:#2563EB;position:relative;overflow:hidden;width:min(360px,100%);background:#fff;border-radius:28px;padding:30px 24px 22px;text-align:center;' +
    'box-shadow:0 30px 60px rgba(15,18,30,.3);animation:cqPop .5s cubic-bezier(.34,1.56,.64,1) both;font-family:inherit;color:#141827}' +
    '.cq-card .cq-med{position:relative;z-index:1;animation:cqMed .7s .1s cubic-bezier(.34,1.56,.64,1) both}' +
    '.cq-raios{position:absolute;left:50%;top:78px;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:50%;opacity:.16;' +
    'background:repeating-conic-gradient(var(--k) 0 10deg,transparent 10deg 20deg);animation:cqGira 14s linear infinite;-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}' +
    '.cq-tag{position:relative;margin:16px 0 2px;font-size:12.5px;font-weight:600;letter-spacing:.04em;color:color-mix(in srgb,var(--k) 80%,#141827)}' +
    '.cq-card h2{position:relative;margin:0 0 8px;font-size:23px;letter-spacing:-.02em}' +
    '.cq-frase{position:relative;margin:0 0 6px;font-size:15px;line-height:1.5}.cq-desc{position:relative;margin:0 0 18px;font-size:12.5px;color:#667085}' +
    '.cq-ok{position:relative;border:0;border-radius:999px;min-height:48px;padding:10px 26px;font:inherit;font-weight:600;font-size:15px;cursor:pointer;background:var(--k);color:#fff;' +
    'box-shadow:0 8px 18px color-mix(in srgb,var(--k) 32%,transparent)}' +
    '.cq-mini{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:6px 0 18px}' +
    '.cq-conf{position:absolute;inset:0;pointer-events:none}.cq-conf i{position:absolute;top:-12px;width:8px;height:14px;border-radius:3px;opacity:0;animation:cqConf 1.6s ease-out both}' +
    '.cq-conf i:nth-child(odd){background:var(--k)}.cq-conf i:nth-child(3n){background:#F59E0B}.cq-conf i:nth-child(4n){background:#10B981}.cq-conf i:nth-child(5n){background:#6366F1}' +
    (function () { var s = ""; for (var i = 1; i <= 13; i++) s += ".cq-conf i:nth-child(" + i + "){left:" + (4 + i * 7) + "%;animation-delay:" + ((i * 37) % 400) + "ms;--r:" + ((i * 71) % 360) + "deg}"; return s; })() +
    '@keyframes cqConf{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(320px) rotate(var(--r,200deg))}}' +
    '@keyframes cqPop{from{opacity:0;transform:scale(.85) translateY(20px)}to{opacity:1;transform:none}}' +
    '@keyframes cqMed{0%{transform:scale(0) rotate(-40deg)}100%{transform:none}}' +
    '@keyframes cqGira{to{transform:rotate(360deg)}}@keyframes cqFundo{from{opacity:0}}' +
    '@keyframes cqChama{0%,100%{transform:scale(1) rotate(-3deg)}50%{transform:scale(1.12) rotate(3deg)}}' +
    '@media(max-width:560px){.cq-cont{text-align:left}.cq-grade{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '@media(prefers-reduced-motion:reduce){.cq-ov *,.cq-chama .cq-ic{animation:none!important}.cq-conf{display:none}}';

  var P = {
    chama: '<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    segredo: '<path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.6V14"/><path d="M12 18h.01"/>',
    capsula: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.6 8.6l4.8 6.8"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendario: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 11h16M9 16l2 2 4-4"/>',
    onda: '<path d="M3 17c3 0 3-10 6-10s3 10 6 10 3-6 6-6"/>',
    equilibrio: '<path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6h6zM18 8l-3 6h6z"/>',
    infinito: '<path d="M8 8c-2.2 0-4 1.8-4 4s1.8 4 4 4c4 0 4-8 8-8 2.2 0 4 1.8 4 4s-1.8 4-4 4c-4 0-4-8-8-8z"/>',
    coroa: '<path d="M4 18h16l1-10-5 4-4-6-4 6-5-4z"/><path d="M4 21h16"/>',
    receita: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 9h3a2 2 0 0 1 0 4H9V8M11 13l4 5M15 13l-4 5"/>',
    frasco: '<path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3"/><path d="M7.5 15h9"/>',
    caixa: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    livros: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M15.5 5l3.9-1 2.6 15-3.9 1z"/>',
    mil: '<circle cx="12" cy="12" r="9"/><path d="M8 9l2-1v8M13 8h3l-2 4c2 0 3 1 3 2a2 2 0 0 1-4 1"/>',
    formulario: '<path d="M5 4h14v17H5z"/><path d="M9 4v17M12 9h4M12 13h4M12 17h4"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    fogo: '<path d="M8 21h8M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8 9.5 8z"/>',
    raio: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    medidor: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><path d="M8 18h8"/>',
    lua: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sol: '<circle cx="12" cy="15" r="4"/><path d="M12 5v3M5 15H3M21 15h-2M6.3 9.3L5 8M17.7 9.3L19 8M3 20h18"/>',
    xicara: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3"/>',
    fds: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M14 14h4v4h-4zM7 3v4M17 3v4"/>',
    antidoto: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
    bacteria: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><circle cx="12" cy="11" r="2.5"/><path d="M12 7v1.5M12 13.5V15M8.5 11H9.5M14.5 11h1"/>',
    gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
    setas: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    caminhao: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    checklist: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
    balanca: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    rede: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><path d="M12 7v3M10.5 13.3l-4 3.3M13.5 13.3l4 3.3"/>',
    olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    ciclo: '<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    maos: '<path d="M12 20l-7-7a4 4 0 0 1 6-5.5L12 8.6l1-1.1A4 4 0 0 1 19 13z"/>',
    pessoas: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3 20a5 5 0 0 1 10 0M14 20a3.5 3.5 0 0 1 7 0"/>',
    laco: '<path d="M12 3a4 4 0 0 1 4 4c0 3-4 6-4 6s-4-3-4-6a4 4 0 0 1 4-4z"/><path d="M10 12l-4 9 3-1 1.5 2.5L12 14M14 12l4 9-3-1-1.5 2.5L12 14"/>',
    calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    juramento: '<path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V4a1.5 1.5 0 0 1 3 0v6M13 10V5a1.5 1.5 0 0 1 3 0v6M16 11V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.5L3.5 14a1.5 1.5 0 0 1 2.6-1.5L7 14"/>',
    hospital: '<path d="M4 21V7l8-4 8 4v14"/><path d="M12 9v6M9 12h6M3 21h18"/>',
    simulado: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>',
    trofeu: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    estrela: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    trilha: '<path d="M4 20h4v-4h4v-4h4V8h4"/><circle cx="20" cy="5" r="2"/>',
    cerebro: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    tubo: '<path d="M9 3h6M10 3v13a2 2 0 0 0 4 0V3"/><path d="M10 11h4"/>',
    medalha: '<circle cx="12" cy="14" r="6"/><path d="M8.5 9.2L6 3h4l2 4 2-4h4l-2.5 6.2"/><path d="M12 11.5l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>'
  };

  function instala() {
    if (document.getElementById("cq-estilo")) return;
    var st = document.createElement("style"); st.id = "cq-estilo"; st.textContent = CSS; document.head.appendChild(st);
    var sp = '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' +
      Object.keys(P).map(function (k) { return '<symbol id="cq-' + k + '" viewBox="0 0 24 24">' + P[k] + "</symbol>"; }).join("") + "</svg>";
    var d = document.createElement("div"); d.innerHTML = sp; document.body.appendChild(d.firstChild);
  }

  window.MTConquistas = {
    init: function (cfg) {
      C = Object.assign({ minQuestoes: 5, cores: {} }, cfg);
      var cru = null; try { cru = localStorage.getItem(C.chave); } catch (e) {}
      primeira = (cru === null);
      instala();
      addEventListener("storage", function (e) { if (!e.key || e.key === C.chave || e.key === C.chaveDias || (C.observa && C.observa.indexOf(e.key) >= 0)) avaliar(); });
      setTimeout(function () { avaliar(true); }, C.atraso == null ? 2500 : C.atraso);   /* dá tempo de a conta trazer o que já existe */
    },
    avaliar: function () { avaliar(false); },
    /* sessão concluída fora das questões (flashcards, treino): o dia conta */
    sessao: function () {
      if (!C) return;
      var x = ler(C.chaveDias, {}), k = iso(); x[k] = (+x[k] || 0) + 1;
      try { localStorage.setItem(C.chaveDias, JSON.stringify(x)); } catch (e) {}
      avaliar(false);
    },
    ofensiva: function () { return C ? ofensiva() : null; },
    ganhos: function () { return Object.assign({}, ganhos); },
    pinta: pinta
  };
})();
