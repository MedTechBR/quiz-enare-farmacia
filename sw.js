/* Service Worker — Banca ENARE Farmácia (PWA)
   Estratégia:
   - HTML (navegação): network-first → cai para o cache quando offline.
   - Estáticos da mesma origem: stale-while-revalidate (serve do cache e sempre revalida; cura
     precache envenenado pela borda do CDN sem depender de novo deploy).
   - Outras origens (Firebase, Cloud Functions, Mercado Pago) e /planos.json: não passam por aqui.
   Conta (10/10/2026): mtsync.js, conta-enare.js, o SDK do Firebase vendorizado do site e o
   /_mtacesso.js?v=12 vão no precache, para o app abrir sem internet depois do primeiro login.
   Obs.: o progresso do usuário fica no localStorage (e na conta), que NÃO é tocado por este cache. */

const CACHE = "enare-farma-v52";
const ASSETS = [
  "./",
  "./index.html",
  "./planilha/planilha.html",
  "./planilha/planilha-dados.js",
  "./treino/treino.html",
  "./treino/treino-conteudo.js",
  "./flashcards/flashcards.html",
  "./flashcards/flashcards-conteudo.js",
  "./simulados.js",
  "./simulados_diarios.js",
  "./fonts/inter-400.woff2",
  "./fonts/inter-500.woff2",
  "./fonts/inter-600.woff2",
  "./fonts/inter-700.woff2",
  "./banco_edital.js",
  "./migracao_respostas.js",
  "./incidencia.js",
  "./cronograma.js",
  "./mtfiltro.js",
  "./mtsinal.js",
  "./mterrata.js",
  "./mtsync.js",
  "./conta-enare.js",
  "/vendor/firebase/firebase-app-compat.js",
  "/vendor/firebase/firebase-auth-compat.js",
  "/vendor/firebase/firebase-firestore-compat.js",
  "/_mtacesso.js?v=12",
  "./exames/flashcards-lab.html",
  "./sim-img/aocp-q2.png",
  "./sim-img/aocp-q6.png",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./estudos/historia-politicas-saude-reforma-sanitaria.html",
  "./estudos/sus-principios-legislacao-controle-social.html",
  "./estudos/redes-atencao-saude.html",
  "./estudos/esf-pnab-atencao-basica.html",
  "./estudos/politica-nacional-humanizacao-pnh.html",
  "./estudos/politica-nacional-vigilancia-saude.html",
  "./estudos/educacao-permanente-saude-pneps.html",
  "./estudos/inclusao-grupos-vulnerabilizados-saude.html",
  "./estudos/trabalho-equipe-multidisciplinar.html",
  "./estudos/programa-nacional-seguranca-paciente.html",
  "./estudos/nr32-seguranca-saude-trabalho-servicos-saude.html",
  "./estudos/bioetica.html",
  "./farmacia/interacoes-cyp450-mapa-mental.html",
  "./farmacia/medicamentos-snc-mapa-mental.html",
  "./farmacia/caderno-questoes-comentadas.html",
  "./farmacia/apostila-revisao-residencia-farmacia.pdf",
  "./farmacia/caderno-questoes-comentadas.pdf",
  "./farmacia/antimicrobianos-mapa-mental.html",
  "./farmacia/bacterias_resistentes.html",
  "./farmacia/portaria-344-mapa-mental.html",
  "./farmacia/processo-cuidado-paciente.html",
  "./farmacia/orientacao-farmaceutica-adesao.html",
  "./farmacia/interacoes-medicamentosas.html",
  "./farmacia/monitorizacao-terapeutica-it-estreito.html",
  "./farmacia/seguimento-cardiologia.html",
  "./farmacia/seguimento-paciente-idoso.html",
  "./farmacia/seguimento-pediatria.html",
  "./farmacia/oncologia-terapia-nutricional.html",
  "./farmacia/infeccao-hospitalar-antimicrobianos.html",
  "./farmacia/gestao-logistica-medicamentos.html",
  "./farmacia/erros-de-medicacao.html",
  "./farmacia/protocolo-seguranca-medicamentos.html",
  "./farmacia/resolucoes-cff-585-586.html",
  "./farmacia/farmacoepidemiologia.html",
  "./farmacia/estudos-medicamentos-fases-eum.html",
  "./farmacia/farmacovigilancia-ram.html",
  "./farmacia/assistencia-farmaceutica-sus.html",
  "./farmacia/centro-informacao-medicamentos.html"
];

/* Pesados (best-effort): se falharem, NÃO impedem a instalação do SW. */
const ASSETS_OPCIONAIS = ["./dados/cronograma_enare_farmacia.pdf"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) =>
        c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))).then(() =>
          Promise.all(ASSETS_OPCIONAIS.map((u) => c.add(u).catch(() => null)))
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Firestore/Auth/Cloud Functions/Mercado Pago: nunca do cache (o canal do Firestore usa GET)
  if (url.origin !== location.origin) return;
  // catálogo de planos (paywall): sempre da rede; sem rede o _mtacesso libera (falha aberta)
  if (url.pathname === "/planos.json") return;

  const isNav = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    // network-first para o HTML (app e guias de estudo), cada um sob a própria URL
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html") || caches.match("./")))
    );
    return;
  }

  // stale-while-revalidate para estáticos da mesma origem
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const rede = fetch(req, { cache: "no-cache" }).then((res) => {
        if (res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || rede;
    }))
  );
});
