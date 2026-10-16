#!/usr/bin/env python3
"""Wrapper do extrai_prova.py do ClínicaMed com os ajustes dos cadernos cirúrgicos.
- LIXO extra (cabeçalho/rodapé ENARE 2025 em caixa alta, seção "Cirurgia Geral", glifo decorativo)
- hífen de fim de linha: nos cadernos FGV não há hifenização silábica -> mantém o hífen
- glifos SymbolMT (área privada) -> símbolo real
Uso: ext.py <id> <col.txt> <enare|usp> <hifen: mantem|silabico>"""
import sys, re, json, pathlib, importlib.util
spec = importlib.util.spec_from_file_location("ep", "/Users/matheusparente/Documents/Claude/cirurgiamed/docs/extrai_prova.py")
ep = importlib.util.module_from_spec(spec); spec.loader.exec_module(ep)
EXTRA = [r"^TIPO \d\s*[–-]\s*PÁGINA \d+$", r"^EXAME NACIONAL DE RESIDÊNCIA$", r"^Cirurgia Geral$",
         r"^Tipo \d\s*[–-].*Página \d+$", r"^Residência Médica$"]
# os padrões só-de-dígitos do original apagavam células de tabela e números soltos de linhas
# justificadas ("de / 6 / cm"); aqui não há número de página solto, então saem
ep.LIXO = [p for p in ep.LIXO if p.pattern not in (r"^\d{4}$", r"^\d{1,2}$", r"^\(?\d+\)?$")]
ep.LIXO += [re.compile(p) for p in EXTRA]
SYM = {"": "°", "": "≥", "": "≤", "": "±", "": "→", "": "×", "": "≈",
       "": "", "": "", " ": " ", "­": ""}
MODO = sys.argv[4] if len(sys.argv) > 4 else "mantem"
JUNCOES = []
def junta(linhas):
    txt = ""
    for s in linhas:
        if not txt:
            txt = s
        elif re.search(r"\w-$", txt):
            a = txt.split(" ")[-1]; b = s.split(" ")[0]
            JUNCOES.append(a + b)
            txt = txt + s if MODO == "mantem" else txt[:-1] + s
        else:
            txt += " " + s
    txt = re.sub(r"\s+", " ", txt).strip()
    txt = re.sub(r" ([,.;:?])", r"\1", txt)
    return txt
ep.junta = junta
ident, arq, estilo = sys.argv[1:4]
t = pathlib.Path(arq).read_text(encoding="utf-8")
for k, v in SYM.items(): t = t.replace(k, v)
resto = set(re.findall(r"[-�]", t))
if resto: print("GLIFOS NÃO MAPEADOS:", [hex(ord(c)) for c in resto])
p = pathlib.Path(arq + ".norm"); p.write_text(t, encoding="utf-8")
sys.argv = ["x", ident, str(p), estilo]
ep.main()
pathlib.Path(f"parsed/{ident}.juncoes.json").write_text(json.dumps(sorted(set(JUNCOES)), ensure_ascii=False))
