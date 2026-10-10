/* conta-enare.js — liga o mtsync.js (conta MedTech + sincronização) à Banca ENARE Farmácia (10/10/2026).
   O motor é a cópia de ~/Documents/Claude/_mtsync/mtsync.js (não editar aqui). Este arquivo só diz ao
   motor onde o app guarda cada coisa e como redesenhar a tela quando chega dado de outro aparelho.

   O app grava direto no localStorage, de vários lugares: a página principal e os módulos em iframe
   (planilha, flashcards, treino). Para não perder mudança nenhuma, três caminhos avisam o motor:
     1) setItem/removeItem embrulhados nesta janela;
     2) evento "storage" (é como as gravações dos iframes e de outra aba chegam aqui);
     3) varredura barata a cada 4 s (compara o texto cru de cada chave).
   Os iframes se atualizam sozinhos pelo evento "storage" quando esta janela grava o que veio da nuvem.

   Nuvem: users/{uid}/apps/enare-farmacia/sync/<coleção>~<id>, um documento por item.

   REGRA DO DONO (10/10/2026, acima do brief): há gente usando o app; o progresso local NUNCA é apagado.
     - Migração é só cópia. Antes do motor começar, todas as chaves enare* (texto cru) vão para uma
       RESERVA imutável no IndexedDB "enare-reserva" (chave "antes-da-conta", só se ainda não existir,
       conferida lendo de volta). Nada neste arquivo apaga a reserva.
     - Chave com JSON ilegível: a coleção fica FORA da sincronização (nem sobe vazia, nem é regravada).
     - gravar() nunca remove chave e nunca troca coleção com itens por coleção vazia.
     - Sair da conta / troca de conta: limparLocal NÃO apaga nada; só copia o estado para a reserva
       ("saida-<uid>-<momento>"). Consequência aceita: outra conta que entrar neste aparelho recebe
       esse progresso. */
(function () {
  "use strict";
  const APP = "enare-farmacia", ACESSO = "enarefarmacia", NOME = "Banca ENARE Farmácia";
  const PREF = "enare_";                 /* o motor grava enare_mts e enare_mts_uid: fora de tudo o que sincroniza */
  const FILA_SINAL = "msn_fila:quiz-enare-farmacia";   /* fila da caixa central (mtsinal.js) */
  const IDB_PLANILHA = "enarePlanilhaDB";
  const IDB_RESERVA = "enare-reserva";
  const SIM = "enareSim_";               /* um simulado por chave: enareSim_<id> */
  const X = () => window.__enare;        /* ganchos expostos pelo index.html */

  /* chave do app -> coleção */
  const CHAVE = {
    resp: "enareFarmaProgress_v1",       /* respostas do banco, por chave estável da questão */
    riscos: "enareStrikes_v1",           /* alternativas riscadas */
    sinal: "enareSinal_v1",              /* questões sinalizadas (mtsinal.js) */
    ocultos: "enareHidden_v1",           /* materiais removidos da lista (lista de ids -> mapa) */
    ativ: "enareFarmaAtiv_v1",           /* questões por dia (heatmap) */
    meta: "enareFarmaMeta_v1",           /* data da prova e meta */
    plano: "enareFarmaPlano_v1",         /* dias do cronograma concluídos */
    planilha: "enarePlanilha_v1",        /* log de erros: célula por célula */
    fcards: "enareFcards_v1",            /* flashcards: cartão por cartão */
    treino: "enareTreino_v1"             /* treino: fase por fase */
  };
  const TODAS = {
    resp: { tipo: "mapa" }, riscos: { tipo: "mapa" }, sinal: { tipo: "mapa" }, ocultos: { tipo: "mapa" },
    plano: { tipo: "mapa" }, sim: { tipo: "mapa" }, planilha: { tipo: "mapa" }, fcards: { tipo: "mapa" }, treino: { tipo: "mapa" },
    ativ: { tipo: "soma" },
    meta: { tipo: "doc" }
  };
  let COLECOES = TODAS;                  /* o que o motor sincroniza (sem as coleções com chave ilegível) */
  const PORCHAVE = {}; Object.keys(CHAVE).forEach(c => PORCHAVE[CHAVE[c]] = c);
  const colDe = k => (typeof k !== "string") ? null : (PORCHAVE[k] || (k.startsWith(SIM) ? "sim" : null));

  /* ---------- leitura crua ---------- */
  const getRaw = k => { try { return localStorage.getItem(k) } catch (e) { return null } };
  function simChaves() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(SIM) && k.length > SIM.length) out.push(k) } } catch (e) {}
    return out.sort();
  }
  /* texto cru de uma coleção (assinatura para a varredura e para o cache) */
  function cru(c) {
    if (c === "sim") return simChaves().map(k => k + "\u0001" + getRaw(k)).join("\u0002");
    return getRaw(CHAVE[c]);
  }
  const parse = s => { if (s === null || s === undefined || s === "") return { ok: true, v: null }; try { return { ok: true, v: JSON.parse(s) } } catch (e) { return { ok: false } } };
  const obj = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
  /* planilha, flashcards e treino viram mapa por item; o que não é coleção de itens vai como "#campo" */
  const ID_PL = (t, ...p) => JSON.stringify([t].concat(p));
  function achata(c, v) {
    if (c === "ocultos") { const m = {}; (Array.isArray(v) ? v : []).forEach(id => { if (typeof id === "string" && id) m[id] = 1 }); return m }
    if (c === "planilha") {
      const m = {}, p = obj(v);
      Object.keys(obj(p.edits)).forEach(sh => Object.keys(obj(p.edits[sh])).forEach(a => { const x = p.edits[sh][a]; if (x !== undefined) m[ID_PL("e", sh, a)] = x }));
      Object.keys(obj(p.extraRows)).forEach(sh => { const n = +p.extraRows[sh]; if (n) m[ID_PL("r", sh)] = n });
      return m;
    }
    if (c === "fcards" || c === "treino") {
      const sub = c === "fcards" ? "cards" : "fases", m = {}, p = obj(v);
      Object.keys(p).forEach(k => { if (k === sub) return; if (p[k] !== undefined) m["#" + k] = p[k] });
      Object.keys(obj(p[sub])).forEach(id => { if (p[sub][id] !== undefined) m[id] = p[sub][id] });
      return m;
    }
    return obj(v);
  }
  function monta(c, m) {
    if (c === "ocultos") {
      let ant = []; const p = parse(getRaw(CHAVE.ocultos)); if (p.ok && Array.isArray(p.v)) ant = p.v;
      const out = ant.filter(id => id in m); Object.keys(m).forEach(id => { if (!out.includes(id)) out.push(id) });
      return out;
    }
    if (c === "planilha") {
      const edits = {}, extraRows = {};
      Object.keys(m).forEach(id => {
        let a; try { a = JSON.parse(id) } catch (e) { return }
        if (!Array.isArray(a)) return;
        if (a[0] === "e" && a.length === 3) { (edits[a[1]] = edits[a[1]] || {})[a[2]] = m[id] }
        else if (a[0] === "r" && a.length === 2) extraRows[a[1]] = +m[id] || 0;
      });
      return { edits, extraRows, ts: Date.now() };
    }
    if (c === "fcards" || c === "treino") {
      const sub = c === "fcards" ? "cards" : "fases", out = {}; out[sub] = {};
      Object.keys(m).forEach(id => { if (id.charAt(0) === "#") out[id.slice(1)] = m[id]; else out[sub][id] = m[id] });
      return out;
    }
    return m;
  }

  /* ---------- ler (com cache pelo texto cru; JSON quebrado devolve o último bom, nunca vazio) ----------
     Trava de esvaziamento: coleção que tinha 3 ou mais itens e ficou vazia de uma vez (chave apagada,
     armazenamento limpo com o app aberto) é lida como antes, para não subir lápide de tudo. Só os botões
     de zerar do próprio app liberam (window.__enareZerou[col] = momento, válido por 2 min). */
  const cache = {}, ultimoBom = {}, ultimoCheio = {};
  const nIt = (c, v) => TODAS[c].tipo === "doc" ? (v === undefined || v === null ? 0 : 1) : Object.keys(v || {}).length;
  const zerouAgora = c => { try { const z = window.__enareZerou && window.__enareZerou[c]; return !!z && Date.now() - z < 120000 } catch (e) { return false } };
  function ler(c) {
    const v = lerCru(c), n = nIt(c, v);
    if (n === 0 && ultimoCheio[c] && nIt(c, ultimoCheio[c]) >= 3 && !zerouAgora(c)) {
      if (!ler.avisado) { ler.avisado = 1; console.warn("conta-enare: \"" + c + "\" ficou vazio de uma vez sem o botão de zerar; nada é apagado na nuvem") }
      return ultimoCheio[c];
    }
    if (n > 0 || zerouAgora(c)) ultimoCheio[c] = n > 0 ? v : null;
    return v;
  }
  function lerCru(c) {
    const r = cru(c);
    if (cache[c] && cache[c].r === r) return cache[c].v;
    let v;
    if (c === "sim") {
      v = {};
      for (const k of simChaves()) {
        const p = parse(getRaw(k));
        if (!p.ok) { if (ultimoBom.sim && k.slice(SIM.length) in ultimoBom.sim) v[k.slice(SIM.length)] = ultimoBom.sim[k.slice(SIM.length)]; continue }
        if (p.v !== null) v[k.slice(SIM.length)] = p.v;
      }
    } else {
      const p = parse(r);
      if (!p.ok) return ultimoBom[c] !== undefined ? ultimoBom[c] : (TODAS[c].tipo === "doc" ? undefined : {});
      v = c === "meta" ? (p.v === null ? undefined : p.v) : achata(c, p.v);
    }
    cache[c] = { r, v }; ultimoBom[c] = v;
    return v;
  }

  /* ---------- gravar: escreve o valor que o motor montou (local + nuvem) ----------
     Nunca remove chave, nunca grava por cima de chave ilegível, nunca troca itens por vazio. */
  let gravando = false;
  function setRaw(k, s) { gravando = true; try { localStorage.setItem(k, s) } finally { gravando = false } }
  const legivel = k => { const r = getRaw(k); return r === null || parse(r).ok };
  const nItens = (c, v) => Object.keys(c === "meta" ? (v === undefined || v === null ? {} : { _: v }) : achata(c, v)).length;
  function gravar(c, v) {
    if (c === "sim") {
      if (!v || typeof v !== "object") return;
      /* simulado apagado em outro aparelho continua aqui (a chave não é removida) */
      Object.keys(v).forEach(id => { const k = SIM + id, s = JSON.stringify(v[id]); if (legivel(k) && getRaw(k) !== s) setRaw(k, s) });
      delete cache.sim; return;
    }
    const k = CHAVE[c]; if (!legivel(k)) return;
    if (c === "meta") { if (v === undefined || v === null) return; setRaw(k, JSON.stringify(v)); delete cache.meta; return }
    if (!v || typeof v !== "object") return;
    const valor = monta(c, v);
    const atual = parse(getRaw(k));
    if (!Object.keys(v).length && atual.ok && atual.v !== null && nItens(c, atual.v)) return;
    setRaw(k, JSON.stringify(valor));
    delete cache[c];
    if (c === "planilha") espelhaPlanilha(valor);
  }
  /* a planilha tem uma segunda camada no IndexedDB que "recupera" a versão com mais células ao abrir:
     ela precisa receber o mesmo valor, senão desfaria o que veio de outro aparelho */
  function abrePlanilhaDB() {
    return new Promise(ok => {
      let rq; try { rq = indexedDB.open(IDB_PLANILHA, 1) } catch (e) { return ok(null) }
      rq.onupgradeneeded = () => { const db = rq.result;
        if (!db.objectStoreNames.contains("estado")) db.createObjectStore("estado");
        if (!db.objectStoreNames.contains("backups")) db.createObjectStore("backups", { keyPath: "ts" }) };
      rq.onsuccess = () => ok(rq.result); rq.onerror = rq.onblocked = () => ok(null);
    });
  }
  function espelhaPlanilha(p) {
    abrePlanilhaDB().then(db => { if (!db) return;
      try { const tx = db.transaction("estado", "readwrite"); tx.objectStore("estado").put(p, "atual"); tx.oncomplete = tx.onerror = () => db.close() } catch (e) { try { db.close() } catch (x) {} }
    });
  }

  /* ---------- reserva imutável (IndexedDB "enare-reserva") ---------- */
  function abreReserva() {
    return new Promise(ok => {
      let rq; try { rq = indexedDB.open(IDB_RESERVA, 1) } catch (e) { return ok(null) }
      rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains("reserva")) rq.result.createObjectStore("reserva") };
      rq.onsuccess = () => ok(rq.result); rq.onerror = rq.onblocked = () => ok(null);
    });
  }
  function fotoPlanilhaDB() {
    return new Promise(ok => {
      let rq; try { rq = indexedDB.open(IDB_PLANILHA) } catch (e) { return ok(null) }
      rq.onupgradeneeded = () => { try { rq.transaction.abort() } catch (e) {} };   /* não cria o banco se não existir */
      rq.onerror = rq.onblocked = () => ok(null);
      rq.onsuccess = () => { const db = rq.result;
        try { const g = db.transaction("estado", "readonly").objectStore("estado").get("atual");
          g.onsuccess = () => { db.close(); ok(g.result === undefined ? null : JSON.stringify(g.result)) }; g.onerror = () => { db.close(); ok(null) } }
        catch (e) { db.close(); ok(null) } };
    });
  }
  async function foto() {
    const chaves = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("enare") && !k.startsWith(PREF)) chaves[k] = localStorage.getItem(k) } } catch (e) {}
    return { em: new Date().toISOString(), origem: location.href, chaves, planilhaIDB: await fotoPlanilhaDB() };
  }
  /* grava `chave` só se ainda não existir e confere lendo de volta; devolve true se a reserva existe */
  async function reserva(chave, so_se_nao_existe) {
    const db = await abreReserva(); if (!db) return false;
    const tx = (m, f) => new Promise(ok => { try { const t = db.transaction("reserva", m), r = f(t.objectStore("reserva")); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined) } catch (e) { ok(undefined) } });
    try {
      if (so_se_nao_existe && (await tx("readonly", st => st.get(chave))) !== undefined) return true;
      const f = await foto();
      await tx("readwrite", st => st.add(f, chave));          /* add: nunca sobrescreve */
      const volta = await tx("readonly", st => st.get(chave));
      return !!volta && JSON.stringify(volta.chaves) === JSON.stringify(f.chaves);
    } finally { try { db.close() } catch (e) {} }
  }

  /* ---------- sair / troca de conta: NADA é apagado do aparelho (regra do dono) ---------- */
  async function limparLocal() {
    const uid = getRaw(PREF + "mts_uid") || "sem-uid";
    try { await reserva("saida-" + uid + "-" + new Date().toISOString(), false) } catch (e) {}
  }

  /* ---------- chave com JSON ilegível: a coleção fica fora da sincronização ----------
     Não sobe vazia (apagaria a nuvem) e não é regravada (a chave original fica como está). */
  function semCorrompidos() {
    const fora = new Set();
    Object.keys(CHAVE).forEach(c => { if (!legivel(CHAVE[c])) fora.add(c) });
    if (simChaves().some(k => !legivel(k))) fora.add("sim");
    fora.forEach(c => console.warn("conta-enare: dados de \"" + c + "\" ilegíveis neste aparelho; ficam como estão e fora da sincronização"));
    const out = {}; Object.keys(TODAS).forEach(c => { if (!fora.has(c)) out[c] = TODAS[c] });
    window.__enareFora = [...fora];
    return out;
  }

  /* ---------- detecção de mudança ---------- */
  const visto = {};
  const toca = c => { if (!c) return; visto[c] = cru(c); if (!gravando) MTS.mudou(c) };
  const SP = Storage.prototype, oSet = SP.setItem, oRem = SP.removeItem, oClr = SP.clear;
  SP.setItem = function (k) { const r = oSet.apply(this, arguments); try { if (this === localStorage) toca(colDe(String(k))) } catch (e) {} return r };
  SP.removeItem = function (k) { const r = oRem.apply(this, arguments); try { if (this === localStorage) toca(colDe(String(k))) } catch (e) {} return r };
  SP.clear = function () { const r = oClr.apply(this, arguments); try { if (this === localStorage) Object.keys(COLECOES).forEach(toca) } catch (e) {} return r };
  addEventListener("storage", e => { if (e.storageArea && e.storageArea !== localStorage) return; if (e.key === null) Object.keys(COLECOES).forEach(toca); else toca(colDe(e.key)) });
  let varreT = null;
  function varredura() { Object.keys(COLECOES).forEach(c => { const r = cru(c); if (visto[c] !== r) toca(c) }) }

  /* ---------- tela ---------- */
  function aoReceber(cols) { try { X().recarrega(cols) } catch (e) { console.warn("conta-enare: redesenho", e) } }

  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  function pinta() {
    const slot = document.getElementById("contaCartao"); if (!slot) return;
    const u = MTS.usuario; if (!u) { slot.innerHTML = ""; return }
    const d = MTS.descreve();
    slot.innerHTML = `<p class="conta-quem">Conectado como <b>${esc(u.displayName || u.email || "")}</b>${u.displayName && u.email ? ` <span>(${esc(u.email)})</span>` : ""}</p>
      <p class="conta-sit ${d.cl}" id="contaSit" role="status">${esc(d.txt)}</p>
      <p class="conta-txt">Suas respostas, simulados, flashcards, treino, log de erros, revisão e sinalizações são salvos na conta enquanto você estuda e aparecem iguais no celular e no computador. Sem internet o app continua funcionando e envia depois.</p>
      <button class="ghost" id="contaSair" type="button">Sair da conta</button>`;
    slot.querySelector("#contaSair").onclick = () => { if (confirm("Sair da conta? A tela de entrada volta e seu progresso continua salvo na conta.")) MTS.sair() };
  }

  /* coleção vazia neste aparelho que o motor já conhecia com itens (aparelho limpo com a sessão viva):
     esquece a base dela e relê a nuvem do zero, em vez de mandar apagar tudo lá */
  function reponhaVazias() {
    let E = null; try { E = JSON.parse(getRaw(PREF + "mts")) } catch (e) {}
    if (!E || !E.base) return;
    let mexeu = false;
    Object.keys(COLECOES).forEach(c => {
      const b = E.base[c] || {}, vivos = Object.keys(b).filter(id => b[id] !== "x").length;
      if (vivos && nIt(c, lerCru(c)) === 0) { ["base", "ed", "bt", "bh"].forEach(p => { if (E[p]) delete E[p][c] }); mexeu = true;
        console.warn("conta-enare: \"" + c + "\" vazio aqui; volta da nuvem") }
    });
    if (mexeu) { E.cursor = 0; try { localStorage.setItem(PREF + "mts", JSON.stringify(E)) } catch (e) {} }
  }

  async function inicia() {
    /* primeira coisa, antes de qualquer login: a reserva do que o aparelho já tem */
    let ok = false; try { ok = await reserva("antes-da-conta", true) } catch (e) {}
    window.__enareReserva = ok;
    if (!ok) console.warn("conta-enare: não consegui confirmar a reserva no IndexedDB (sigo só copiando, sem apagar nada)");
    COLECOES = semCorrompidos();
    reponhaVazias();
    Object.keys(COLECOES).forEach(c => { visto[c] = cru(c) });
    MTS.aoMudarSituacao(s => { const el = document.getElementById("contaSit"); if (el) { const d = MTS.descreve(s); el.textContent = d.txt; el.className = "conta-sit " + d.cl } });
    MTS.iniciar({
      app: APP, nome: NOME, pref: PREF, vendor: "/vendor/firebase/",
      cores: { cor: "#0F766E", fundo: "#F5F6FB", texto: "#141827", suave: "#5D6579", borda: "#E3E7F0", campo: "#FFFFFF" },
      colecoes: COLECOES,
      ler, gravar, aoReceber, limparLocal,
      aoEntrar(u) {
        if (window.MTAcesso) MTAcesso.verificar({ appId: ACESSO, user: u, signOut: () => MTS.sair() }).catch(() => {});
        pinta();
        if (!varreT) varreT = setInterval(varredura, 4000);
      }
    });
  }
  window.__contaEnare = { pinta, ler, colDe, COLECOES, CHAVE };
  if (window.__enarePronto) inicia(); else addEventListener("enare-pronto", inicia, { once: true });
})();
