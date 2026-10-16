"""Junta provas-reais/comentadas/*.json ao banco_edital.js, conferindo contra a extração (cand_*.json).
Uso: python3 docs/junta_reais.py [--grava]"""
import json,glob,re,sys,unicodedata,collections,shutil
TEMAS=set()
b=open("banco_edital.js",encoding="utf-8").read(); i0=b.index("["); i1=b.rindex("]")+1
banco=json.loads(b[i0:i1]); TEMAS={q["tema"] for q in banco}
def norm(s): return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower())
ext={}
for f in glob.glob("provas-reais/cand_*.json"):
    for c in json.load(open(f,encoding="utf-8")): ext[norm(c["q"])+"|"+"|".join(norm(a) for a in c["alts"])]=c
vistos={norm(q["q"])+"|"+"|".join(norm(a) for a in q["ops"]) for q in banco}
novas=[]; rej=collections.Counter(); porArq={}
for f in sorted(glob.glob("provas-reais/comentadas/*.json")):
    ok=0
    for q in json.load(open(f,encoding="utf-8")):
        k=norm(q.get("q",""))+"|"+"|".join(norm(a) for a in q.get("ops",[])); e=ext.get(k)
        if not e: rej["nao bate com a extracao"]+=1; continue
        if q.get("correct")!=e["gab"]: rej["gabarito alterado"]+=1; continue
        if [norm(x) for x in q.get("ops",[])]!=[norm(x) for x in e["alts"]]: rej["alternativas alteradas"]+=1; continue
        if q.get("tema") not in TEMAS: rej["tema fora da lista"]+=1; continue
        c=str(q.get("c","")).strip()
        if len(c)<120: rej["comentario curto"]+=1; continue
        pa=q.get("porAlt")
        if not(isinstance(pa,list) and len(pa)==len(e["alts"]) and str(pa[e["gab"]]).startswith("Correta")): rej["porAlt incoerente"]+=1; continue
        if k in vistos: rej["duplicada"]+=1; continue
        vistos.add(k)
        fo=dict(e.get("fonte") or {}); fo.pop("id",None)
        novas.append({"tema":q["tema"],"q":e["q"],"ops":e["alts"],"correct":e["gab"],"c":c,"porAlt":pa,"fonte":fo})
        ok+=1
    porArq[f.split("/")[-1]]=ok
for n,v in porArq.items(): print(f"  {n}: {v}")
print("ACEITAS",len(novas),"| rejeitadas",dict(rej))
print("por tema:",collections.Counter(q["tema"].split()[0] for q in novas).most_common())
print("gabarito:",dict(sorted(collections.Counter("ABCDE"[q["correct"]] for q in novas).items())))
if "--grava" in sys.argv and novas:
    banco+=novas
    js=b[:i0]+json.dumps(banco,ensure_ascii=False)+b[i1:]
    open("banco_edital.js","w",encoding="utf-8").write(js)
    print("gravado: banco",len(banco),"| com fonte",sum(1 for q in banco if q.get("fonte")))
