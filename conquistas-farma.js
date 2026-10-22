/* ============================================================
   Conquistas do AprovaFarma (22/10/2026) — os emblemas e de onde sai cada número.
   Motor: mtconquistas.js (cópia de ~/Documents/Claude/_mtconquistas/). Carregar DEPOIS do script principal
   do index.html: usa answers, BANK, CHAVES, okResp, visivelQ, ATIV_KEY e lerJSON de lá.
   Um dia conta para a ofensiva com 5+ questões no dia OU uma sessão de flashcards/treino concluída.
   ============================================================ */
(function () {
  "use strict";
  if (!window.MTConquistas) return;

  var COD = function (t) { return (String(t).match(/^(\d+\.\d+)/) || [, ""])[1]; };
  var FIM = function (n, alvo, un) { return Math.min(n, alvo) + " de " + alvo + (un ? " " + un : ""); };

  /* ---------- dados do app, calculados uma vez por avaliação ---------- */
  function ctx() {
    var c = { n: 0, reais: 0, reaisTot: 0, maxSeq: 0, noite: false, cedo: false, antidoto: 0, temas: {} };
    var lista = [];
    BANK.forEach(function (q, i) {
      if (!visivelQ(i)) return;
      var k = CHAVES[i], a = answers[k], cod = COD(q.tema);
      var tm = c.temas[cod] || (c.temas[cod] = { f: 0, a: 0 });
      if (q.fonte) c.reaisTot++;
      if (!a) return;
      var ok = okResp(k, a);
      c.n++; tm.f++; if (ok) tm.a++;
      if (q.fonte) c.reais++;
      if (a.refeita && ok) c.antidoto++;
      if (a.t) {
        lista.push({ t: a.t, ok: ok });
        var h = new Date(a.t).getHours();
        if (h >= 23 || h < 4) c.noite = true;
        if (h >= 4 && h < 6) c.cedo = true;
      }
    });
    lista.sort(function (x, y) { return x.t - y.t; });
    var run = 0; lista.forEach(function (x) { run = x.ok ? run + 1 : 0; if (run > c.maxSeq) c.maxSeq = run; });

    var ativ = lerJSON(ATIV_KEY, {});
    c.maxDia = 0; Object.keys(ativ).forEach(function (k) { if ((+ativ[k] || 0) > c.maxDia) c.maxDia = +ativ[k]; });
    /* sábado e domingo seguidos, ambos com estudo de verdade */
    c.fds = Object.keys(ativ).some(function (k) {
      if ((+ativ[k] || 0) < 5) return false;
      var d = new Date(k + "T12:00:00"); if (d.getDay() !== 6) return false;
      d.setDate(d.getDate() + 1);
      var dom = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      return (+ativ[dom] || 0) >= 5;
    });

    /* simulados concluídos (as provas e os diários) */
    var diarios = {}; (window.SIMULADOS_DIARIOS || []).forEach(function (s) { diarios[s.id] = 1; });
    c.sims = 0; c.simsDiarios = 0; c.melhorSim = 0;
    (window.SIMULADOS || []).forEach(function (sim) {
      var st = null; try { st = JSON.parse(localStorage.getItem("enareSim_" + sim.id) || "null"); } catch (e) {}
      if (!st || !st.finished) return;
      c.sims++; if (diarios[sim.id]) c.simsDiarios++;
      var tot = 0, cert = 0;
      (sim.questions || []).forEach(function (q, i) {
        if (!q || (typeof ER !== "undefined" && ER.oculta(q._ch || chaveQ(q)))) return;
        tot++; if (q.correct === -1 || (st.answers || {})[i] === q.correct) cert++;
      });
      if (tot >= 20) c.melhorSim = Math.max(c.melhorSim, cert / tot);
    });

    /* treino, flashcards e exames (cada um no seu iframe, lidos daqui pelo localStorage) */
    var tr = lerJSON("enareTreino_v1", {}), fases = (tr && tr.fases) || {};
    c.fases = 0; c.perfeitas = 0;
    Object.keys(fases).forEach(function (k) { var f = fases[k] || {}; c.fases++; if (f.estrelas === 3) c.perfeitas++; });
    var fc = lerJSON("enareFcards_v1", {}), cards = (fc && fc.cards) || {};
    c.dominados = 0; Object.keys(cards).forEach(function (k) { var s = cards[k] || {}; if ((s.n || 0) >= 3 && (s.iv || 0) >= 7) c.dominados++; });
    var ex = lerJSON("enareExames_v1", {});
    c.exames = 0; Object.keys(ex).forEach(function (k) { if (ex[k] && ex[k].s === 1) c.exames++; });
    return c;
  }

  /* ---------- fábricas de teste ---------- */
  function conta(campo, alvo, un) {
    return function (c) { var v = +c[campo] || 0; return { ok: v >= alvo, p: v / alvo, txt: FIM(v, alvo, un) }; };
  }
  function seq(alvo) {
    return function (c) {
      var o = c.ofensiva, v = Math.max(o.max, o.atual);
      return { ok: v >= alvo, p: o.atual / alvo, txt: o.atual ? o.atual + " de " + alvo + " dias seguidos" : alvo + " dias seguidos de estudo" };
    };
  }
  /* domínio: 20+ questões feitas no grupo de temas e 75%+ de acerto */
  function dominio(cods) {
    return function (c) {
      var f = 0, a = 0;
      cods.forEach(function (k) { var t = c.temas[k]; if (t) { f += t.f; a += t.a; } });
      var tx = f ? a / f : 0;
      if (f < 20) return { ok: false, p: 0.5 * f / 20, txt: f + " de 20 questões feitas" };
      return { ok: tx >= 0.75, p: 0.5 + 0.5 * Math.min(1, tx / 0.75), txt: Math.round(100 * tx) + "% de acerto em " + f + " (meta 75%)" };
    };
  }
  var sim = function (v) { return { ok: !!v, p: v ? 1 : 0, txt: "" }; };

  var E = [
    /* sequência de dias */
    { id: "seq3", fam: "seq", icone: "capsula", nome: "Dose de ataque", desc: "3 dias seguidos de estudo", frase: "Três dias seguidos. A dose de ataque já foi; agora é manter.", teste: seq(3) },
    { id: "seq5", fam: "seq", icone: "relogio", nome: "Posologia em dia", desc: "5 dias seguidos de estudo", frase: "Cinco dias sem pular nenhuma tomada.", teste: seq(5) },
    { id: "seq7", fam: "seq", icone: "calendario", nome: "Adesão total", desc: "7 dias seguidos de estudo", frase: "Uma semana inteira. Você ganhou uma folga para um dia difícil.", teste: seq(7) },
    { id: "seq14", fam: "seq", icone: "onda", nome: "Meia-vida longa", desc: "14 dias seguidos de estudo", frase: "Duas semanas. O conteúdo está ficando no organismo.", teste: seq(14) },
    { id: "seq30", fam: "seq", icone: "equilibrio", nome: "Estado de equilíbrio", desc: "30 dias seguidos de estudo", frase: "Trinta dias: passou das cinco meias-vidas. Estado de equilíbrio atingido.", teste: seq(30) },
    { id: "seq60", fam: "seq", icone: "infinito", nome: "Uso contínuo", desc: "60 dias seguidos de estudo", frase: "Sessenta dias. Isso já virou tratamento de manutenção.", teste: seq(60) },
    { id: "seq100", fam: "seq", icone: "coroa", nome: "Farmacopeia viva", desc: "100 dias seguidos de estudo", frase: "Cem dias seguidos. Pouca gente chega aqui.", teste: seq(100) },

    /* questões respondidas */
    { id: "q10", fam: "q", icone: "receita", nome: "Primeira dispensação", desc: "10 questões respondidas", frase: "As primeiras dez já saíram do balcão.", teste: conta("n", 10, "questões") },
    { id: "q50", fam: "q", icone: "frasco", nome: "Receita aviada", desc: "50 questões respondidas", frase: "Cinquenta questões. O ritmo está pegando.", teste: conta("n", 50, "questões") },
    { id: "q100", fam: "q", icone: "tubo", nome: "Bancada cheia", desc: "100 questões respondidas", frase: "Cem questões na bancada.", teste: conta("n", 100, "questões") },
    { id: "q250", fam: "q", icone: "caixa", nome: "Estoque abastecido", desc: "250 questões respondidas", frase: "Duzentas e cinquenta. O estoque está cheio.", teste: conta("n", 250, "questões") },
    { id: "q500", fam: "q", icone: "livros", nome: "Farmacopeia", desc: "500 questões respondidas", frase: "Quinhentas questões. Isso é uma farmacopeia inteira.", teste: conta("n", 500, "questões") },
    { id: "q1000", fam: "q", icone: "mil", nome: "Mil doses", desc: "1.000 questões respondidas", frase: "Mil questões respondidas.", teste: conta("n", 1000, "questões") },
    { id: "q2000", fam: "q", icone: "formulario", nome: "Formulário terapêutico", desc: "2.000 questões respondidas", frase: "Duas mil. Você conhece o banco melhor do que a banca.", teste: conta("n", 2000, "questões") },
    { id: "r100", fam: "q", icone: "alvo", nome: "Prova de fogo", desc: "100 questões de provas reais", frase: "Cem questões tiradas de provas de verdade.", teste: conta("reais", 100, "reais") },
    { id: "rtodas", fam: "q", icone: "trofeu", nome: "Banca zerada", desc: "Todas as questões de provas reais", frase: "Todas as provas reais do app, respondidas.",
      teste: function (c) { return { ok: c.reaisTot > 0 && c.reais >= c.reaisTot, p: c.reaisTot ? c.reais / c.reaisTot : 0, txt: FIM(c.reais, c.reaisTot, "reais") }; } },

    /* acerto */
    { id: "s10", fam: "acerto", icone: "estrela", nome: "Janela terapêutica", desc: "10 acertos seguidos", frase: "Dez certas em sequência, sem sair da janela.", teste: conta("maxSeq", 10, "seguidas") },
    { id: "s25", fam: "acerto", icone: "raio", nome: "Dose exata", desc: "25 acertos seguidos", frase: "Vinte e cinco seguidas sem errar.", teste: conta("maxSeq", 25, "seguidas") },
    { id: "sim80", fam: "acerto", icone: "medidor", nome: "Faixa terapêutica", desc: "80% ou mais num simulado", frase: "Simulado com nota de aprovado.",
      teste: function (c) { return { ok: c.melhorSim >= 0.8, p: c.melhorSim / 0.8, txt: c.melhorSim ? "melhor nota: " + Math.round(100 * c.melhorSim) + "% (meta 80%)" : "Conclua um simulado com 80%" }; } },

    /* domínio por tema */
    { id: "d-atb", fam: "dom", icone: "bacteria", nome: "Espectro ampliado", desc: "Infecção hospitalar e antimicrobianos", frase: "Antimicrobianos dominados. A CCIH aprova.", teste: dominio(["6.4"]) },
    { id: "d-int", fam: "dom", icone: "setas", nome: "Mapa das interações", desc: "Interações medicamentosas", frase: "Indutor, inibidor, substrato: você enxerga a rede.", teste: dominio(["6.11"]) },
    { id: "d-tdm", fam: "dom", icone: "gota", nome: "Nível sérico", desc: "Índice terapêutico estreito", frase: "Vale, pico e faixa sob controle.", teste: dominio(["6.5"]) },
    { id: "d-log", fam: "dom", icone: "caminhao", nome: "Cadeia de suprimentos", desc: "Gestão e logística de medicamentos", frase: "Da seleção à dispensação, sem ruptura.", teste: dominio(["6.10"]) },
    { id: "d-fv", fam: "dom", icone: "sino", nome: "Notifica", desc: "Farmacovigilância e tecnovigilância", frase: "Suspeitou, notificou.", teste: dominio(["6.8", "6.21"]) },
    { id: "d-seg", fam: "dom", icone: "checklist", nome: "Os certos", desc: "Erros de medicação e segurança na prescrição", frase: "Paciente certo, dose certa, via certa.", teste: dominio(["6.6", "6.15"]) },
    { id: "d-af", fam: "dom", icone: "ciclo", nome: "Ciclo da assistência", desc: "Assistência farmacêutica no SUS e CIM", frase: "Seleção, programação, aquisição, armazenamento, distribuição e uso.", teste: dominio(["6.1", "6.2"]) },
    { id: "d-cuid", fam: "dom", icone: "maos", nome: "Cuidado farmacêutico", desc: "Farmácia clínica, processo de cuidado e CFF 585/586", frase: "Do balcão para o lado do paciente.", teste: dominio(["6.7", "6.14", "6.16", "6.12"]) },
    { id: "d-pop", fam: "dom", icone: "pessoas", nome: "Todas as idades", desc: "Seguimento: idoso, cardiologia, pediatria e gestante", frase: "Do recém-nascido ao idoso.", teste: dominio(["6.17", "6.18", "6.19"]) },
    { id: "d-onco", fam: "dom", icone: "laco", nome: "Quimio segura", desc: "Oncologia e terapia nutricional", frase: "Manipulação, dose e suporte nutricional no ponto.", teste: dominio(["6.20"]) },
    { id: "d-calc", fam: "dom", icone: "calculadora", nome: "Cálculo certeiro", desc: "Habilidades: exames, cálculos e leitura crítica", frase: "Diluição, clearance e estudo clínico sem tropeço.", teste: dominio(["6.22", "6.9", "6.13"]) },
    { id: "d-etica", fam: "dom", icone: "juramento", nome: "Juramento", desc: "Código de Ética e atitudes profissionais", frase: "Ética farmacêutica em dia.", teste: dominio(["6.3", "6.23"]) },
    { id: "d-sus", fam: "dom", icone: "balanca", nome: "Lei 8.080", desc: "SUS, Redes de Atenção e ESF/PNAB", frase: "Universalidade, integralidade, equidade.", teste: dominio(["1.2", "1.3", "1.5"]) },
    { id: "d-vig", fam: "dom", icone: "olho", nome: "Sentinela", desc: "Vigilância em Saúde e Segurança do Paciente", frase: "Nenhum evento passa despercebido.", teste: dominio(["1.8", "1.10"]) },
    { id: "d-col", fam: "dom", icone: "hospital", nome: "Saúde coletiva", desc: "As demais políticas de saúde do bloco geral", frase: "O bloco geral, que muita gente deixa para depois, está garantido.", teste: dominio(["1.1", "1.4", "1.6", "1.7", "1.9", "1.11", "1.12"]) },

    /* outras abas */
    { id: "sim1", fam: "abas", icone: "simulado", nome: "Primeiro simulado", desc: "Concluir um simulado", frase: "Prova inteira, do começo ao fim.", teste: conta("sims", 1, "simulado") },
    { id: "sim5", fam: "abas", icone: "trofeu", nome: "Maratonista de simulados", desc: "Concluir 5 simulados", frase: "Cinco provas completas. O dia da prova vai parecer mais um.", teste: conta("sims", 5, "simulados") },
    { id: "simd", fam: "abas", icone: "calendario", nome: "Reta final", desc: "Concluir todos os simulados diários", frase: "Todos os simulados diários feitos.",
      teste: function (c) { var t = (window.SIMULADOS_DIARIOS || []).length || 13; return { ok: c.simsDiarios >= t, p: c.simsDiarios / t, txt: FIM(c.simsDiarios, t, "diários") }; } },
    { id: "tr1", fam: "abas", icone: "estrela", nome: "Fase perfeita", desc: "Uma fase do Treino sem perder vida", frase: "Fase limpa, nenhuma vida perdida.", teste: conta("perfeitas", 1, "fase perfeita") },
    { id: "tr10", fam: "abas", icone: "trilha", nome: "Trilha percorrida", desc: "10 fases do Treino concluídas", frase: "Dez fases do Treino para trás.", teste: conta("fases", 10, "fases") },
    { id: "fc100", fam: "abas", icone: "cerebro", nome: "Memória de longo prazo", desc: "100 flashcards dominados", frase: "Cem cartões que já não saem da cabeça.", teste: conta("dominados", 100, "dominados") },
    { id: "ex60", fam: "abas", icone: "tubo", nome: "Laudo de cor", desc: "60 exames marcados como 'lembrei'", frase: "Valores de referência na ponta da língua.", teste: conta("exames", 60, "exames") },

    /* surpresas (aparecem como "???" até sair) */
    { id: "noite", fam: "sur", icone: "lua", nome: "Plantão noturno", secreto: true, desc: "Estudou depois das 23h", frase: "Estudando no plantão da madrugada. Descanse também.", teste: function (c) { return sim(c.noite); } },
    { id: "cedo", fam: "sur", icone: "sol", nome: "Primeiro horário", secreto: true, desc: "Estudou antes das 6h", frase: "Antes de o sol nascer, já com questão feita.", teste: function (c) { return sim(c.cedo); } },
    { id: "maratona", fam: "sur", icone: "xicara", nome: "Maratona", secreto: true, desc: "100 questões num dia só", frase: "Cem questões num dia. Lembre da água.", teste: function (c) { return sim(c.maxDia >= 100); } },
    { id: "fds", fam: "sur", icone: "fds", nome: "Plantão de fim de semana", secreto: true, desc: "Estudou no sábado e no domingo seguidos", frase: "Sábado e domingo de estudo.", teste: function (c) { return sim(c.fds); } },
    { id: "antidoto", fam: "sur", icone: "antidoto", nome: "Antídoto", secreto: true, desc: "20 questões erradas que você refez e acertou", frase: "Vinte erros revertidos. O antídoto funcionou.", teste: function (c) { return { ok: c.antidoto >= 20, p: c.antidoto / 20, txt: "" }; } }
  ];

  MTConquistas.init({
    chave: "enareFarmaConq_v1",
    chaveDias: "enareFarmaDias_v1",
    dias: function () { return lerJSON(ATIV_KEY, {}); },
    minQuestoes: 5,
    observa: ["enareTreino_v1", "enareFcards_v1", "enareExames_v1", ATIV_KEY, "enareFarmaProgress_v1"],
    familias: [
      { id: "seq", nome: "Sequência de dias", icone: "chama" },
      { id: "q", nome: "Questões respondidas", icone: "receita" },
      { id: "acerto", nome: "Acertos", icone: "alvo" },
      { id: "dom", nome: "Domínio por tema (20+ questões e 75%+ de acerto)", icone: "medalha" },
      { id: "abas", nome: "Simulados, treino, flashcards e exames", icone: "simulado" },
      { id: "sur", nome: "Surpresas", icone: "segredo" }
    ],
    cores: { seq: "#C2410C", q: "#0F766E", acerto: "#B45309", dom: "#6D28D9", abas: "#1D4ED8", sur: "#BE185D" },
    emblemas: E,
    ctx: ctx,
    painel: "pnConq",
    abrePainel: function () { if (typeof setTab === "function") setTab("painel"); setTimeout(function () { var s = document.getElementById("pnConqSec"); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); }
  });
})();
