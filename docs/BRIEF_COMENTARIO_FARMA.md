# Brief — comentar e classificar questões de PROVA REAL (Banca ENARE Farmácia, 15/10/2026)

Você recebe um lote `provas-reais/lotes/<nome>.json` com questões extraídas VERBATIM de cadernos OFICIAIS de
Farmácia (ENARE/FGV, EBSERH, residências multiprofissionais). `gab` (índice 0-based) é o gabarito OFICIAL
DEFINITIVO, já conferido contra o PDF. O app é de estudo para residência e concursos de FARMÁCIA.

## 1. Triagem
Quase tudo entra. DESCARTE (registre o motivo) só se: o gabarito oficial contraria norma/diretriz VIGENTE hoje
(out/2026) de um jeito que ensinaria errado (diga qual norma mudou); texto truncado ou dependente de figura;
mais de uma resposta defensável. Questão que cita norma antiga mas cujo gabarito segue certo: MANTENHA e
explique a norma nova no comentário. Na dúvida sobre o gabarito, MANTENHA (é o oficial) e explique.

## 2. Campos de saída (objeto por questão incluída)
- `q`, `ops`: COPIE EXATAMENTE de `q` e `alts` (única exceção: artefato evidente de extração). `correct`: = `gab`, NUNCA altere.
- `tema`: um destes nomes EXATOS (o mais próximo do conteúdo):
  1.1 História das políticas de saúde | 1.2 SUS: Leis 8.080/8.142 e Decreto 7.508 | 1.3 Redes de Atenção à Saúde |
  1.4 Grupos vulnerabilizados | 1.5 ESF / PNAB | 1.6 Educação Permanente (PNEPS) | 1.7 Política Nacional de Humanização |
  1.8 Vigilância em Saúde | 1.9 Bioética | 1.10 Segurança do Paciente (PNSP) | 1.11 Trabalho em equipe multidisciplinar |
  1.12 NR 32 | 6.1 Assistência farmacêutica no SUS | 6.2 Centro de Informação sobre Medicamentos |
  6.3 Código de Ética Farmacêutica | 6.4 Infecção hospitalar e antimicrobianos | 6.5 Índice terapêutico estreito (TDM) |
  6.6 Erros de medicação | 6.7 Farmácia clínica × Atenção farmacêutica | 6.8 Farmacovigilância |
  6.9 Estudos de Utilização de Medicamentos | 6.10 Gestão e logística de medicamentos | 6.11 Interações medicamentosas |
  6.12 Orientação farmacêutica e adesão | 6.13 Farmacoepidemiologia | 6.14 Processo de cuidado ao paciente |
  6.15 Segurança na prescrição e administração | 6.16 Resoluções CFF 585 e 586 | 6.17 Seguimento: paciente idoso |
  6.18 Seguimento: cardiologia | 6.19 Seguimento: pediatria e gestante | 6.20 Oncologia e terapia nutricional |
  6.21 Tecnovigilância | 6.22 Habilidades: exames, cálculos e leitura crítica | 6.23 Atitudes profissionais
  (Farmacologia geral, farmacotécnica, controle de qualidade, Portaria 344 e dispensação → o tema 6.x mais próximo:
  dispensação/armazenamento/344 → 6.10; farmacocinética/interações → 6.11; cálculos/exames/estatística de artigo → 6.22.)
- `c`: comentário de 150 a 800 caracteres, tom de manual, frases diretas, sem travessão: POR QUE a oficial está
  certa, o critério/número/artigo decisivo e a fonte com NÚMERO e ANO vigente (ex.: "Resolução CNS 338/2004",
  "Portaria SVS/MS 344/1998", "RDC 67/2007"). Não invente número nem ano; em dúvida, confira (até 6 buscas web).
- `porAlt`: uma frase por alternativa, na MESMA ordem, cada uma com mais de 20 caracteres. A da correta começa
  com "Correta: "; as outras dizem por que estão erradas.
- `fonte`: copie o objeto recebido (sem `id`).
- Se a questão traz `_enf` (comentário já escrito e revisado no app de Enfermagem para a MESMA questão): use
  `_enf.coment` como `c` e `_enf.porAlt` como `porAlt`, ajustando só o que for específico de enfermagem. Não copie `_enf` para a saída.

## 3. Saída (só estes arquivos)
- `provas-reais/comentadas/<nome>.json`: lista dos objetos incluídos.
- `provas-reais/comentadas/<nome>.descartes.md`: id e motivo de cada descarte.
Confira por script antes de terminar: q/ops idênticos à entrada, correct = gab, tema na lista, porAlt com o
mesmo número de alternativas, "Correta: " na posição certa. Resposta final curta: incluídas, descartadas, dúvidas.
