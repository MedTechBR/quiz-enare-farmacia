#!/usr/bin/env python3
"""Variante do colunas_pdf.py para páginas que MISTURAM uma e duas colunas (USP):
lê a página em faixas verticais; cada linha de largura cheia fecha a faixa (esquerda inteira,
direita inteira, depois a linha cheia). Imagens viram a marca [[IMAGEM]] na posição em que aparecem."""
import sys, fitz
doc = fitz.open(sys.argv[1])
for pg in doc:
    w = pg.rect.width; h = pg.rect.height; mid = w / 2
    itens = []
    for im in pg.get_image_info():
        x0, y0, x1, y1 = im["bbox"]
        if (x1 - x0) > 40 and (y1 - y0) > 40 and y0 > 60:
            lado = "cheia" if x1 - x0 > w * 0.62 else ("esq" if x0 < mid - 5 else "dir")
            itens.append((lado, round(y0, 1), x0, "[[IMAGEM]]"))
    d = pg.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE | fitz.TEXT_PRESERVE_LIGATURES | fitz.TEXT_MEDIABOX_CLIP)
    for b in d["blocks"]:
        if b["type"] != 0:
            continue
        for l in b.get("lines", []):
            txt = "".join(s["text"] for s in l["spans"]).rstrip()
            if not txt.strip():
                continue
            x0, y0, x1, y1 = l["bbox"]
            lado = "cheia" if x1 - x0 > w * 0.62 else ("esq" if x0 < mid - 5 else "dir")
            itens.append((lado, round(y0, 1), x0, txt))
    cheias = sorted(i for i in itens if i[0] == "cheia")
    resto = [i for i in itens if i[0] != "cheia"]
    ini = -1
    for c in cheias + [("cheia", 1e9, 0, None)]:
        faixa = [i for i in resto if ini <= i[1] < c[1]]
        for lado in ("esq", "dir"):
            for _, _, _, t in sorted((i for i in faixa if i[0] == lado), key=lambda i: (i[1], i[2])):
                print(t)
        if c[3] is not None:
            print(c[3])
        ini = c[1]
    print("\f")
