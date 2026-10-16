import json, re, unicodedata, collections
def norm(t):
    t = t.replace("", "o").replace("°", "o").replace("º", "o")
    t = re.sub(r"[-]", "", t)
    t = unicodedata.normalize("NFKD", t).replace("²", "2").replace("³", "3")
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", t.lower())
D = json.load(open("/Users/matheusparente/Documents/Claude/cirurgiamed/provas-reais/cand_cir.json"))
RAW = {}
def raw(k):
    if k not in RAW: RAW[k] = norm(open(f"raw_{k}.txt", encoding="utf-8", errors="replace").read())
    return RAW[k]
prob = collections.Counter(); tot = collections.Counter()
for x in D:
    i = x["id"]
    k = i.split("-")[0] if not i.startswith("cm-") else i.split("-")[1]
    k = {"en25": "en25", "en24": "en24", "usp25": "usp25", "usp26": "usp26"}.get(k, k)
    R = raw(k); tot[k] += 1
    p = []
    for j, a in enumerate(x["alts"]):
        if norm(a) not in R: p.append(f"alt {'ABCDE'[j]} ausente")
        elif norm("ABCDE"[j] + " " + a) not in R and not k.startswith("rev"): p.append(f"alt {'ABCDE'[j]} fora de ordem/letra")
    w = x["q"].split()
    for s in range(0, len(w), 6):
        ch = norm(" ".join(w[s:s + 6]))
        if len(ch) > 8 and ch not in R:
            p.append("trecho ausente: " + " ".join(w[s:s + 6])); 
    if p:
        prob[k] += 1
        print(i, p[:4])
print({k: (tot[k], prob[k]) for k in tot})
