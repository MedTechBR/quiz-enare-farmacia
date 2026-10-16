"""Gabarito por geometria: palavras do PyMuPDF agrupadas por Y; linha de números seguida de linha de
letras; número <-> letra pelo centro X mais próximo. Região do programa = do cabeçalho até o próximo
cabeçalho (ou fim da página)."""
import fitz, re, sys, json
def regioes(pdf, padrao_cab):
    d = fitz.open(pdf); out = {}
    for i, pg in enumerate(d):
        ws = pg.get_text("words")
        linhas = {}
        for w in ws: linhas.setdefault(round(w[1]), []).append(w)
        ys = sorted(linhas)
        cabs = [(y, " ".join(w[4] for w in sorted(linhas[y], key=lambda w: w[0]))) for y in ys]
        cabs = [(y, t) for y, t in cabs if re.search(padrao_cab, t)]
        for k, (y, t) in enumerate(cabs):
            y2 = cabs[k + 1][0] if k + 1 < len(cabs) else 1e9
            rows = [sorted(linhas[yy], key=lambda w: w[0]) for yy in ys if y < yy < y2]
            out[(i, t)] = rows
    return out
def pares(rows):
    g = {}
    for a, b in zip(rows, rows[1:]):
        if all(re.fullmatch(r"\d{1,3}", w[4]) for w in a) and not any(re.fullmatch(r"\d{1,3}", w[4]) for w in b):
            for w in a:
                cx = (w[0] + w[2]) / 2
                m = min(b, key=lambda v: abs((v[0] + v[2]) / 2 - cx))
                assert abs((m[0] + m[2]) / 2 - cx) < 8, (w, m)
                g[int(w[4])] = m[4]
    return g
if __name__ == "__main__":
    pdf, pad = sys.argv[1:3]
    for (i, t), rows in regioes(pdf, pad).items():
        g = pares(rows)
        print(i, t, len(g), "".join(g.get(n, "?") for n in range(1, 81)))
