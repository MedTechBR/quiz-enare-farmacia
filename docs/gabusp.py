"""Gabarito USP por geometria: linhas por Y; em cada linha, número seguido das letras até o próximo
número. Célula com duas letras (retificação) -> a letra RISCADA (traço vermelho por cima) sai, fica a
outra. '*' = anulada."""
import fitz, re, sys, json
def le(pdf, pagina):
    p = fitz.open(pdf)[pagina]
    riscos = [dr["rect"] for dr in p.get_drawings() if dr.get("color") and dr["color"][0] > 0.6 and dr["color"][1] < 0.4]
    linhas = {}
    for w in p.get_text("words"):
        linhas.setdefault(round((w[1] + w[3]) / 2 / 3), []).append(w)
    g, info = {}, {}
    for y, ws in linhas.items():
        ws.sort(key=lambda w: w[0])
        i = 0
        while i < len(ws):
            if re.fullmatch(r"\d{1,3}", ws[i][4]):
                n = int(ws[i][4]); j = i + 1; cel = []
                while j < len(ws) and not re.fullmatch(r"\d{1,3}", ws[j][4]):
                    cel.append(ws[j]); j += 1
                letras = [(c, w) for w in cel for c in w[4]] if cel else []
                if letras and all(c in "ABCDE*" for c, _ in letras) and n <= 120:
                    if len(letras) == 1:
                        g[n] = letras[0][0]
                    else:
                        # posição de cada letra dentro da palavra
                        vivas = []
                        for w in cel:
                            k = len(w[4]); larg = (w[2] - w[0]) / k
                            for t, c in enumerate(w[4]):
                                r = fitz.Rect(w[0] + t * larg, w[1], w[0] + (t + 1) * larg, w[3])
                                if not any(r.intersects(x) for x in riscos):
                                    vivas.append(c)
                        info[n] = ("".join(c for c, _ in letras), "".join(vivas))
                        g[n] = vivas[0] if len(vivas) == 1 else "?"
                i = j
            else:
                i += 1
    return g, info
if __name__ == "__main__":
    pdf = sys.argv[1]
    for pg in range(len(fitz.open(pdf))):
        g, info = le(pdf, pg)
        print(pg, len(g), "".join(g.get(i, "?") for i in range(1, 121)), info)
