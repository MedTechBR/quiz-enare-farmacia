# Banca ENARE Farmácia

PWA de estudo para a residência multiprofissional em Farmácia (ENARE). No ar em
medtechbr.com.br/quiz-enare-farmacia/. Deploy: git push (GitHub Pages). A cada deploy, subir `CACHE` no `sw.js`.

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
