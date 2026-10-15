"""Inspeção estrutural das amostras reais, além da revisão visual das páginas."""
from pathlib import Path
from pypdf import PdfReader
import pdfplumber

raiz = Path(__file__).resolve().parents[1]
arquivos = sorted((raiz / "docs/pdf/exemplos").glob("*.pdf"))
assert len(arquivos) >= 6, "Amostras incompletas"
for arquivo in arquivos:
    leitor = PdfReader(arquivo)
    textos = []
    with pdfplumber.open(arquivo) as documento:
        for indice, pagina in enumerate(documento.pages):
            assert abs(pagina.width - 595.28) < 1 and abs(pagina.height - 841.89) < 1, "Formato deve ser A4"
            texto = pagina.extract_text() or ""
            assert texto.strip(), "Página vazia"
            textos.append(texto)
            for caractere in pagina.chars:
                assert caractere["x0"] >= 0 and caractere["x1"] <= pagina.width + 0.5, "Texto fora da largura"
                assert caractere["top"] >= 0 and caractere["bottom"] <= pagina.height + 0.5, "Texto fora da altura"
            if indice < len(documento.pages) - 1:
                assert "ASSINATURA" not in texto and "TOTAL R$" not in texto, "Rodapé final em página intermediária"
            if "Quant." in texto:
                assert "Descrição do Serviço" in texto and "P. Unit." in texto, "Cabeçalho da tabela incompleto"
    assert "ASSINATURA" in textos[-1] and "TOTAL R$" in textos[-1], "Rodapé final ausente"
    if "simples" in arquivo.name:
        assert len(leitor.pages) == 1, "Documento simples não deve criar página adicional"
    if "pedido" in arquivo.name:
        assert "PEDIDO" in textos[0], "Tipo ausente"
        completo = " ".join((leitor.pages[0].extract_text() or "").split())
        for valor in ["Empresa Fictícia Demonstração", "Instalação e acabamento de pisos", "Responsável fictício", "Cidade Exemplo - RS", "@empresa.ficticia", "Qualidade em cada acabamento."]:
            assert valor in completo, f"Campo comercial ausente no documento: {valor}"
        assert "\ufffd" not in completo, "Texto com caractere de substituição"
    if "sem-logo" in arquivo.name:
        assert not any(p.images for p in leitor.pages), "Amostra sem logo contém imagens"
    if "somente-logo" in arquivo.name:
        assert any(p.images for p in leitor.pages), "Logo ausente no cabeçalho sem nome"
        texto_completo = " ".join((p.extract_text() or "") for p in leitor.pages)
        assert "Demonstração" not in texto_completo, "Nome exibido apesar de vazio"
        assert "Instalação e acabamento de pisos" not in texto_completo, "Descrição exibida apesar de nome vazio"
        assert "Responsável fictício" in texto_completo, "Contatos não devem ser omitidos"
    if "quebras-extremas" in arquivo.name:
        texto = "\n".join(p.extract_text() for p in leitor.pages)
        linhas = [linha.strip() for linha in texto.splitlines()]
        assert texto.count("W") == 500, "Descrição sem espaços perdeu caracteres"
        assert texto.count("X") - len(leitor.pages) == 250, "Descrição multilinha perdeu caracteres"
        assert linhas.count("A") + linhas.count("Obs.: A") == 1999 and linhas.count("AB") == 1, "Observações perderam linhas"
    print(f"{arquivo.name}: {len(leitor.pages)} páginas A4, textos dentro da folha, assinatura/total finais")
