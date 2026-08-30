import json,re,random,collections,unicodedata,datetime,os
REPO="/Users/matheusparente/Documents/Claude/quiz-enare-farmacia"
random.seed(20260913)                      # determinístico: regerar dá o mesmo resultado
LET="ABCDE"

s=open(REPO+"/banco_edital.js",encoding="utf-8").read()
banco=json.loads(s[s.index("["):s.rindex("]")+1])
inc=json.load(open(REPO+"/incidencia.js".replace("incidencia.js","incidencia.js"),encoding="utf-8").read().split("=",1)[1].rsplit(";",2)[0].strip().split("\nwindow")[0].join(["",""]) or "{}") if False else None
# lê a incidência do próprio incidencia.js
ic=open(REPO+"/incidencia.js",encoding="utf-8").read()
INC=json.loads(ic[ic.index("{"):ic.index("}")+1])

# ---- datas: 30/08 a 11/09/2026 ----
d0=datetime.date(2026,8,30); d1=datetime.date(2026,9,11)
dias=[d0+datetime.timedelta(days=i) for i in range((d1-d0).days+1)]
SEM=["seg","ter","qua","qui","sex","sáb","dom"]
print(f"{len(dias)} simulados: {dias[0].strftime('%d/%m')} a {dias[-1].strftime('%d/%m')}")

# ---- chave estável da questão: MESMO algoritmo do index.html ----
def chaveQ(q):
    t=unicodedata.normalize("NFD", str(q.get("q","")))
    t="".join(c for c in t if not unicodedata.combining(c)).lower()
    t=re.sub(r'[^a-z0-9]','',t)
    h1, h2 = 5381, 0x811c9dc5
    for ch in t:
        c=ord(ch)
        h1=((h1<<5)+h1+c) & 0xFFFFFFFF
        h2=((h2 ^ c) * 0x01000193) & 0xFFFFFFFF
    def b36(n):
        if n==0: return "0"
        d="0123456789abcdefghijklmnopqrstuvwxyz"; o=""
        while n: o=d[n%36]+o; n//=36
        return o
    return (b36(h1)+b36(h2))[:10]

# ---- pools por tema ----
cod=lambda t:(re.match(r'^(\d+\.\d+)',t) or [None,""])[1] if re.match(r'^(\d+\.\d+)',t) else ""
pool=collections.defaultdict(list)
for i,q in enumerate(banco): pool[cod(q["tema"])].append(i)
for k in pool: random.shuffle(pool[k])

# ---- quantas questões por tema, proporcional à incidência real ----
N_BAS, N_FAR = 20, 80                      # formato da prova: 20 básicos + 80 farmácia
def cota(prefixo, total):
    temas={k:v for k,v in INC.items() if k.startswith(prefixo)}
    som=sum(temas.values())
    bruto={k:(v/som)*total for k,v in temas.items()}
    q={k:int(v) for k,v in bruto.items()}
    resto=sorted(temas, key=lambda k:bruto[k]-q[k], reverse=True)
    i=0
    while sum(q.values())<total: q[resto[i%len(resto)]]+=1; i+=1
    return q
cota_bas, cota_far = cota("1.",N_BAS), cota("6.",N_FAR)
print("cota item 1:",{k:v for k,v in sorted(cota_bas.items()) if v})
print("cota item 6:",{k:v for k,v in sorted(cota_far.items()) if v})

# ---- comentário que cita letra de alternativa NÃO pode ter as opções embaralhadas ----
VERD=re.compile(r'^\s*(?:<b>\s*)?(?:Corret[ao]|Gabarito|Resposta|Alternativa\s+correta|Letra)\s*[:\-—]?\s*(?:</b>\s*)?([A-E])\b', re.I)
CITA=re.compile(r'\b(?:alternativa|letra|op[çc][ãa]o|item)\s+([A-E])\b', re.I)
def pode_embaralhar(c):
    corpo=VERD.sub("", c or "", count=1)     # o veredito inicial a gente reescreve
    return not CITA.search(corpo)

def reposiciona(q, alvo):
    """Move a correta para a posição `alvo`, ajustando o veredito do comentário."""
    ops=list(q["ops"]); ci=q["correct"]
    if alvo>=len(ops) or alvo==ci: return q, ci
    ops[ci],ops[alvo]=ops[alvo],ops[ci]
    c=q["c"]
    m=VERD.match(c or "")
    if m: c=c[:m.start(1)]+LET[alvo]+c[m.end(1):]
    novo=dict(q); novo["ops"]=ops; novo["correct"]=alvo; novo["c"]=c
    return novo, alvo

usadas=set(); sims=[]
for n,dia in enumerate(dias,1):
    escolhidas=[]
    for cotas in (cota_bas, cota_far):
        for tema,qtd in cotas.items():
            disp=[i for i in pool.get(tema,[]) if i not in usadas]
            pega=disp[:qtd]
            if len(pega)<qtd:                       # tema esgotado: completa no mesmo item
                pref=tema.split(".")[0]+"."
                extra=[i for k,v in pool.items() if k.startswith(pref) for i in v if i not in usadas and i not in pega]
                random.shuffle(extra); pega+=extra[:qtd-len(pega)]
            usadas.update(pega); escolhidas+=pega
    random.shuffle(escolhidas)
    # ---- equilibra a posição do gabarito ----
    # Duas restrições reais: (1) questão de 4 alternativas nunca pode cair em E;
    # (2) questão cujo comentário cita letra fica travada na posição original.
    # Então distribuo os alvos COMPENSANDO o que já está fixo, em vez de sortear cego.
    livres5=[]; livres4=[]; fixas=[]
    for k,idx in enumerate(escolhidas):
        q=banco[idx]
        if pode_embaralhar(q.get("c","")):
            (livres5 if len(q["ops"])==5 else livres4).append(k)
        else: fixas.append(k)
    alvo={}
    conta=collections.Counter(banco[escolhidas[k]]["correct"] for k in fixas)   # já ocupadas
    # meta com variação natural (~20 ± 3): uniforme demais deixaria deduzir as
    # últimas respostas só contando as anteriores.
    nq_tot=len(escolhidas); base=nq_tot//5
    meta=[base+random.randint(-3,3) for _ in range(5)]
    while sum(meta)!=nq_tot:
        j=random.randrange(5)
        meta[j]+= 1 if sum(meta)<nq_tot else -1
    meta=[max(0,m) for m in meta]
    # E primeiro: só as de 5 alternativas conseguem
    random.shuffle(livres5); random.shuffle(livres4)
    falta_E=max(0, meta[4]-conta[4])
    for k in livres5[:falta_E]: alvo[k]=4
    resto5=livres5[falta_E:]
    # o que sobrou (5 e 4 ops) preenche A-D pelo maior déficit
    pend=resto5+livres4; random.shuffle(pend)
    for k in pend:
        deficit=[(meta[j]-conta[j], j) for j in range(4)]
        deficit.sort(reverse=True)
        j=deficit[0][1]
        alvo[k]=j; conta[j]+=1
    for k in livres5[:falta_E]: conta[4]+=1
    qs=[]; travadas=len(fixas)
    for k,idx in enumerate(escolhidas):
        q=banco[idx]
        if k in alvo:
            nq,_=reposiciona(q, alvo[k])
        else:
            nq=dict(q)
        qs.append({"k":chaveQ(q), "a":(alvo[k] if k in alvo else None), "_c":nq["correct"]})
    dist=collections.Counter(LET[x["_c"]] for x in qs)
    sims.append({"id":f"diario{n:02d}","data":dia.isoformat(),
                 "title":f"Simulado {n:02d} · {dia.strftime('%d/%m')} ({SEM[dia.weekday()]})",
                 "sub":f"100 questões no formato da prova — 20 de Conhecimentos Básicos + 80 de Farmácia",
                 "questions":qs})
    print(f"  {n:02d} {dia.strftime('%d/%m')}: {len(qs)}q | gabarito {dict(sorted(dist.items()))} | sem embaralhar: {travadas}")

print("\nquestoes usadas:",len(usadas),"de",len(banco))
tot=collections.Counter()
for sm in sims: tot.update(LET[q["_c"]] for q in sm["questions"])
print("distribuicao GERAL do gabarito:",dict(sorted(tot.items())),"| esperado ~%d cada"%(sum(tot.values())//5))

for sm in sims:
    for q in sm["questions"]: q.pop("_c",None)

js=("/* Simulados DIÁRIOS até a prova (13/09/2026) — um por dia, de 30/08 a 11/09.\n"
    "   Montados a partir do banco, com a mesma proporção por tema das provas reais\n"
    "   (ver incidencia.js). Nenhuma questão se repete entre os simulados.\n"
    "   A posição do gabarito é equilibrada (~20% em cada letra); questões cujo\n"
    "   comentário cita letra de alternativa NÃO têm as opções reposicionadas. */\n"
    "window.SIMULADOS_DIARIOS = "+json.dumps(sims,ensure_ascii=False)+";\n")
open(REPO+"/simulados_diarios.js","w",encoding="utf-8").write(js)
print("\nsimulados_diarios.js:",len(js),"bytes")
