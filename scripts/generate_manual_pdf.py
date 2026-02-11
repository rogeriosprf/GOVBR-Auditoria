from pathlib import Path


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def chunk_lines(lines, max_lines):
    page = []
    for line in lines:
        page.append(line)
        if len(page) >= max_lines:
            yield page
            page = []
    if page:
        yield page


def build_pdf_pages(pages_lines):
    objects = []

    def add_object(content: bytes) -> int:
        objects.append(content)
        return len(objects)

    font_id = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    pages_root_placeholder = add_object(b"<< /Type /Pages /Count 0 /Kids [] >>")

    page_ids = []
    for lines in pages_lines:
        content_lines = [
            "BT",
            "/F1 11 Tf",
            "50 800 Td",
            "14 TL",
        ]
        for line in lines:
            content_lines.append(f"({escape_pdf_text(line)}) Tj")
            content_lines.append("T*")
        content_lines.append("ET")
        stream = "\n".join(content_lines).encode("latin-1", errors="replace")
        content_obj = b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream"
        content_id = add_object(content_obj)

        page_obj = (
            b"<< /Type /Page /Parent %d 0 R /MediaBox [0 0 595 842] "
            b"/Resources << /Font << /F1 %d 0 R >> >> /Contents %d 0 R >>"
        ) % (pages_root_placeholder, font_id, content_id)
        page_id = add_object(page_obj)
        page_ids.append(page_id)

    kids = " ".join(f"{pid} 0 R" for pid in page_ids).encode("ascii")
    pages_root = b"<< /Type /Pages /Count %d /Kids [ %s ] >>" % (len(page_ids), kids)
    objects[pages_root_placeholder - 1] = pages_root

    catalog_id = add_object(b"<< /Type /Catalog /Pages %d 0 R >>" % pages_root_placeholder)

    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    body = bytearray(header)
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(body))
        body.extend(f"{i} 0 obj\n".encode("ascii"))
        body.extend(obj)
        body.extend(b"\nendobj\n")

    xref_start = len(body)
    body.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    body.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        body.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_start}\n%%EOF\n"
    ).encode("ascii")
    body.extend(trailer)
    return bytes(body)


def main():
    project_root = Path(__file__).resolve().parents[1]
    out_path = project_root / "static" / "manual_sistema.pdf"

    lines = [
        "Manual do Sistema - Audit-GOV",
        "",
        "1. Objetivo",
        "Este sistema apoia a triagem e priorizacao de casos de auditoria de viagens.",
        "",
        "2. Abas principais",
        "- Home: alertas operacionais e conformidade.",
        "- Insights: analises sinteticas (com cache para reduzir consumo).",
        "- Auditorias: lista de viagens para triagem e investigacao.",
        "- Dashboard: visoes BI de risco, valor e rankings.",
        "- Pagamentos: monitor diario, outliers de taxa e casos acionaveis.",
        "",
        "3. Home",
        "- Alertas Operacionais: le de audit_bi.kpi_alertas_operacionais.",
        "- Conformidade: distribuicao por criticidade.",
        "",
        "4. Monitor de Pagamentos",
        "- Serie diaria por mes selecionado.",
        "- Outliers de taxa de servico (top ocorrencias).",
        "- Compras tardias (emissao apos inicio).",
        "- Casos acionaveis (alto score e alto valor).",
        "",
        "5. Filtros e operacao",
        "- O seletor de mes afeta os blocos dependentes de data no monitor.",
        "- Abertura de detalhe de caso ocorre pela aba Auditorias.",
        "",
        "6. Endpoints principais",
        "- /api/auditoria/control-alertas",
        "- /api/auditoria/control-conformidade",
        "- /api/auditoria/control-pagamentos",
        "- /api/auditoria/control-pagamentos-outliers",
        "- /api/auditoria/control-pagamentos-tardias",
        "- /api/auditoria/control-pagamentos-casos",
        "",
        "7. Boas praticas para auditor",
        "- Priorize casos com alto score e alto impacto financeiro.",
        "- Valide justificativas em urgencias e compras tardias.",
        "- Cruze alertas com orgao e perfil de criticidade.",
        "",
        "8. Suporte",
        "Em caso de divergencia de dados, verificar cubos do schema audit_bi e logs da API.",
    ]

    pages = list(chunk_lines(lines, max_lines=48))
    pdf_bytes = build_pdf_pages(pages)
    out_path.write_bytes(pdf_bytes)
    print(f"Manual gerado em: {out_path}")


if __name__ == "__main__":
    main()
