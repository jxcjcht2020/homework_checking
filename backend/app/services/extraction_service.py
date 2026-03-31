from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET


def _extract_docx(path: Path) -> str:
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    with ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    paragraphs: list[str] = []
    for node in root.findall(".//w:p", ns):
        chunks: list[str] = []
        for text_node in node.findall(".//w:t", ns):
            if text_node.text:
                chunks.append(text_node.text.replace("\xa0", " "))
        if chunks:
            paragraphs.append("".join(chunks))
    return "\n".join(paragraphs)


def _extract_pdf(path: Path) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(str(path))
    pages: list[str] = []
    for page in reader.pages:
        pages.append((page.extract_text() or "").replace("\x00", ""))
    return "\n\n".join(pages)


def _extract_ipynb(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    parts: list[str] = []
    for cell in data.get("cells", []):
        source = cell.get("source", [])
        text = "".join(source) if isinstance(source, list) else str(source)
        text = text.strip()
        if not text:
            continue
        cell_type = cell.get("cell_type", "unknown")
        parts.append(f"[{cell_type}]\n{text}")
    return "\n\n".join(parts)


def _extract_plain(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def extract_homework_text(path_str: str | None) -> str:
    if not path_str:
        return ""
    path = Path(path_str)
    if not path.exists():
        return ""

    suffix = path.suffix.lower()
    handlers = {
        ".docx": _extract_docx,
        ".pdf": _extract_pdf,
        ".ipynb": _extract_ipynb,
        ".md": _extract_plain,
        ".txt": _extract_plain,
    }
    if suffix == ".doc":
        return ""
    handler = handlers.get(suffix)
    if not handler:
        return ""
    try:
        return handler(path).strip()
    except Exception:
        return ""
