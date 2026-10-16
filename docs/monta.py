import json, re, sys, collections
S = "/private/tmp/claude-501/-Users-matheusparente/bb6ce523-865e-4d81-9c8d-cd1fea0d6a74/scratchpad/"
OUT = "/Users/matheusparente/Documents/Claude/cirurgiamed/provas-reais/cand_cir.json"
sys.path.insert(0, S)
import gabgeo, gabusp
PR = "/Users/matheusparente/Documents/Claude/cirurgiamed/provas-reais/"
L = "ABCDE"
log = collections.defaultdict(list)   # descartes por prova
FIXES = []

def unidades(t):
    t0 = t
    t = re.sub(r"(?<=[/\s\d(])(mm|cm|m|km)2(?![\w])", r"\1²", t)
    t = re.sub(r"(?<=[/\s\d(])(mm|cm|m)3(?![\w])", r"\1³", t)
    return t
def fix_cm(t):
    t = re.sub(r"(\d) ?oC\b", r"\1 °C", t)
    t = re.sub(r"(\d)\.o\b", r"\1.º", t)
    for a, b in [("pósoperatório", "pós-operatório"), ("“dedo-deluva”", "“dedo-de-luva”"),
                 ("propedêuticoterapêutica", "propedêutico-terapêutica"), ("ânterosuperior", "ântero-superior"),
                 ("préhospitalar", "pré-hospitalar"), ("Encontrase", "Encontra-se"), ("PósOperatória", "Pós-Operatória"),
                 ("Frequência respiratória 22 irpm 36,5 °C Temperatura axilar", "Frequência respiratória 22 irpm Temperatura axilar 36,5 °C"),
                 ("Bastonetes 7% 0 a 5% 25 leucócitos/ Urina -campo Hemácias 8 hemácias/campo -Beta-hCG sérico negativo -Considerando",
                  "Bastonetes 7% 0 a 5% Urina 25 leucócitos/campo -- Hemácias 8 hemácias/campo -- Beta-hCG sérico negativo -- Considerando")]:
        t = t.replace(a, b)
    return t
def limpa_q(t):
    return t.replace("[[IMAGEM]]", "").strip()

out = []
def add(id_, q, alts, gab, fonte, fx=None):
    q2 = unidades(q); a2 = [unidades(a) for a in alts]
    if fx: q2 = fx(q2); a2 = [fx(a) for a in a2]
    if q2 != q or a2 != alts: FIXES.append(id_)
    out.append({"id": id_, "q": q2, "alts": a2, "gab": gab, "fonte": fonte})

# ---------- ENARE
def enare(parsed, pdf, cab, pref, fonte, prova):
    P = json.load(open(S + "parsed/" + parsed + ".json"))
    reg = [v for (i, t), v in gabgeo.regioes(PR + pdf, cab).items()]
    assert len(reg) == 1, cab
    g = gabgeo.pares(reg[0]); assert len(g) == 80
    for x in P:
        n = x["n"]; let = g[n]
        if let not in L: log[prova].append((n, "anulada no gabarito definitivo")); continue
        if len(x["alts"]) != 5: log[prova].append((n, "alternativas não separadas")); continue
        add(f"{pref}-{n:02d}", x["q"], x["alts"], L.index(let), fonte)
    return g
g25 = enare("en25_cad", "en25_gab_pr.pdf", r"Pré-requisito - Cirurgia do Aparelho Digestivo - 1 - Turno Tarde", "en25-cg",
      {"banca": "ENARE (EBSERH/FGV)", "ano": 2025, "prova": "Pré-requisito em Cirurgia Geral 2025/2026"}, "ENARE 2025/2026")
g24 = enare("en24_cad", "en24_gabarito.pdf", r"^Pré-Requisito - Cirurgia do Aparelho Digestivo - TIPO 1$", "en24-cg",
      {"banca": "ENARE (EBSERH/FGV)", "ano": 2024, "prova": "Pré-requisito em Cirurgia Geral 2024/2025"}, "ENARE 2024/2025")

# ---------- USP
def usp(parsed, gabpdf, pref, fonte, prova):
    P = json.load(open(S + "parsed/" + parsed + ".json"))
    g, info = gabusp.le(PR + gabpdf, 0)
    assert len(g) == 120 and "?" not in g.values()
    for x in P:
        n = x["n"]; let = g[n]
        tag = "cir" if n <= 100 else "cad"
        t = x["q"] + " " + " ".join(x["alts"])
        if let not in "ABCD": log[prova].append((n, "anulada no gabarito definitivo")); continue
        if "[[IMAGEM]]" in t: log[prova].append((n, "depende de figura (imagem no caderno)")); continue
        if len(x["alts"]) != 4: log[prova].append((n, "alternativas não separadas")); continue
        add(f"{pref}-{tag}-{n:03d}" if n > 100 else f"{pref}-{tag}-{n:02d}", x["q"], x["alts"], "ABCD".index(let), fonte)
    return g, info
gu25, i25 = usp("usp25", "2024-12-01_rm2025_gabarito-especialidadescirurgicas_retificacao.pdf", "usp25",
    {"banca": "USP (FUVEST)", "ano": 2024, "prova": "Especialidades Cirúrgicas 2025"}, "USP 2025")
gu26, i26 = usp("usp26", "rm2026-gabarito-EC-especialidades-cirurgicas-retificado.pdf", "usp26",
    {"banca": "USP (FUVEST)", "ano": 2025, "prova": "Especialidades Cirúrgicas 2026"}, "USP 2026")

# ---------- ClínicaMed descartadas
C = {c["id"]: c for c in json.load(open("/Users/matheusparente/Documents/Claude/clinicamed/provas-reais/candidatas.json"))}
ids = json.load(open(S + "cm_ids.json"))
def fonte_cm(f):
    b = f["banca"]
    m = re.match(r"Revalida (\d{4}\.\d) \(INEP/MEC\)", b)
    if m: return {"banca": "Revalida (INEP/MEC)", "ano": f["ano"], "prova": "Revalida " + m.group(1)}
    if b == "Revalida (INEP/MEC)": return {"banca": b, "ano": f["ano"], "prova": f"Revalida {f['ano']}"}
    raise ValueError(b)
for i in ids:
    c = C[i]
    pv, n = i.split("#")
    add("cm-" + i.replace("#", "-"), c["q"], c["alts"], c["gab"], fonte_cm(c["fonte"]), fix_cm)

json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)
cont = collections.Counter(re.sub(r"-\d+$", "", x["id"]) if not x["id"].startswith("cm-") else "cm-" + x["id"].split("-")[1] for x in out)
print(len(out), dict(cont))
for k, v in log.items(): print(k, v)
print("retificações USP25:", i25, " USP26:", i26)
print("com correção de artefato:", len(FIXES), FIXES)
json.dump({k: v for k, v in log.items()}, open(S + "descartes.json", "w"), ensure_ascii=False)
