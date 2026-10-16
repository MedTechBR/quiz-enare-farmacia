# AprovaFarma (ex-Banca ENARE Farmácia)

PWA de estudo para a residência multiprofissional em Farmácia (ENARE). No ar em
medtechbr.com.br/quiz-enare-farmacia/. Deploy: git push (GitHub Pages). A cada deploy, subir `CACHE` no `sw.js`.

## Nome (15/10/2026)
- Nome visível = AprovaFarma (título, manifest, marca, `NOME` do conta-enare, MTErrata/MTSinal). Ids internos MANTIDOS:
  pasta/URL `quiz-enare-farmacia`, app de sync `enare-farmacia`, produto `enarefarmacia`, chaves `enare*` do localStorage.

## Conta e venda (10/10/2026)
- Vendido no MedTech (linha "provas", R$ 49,90/mês ou R$ 397/ano; produto `enarefarmacia` no `planos.json` do site).
  O app só abre com conta MedTech; paywall e CPF vêm de `/_mtacesso.js?v=8` (`MTAcesso.verificar`).
- `mtsync.js` = cópia fiel de `~/Documents/Claude/_mtsync/` (não editar aqui). Adaptador: `conta-enare.js`.
  Nuvem: `users/{uid}/apps/enare-farmacia/sync/<coleção>~<id>`, um documento por item.
- Coleções: `resp`, `riscos`, `sinal`, `ocultos`, `plano`, `sim` (uma chave `enareSim_<id>` por item), `planilha`
  (célula por célula), `fcards` (cartão por cartão), `treino` (fase por fase) = mapa por item; `ativ` = soma;
  `meta` = doc. Fora: `enareFarmaPos_v1`, `enareTab`, `enareBkp*` e as chaves do motor (`enare_mts`, `enare_mts_uid`).
- Mudanças são vistas por setItem embrulhado, evento `storage` (iframes) e varredura a cada 4 s. Planilha,
  flashcards e treino se atualizam pelo evento `storage` quando chega dado de outro aparelho.
- REGRA DO DONO: progresso local nunca é apagado. Reserva imutável no IndexedDB `enare-reserva`
  (`antes-da-conta`, gravada antes do primeiro login). Sair e troca de conta NÃO limpam o aparelho, só gravam
  `saida-<uid>-<momento>` na reserva; por isso outra conta que entrar no mesmo aparelho recebe esse progresso.
  Chave com JSON ilegível fica fora da sincronização. Coleção que esvazia de uma vez (3+ itens para 0) não
  sobe lápide, a menos que venha dos botões de zerar do app (`window.__enareZerou`).
- Backup por arquivo saiu da interface; o cartão Conta fica no fim do Painel.
- Teste: cópia fora do repo com `fake-firebase.js` (nunca publicar), servida com `node srv.mjs <pasta> <porta>`.

## Erratas da administração (10/10/2026)
- `mterrata.js` = cópia fiel de `~/Documents/Claude/_mterrata/` (não editar aqui); id no servidor `quiz-enare-farmacia`.
  Chave = `CHAVES[i]` (hash do enunciado ORIGINAL; nos simulados de prova, `q._ch`). Campos `q`, `ops`, `c` vão
  escapados (`MTErrata.paraHtml`), `correct` é o gabarito. Tirada do ar some só da exibição (`passaFiltro`,
  contagens, painel, simulados por `visiveis(sim)`); o BANK e as respostas por posição dos simulados não mudam.
- Simulados diários: a troca de lugar da correta usa o gabarito ORIGINAL, então a tela não muda quando a errata
  troca o gabarito; a nota é recalculada na exibição.

## Treino, Exames e Log de erros (15/10/2026)
- Treino: 5 vidas por DIA. `diaVidas` guarda o dia da contagem; data nova = 5 vidas (`renovaVidas`). Zerar NÃO
  devolve vidas. `parada` = {f:"u-l", i, acertos, erros}: gravada a cada exercício e ao sair; ao reabrir a fase
  retoma em `i` (o exercício errado volta primeiro). Fase sem erro continua devolvendo as vidas na hora.
  Ambos sincronizam sozinhos como "#diaVidas"/"#parada" na coleção `treino`.
- Exames: `exames/flashcards-lab.html` reescrito (tema claro, Consultar com busca e filtros por grupo, Treinar com
  cartão que vira + Lembrei/Não lembrei). DATA (119 cartões) idêntica à anterior. Marcações em `enareExames_v1`
  = {"<cat>~<nome>": {s:1|0, t}}, coleção `exames` (mapa) na conta. Id combina categoria e nome porque ácido
  valproico e tetraciclinas aparecem em duas categorias.
- Log de erros saiu da navegação. `planilha/` e a coleção `planilha` CONTINUAM (dado do usuário não se apaga).
- Data da prova = do USUÁRIO (`enareFarmaMeta_v1.data`, sincroniza). `dataProva()`/`gravaDataProva()`; cartão
  "Quando é a sua prova?" (`[data-dataprova]`) em Simulados e Revisão final. Cronograma: D42 = dia da prova
  (datas calculadas em `aplicaDatas`); simulados diários: o 13º cai 2 dias antes (`datasDiarios`). Sem data:
  "Simulado NN"/"Dia N" e nada atrasado. Evento `enare:dataprova` redesenha tudo.
- Refazer erradas: `refazer` = rodada com as erradas do momento (lista fixa até sair). Responder grava por cima
  em `answers[ck]` com `refeita:n`; acertou = sai dos erros. Botão `#fErradas` em Questões e `#pnRefazer` no Painel.
- Treino no tema vivo (CSS no fim do <style>, sprite próprio, sem emoji; ★ das notas ficou).

## Provas reais (15/10/2026)
- Cadernos e gabaritos OFICIAIS em `provas-reais/` (fora do git): ENARE Farmácia 2024/25, 2025/26, 2026/27 (Tipo 1;
  gerais q1–20 = as do Enfermare/Fisiare) e EBSERH Farmacêutico 2023 (IBFC, cód. 160) e 2024 (FGV, Grupo 5).
  URLs e armadilhas em `provas-reais/relatorios/extracao_*.md`. Briefs: `docs/BRIEF_EXTRACAO_FARMA.md` (extração) e
  `docs/BRIEF_COMENTARIO_FARMA.md` (tema + `c` + `porAlt`); junção conferida contra a extração por `docs/junta_reais.py`.
- Residências (15/10): HCPA 2021–2025 e UFCSPA (FUNDMED, 4 alternativas), UFPA 2022–2025 (CEPS), SES-PE 2022–2026
  (IAUPE/UPENET, 4 perfis; Hospitalar 2025 por OCR conferido). `fonte.instituicao` = selo curto ("SES-PE 2026 ·
  Hospitalar"), nome completo em `fonte.prova`; `ano` = ano de APLICAÇÃO. HCFMUSP, UNICAMP e UERJ não têm caderno de Farmácia.
  `docs/junta_reais.py` casa por enunciado+alternativas inteiros (duas questões diferentes começam igual).
- Descartes por gabarito que ensinaria errado ficam em `provas-reais/comentadas/*.descartes.md` (ex.: EBSERH 2024 q21,
  descartada também no Enfermare/Fisiare).
