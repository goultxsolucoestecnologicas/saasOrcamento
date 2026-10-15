"""Renderiza páginas reais com Poppler; nenhuma imagem de evidência é simulada."""
from pathlib import Path
import shutil
import subprocess
import sys
from pypdf import PdfReader

raiz = Path(__file__).resolve().parents[1]
poppler = sys.argv[1] if len(sys.argv) > 1 else shutil.which("pdftoppm")
if not poppler:
    raise SystemExit("Informe o caminho de pdftoppm como primeiro argumento.")
destino = raiz / "docs/pdf/imagens"
destino.mkdir(parents=True, exist_ok=True)
for arquivo in sorted((raiz / "docs/pdf/exemplos").glob("*.pdf")):
    paginas = len(PdfReader(arquivo).pages)
    selecao = [(1, arquivo.stem)]
    if paginas > 1:
        selecao += [(paginas, arquivo.stem + "-ultima"), (max(2, paginas // 2), arquivo.stem + "-intermediaria")]
    for pagina, nome in selecao:
        subprocess.run([poppler, "-f", str(pagina), "-singlefile", "-scale-to", "1400", "-png", str(arquivo), str(destino / nome)], check=True)
    print(f"{arquivo.name}: {paginas} páginas; primeira" + (", intermediária e última renderizadas" if paginas > 1 else " renderizada"))
