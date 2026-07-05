/* Service Worker — Banca ENARE Farmácia (PWA)
   Estratégia:
   - HTML (navegação): network-first → cai para o cache quando offline.
     Assim, quando há internet, sempre pega a versão mais nova do banco de questões.
   - Estáticos (ícones/manifest): cache-first.
   Obs.: o progresso do usuário fica no localStorage, que NÃO é tocado por este cache. */

const CACHE = "enare-farma-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./simulados.js",
  "./banco_extra.js",
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
  "./farmacia/farmacovigilancia-ram.html"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
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

  // cache-first para estáticos
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
