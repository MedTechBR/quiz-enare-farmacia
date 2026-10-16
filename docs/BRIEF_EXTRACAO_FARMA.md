# Brief — provas reais de FARMÁCIA para a Banca ENARE Farmácia (15/10/2026)

App: `~/Documents/Claude/quiz-enare-farmacia/` (PWA de estudo para residência em Farmácia).
Método de referência (SÓ LEITURA, não edite nada lá): `~/Documents/Claude/fisiare/docs/BRIEF_EXTRACAO.md`,
`~/Documents/Claude/fisiare/docs/LEVANTAMENTO_FISIO_2026-10.md` (URLs oficiais do ENARE, EBSERH, residências),
`~/Documents/Claude/enfermare/docs/PROVAS_REAIS.md` e `~/Documents/Claude/enfermare/provas-reais/relatorios/`.
Scripts copiados para cá: `docs/gabgeo.py` (gabarito FGV pela geometria, PyMuPDF), `docs/ext.py`, `docs/colunas2.py`,
`docs/confere.py`. PyMuPDF (`import fitz`) e `pdftotext` existem.

## Onde gravar (só aqui)
- PDFs baixados: `provas-reais/<nome>.pdf` (pasta fora do git). Texto: `provas-reais/txt/`.
- Saída: `provas-reais/cand_<sufixo>.json`, lista de `{"id","q","alts","gab","fonte"}`:
  - `id` `<prova>-<NN>` (ex. `en26-far-37`); `q` enunciado VERBATIM (linhas juntadas, hifenização desfeita);
  - `alts` alternativas verbatim SEM a letra na frente (5 ou 4, como no caderno);
  - `gab` índice 0-based do gabarito OFICIAL DEFINITIVO (ou retificado) do MESMO tipo de caderno;
  - `fonte` `{"banca":"FGV","instituicao":"ENARE 2026/2027","ano":<ano da APLICAÇÃO>,"n":<nº no caderno>,
     "parte":"gerais"|"especificas"|"sus","url":"<URL oficial do caderno>","url_gab":"<URL do gabarito>"}`.
- Relatório: `provas-reais/relatorios/extracao_<sufixo>.md` (por prova: URLs, extraídas, descartadas e motivo,
  armadilhas do servidor/caderno). Catalogue TODA URL usada no relatório: a pasta de rascunho some.

## Regras
- Só fonte OFICIAL (site da banca/órgão/instituição). Nada de cursinho, blog, Scribd, PCI, Qconcursos.
- Use só o Tipo 1 quando houver vários tipos (os outros repetem as mesmas questões em outra ordem).
- DESCARTE e registre: anulada; depende de figura/gráfico que não vira texto; texto irrecuperável; gabarito só preliminar.
- Gabarito lido pela POSIÇÃO (geometria) e conferido por um segundo método. Sinal de parser quebrado:
  distribuição absurda de letras ou divergência entre métodos.
- Conferência por script antes de terminar: numeração contínua, nº de alternativas certo, nenhuma vazia/repetida,
  nenhum "(A)" sobrando, nenhum rodapé/cabeçalho ("ENARE", "Tipo 1", "Página", nome do cargo) colado no texto.
  Abra 5 questões ao acaso e compare com o PDF.
- Não apague linhas que são só número (doses, tabelas). Não edite nada fora das suas saídas. Não comente nem
  classifique questões (isso é outra etapa). Teto: 25 buscas web + o que precisar de curl direto nos servidores oficiais.
- Resposta final curta: por prova, extraídas/descartadas, e dúvidas de gabarito ou texto.
