import re


def parse_standard_preview(raw_text: str) -> dict:
    if not raw_text.strip():
        return {
            "title": "Main Chain",
            "items": [],
            "paragraphs": ["No markdown preview was extracted from the uploaded standard file."],
        }

    lines = raw_text.splitlines()
    title = "Main Chain"
    items: list[str] = []
    paragraphs: list[str] = []
    paragraph_buffer: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if paragraph_buffer:
                paragraphs.append(" ".join(paragraph_buffer))
                paragraph_buffer = []
            continue
        if stripped.startswith("# "):
            title = stripped[2:].strip() or title
            continue
        if re.match(r"^[-*+] ", stripped):
            items.append(stripped[2:].strip())
            continue
        paragraph_buffer.append(stripped)

    if paragraph_buffer:
        paragraphs.append(" ".join(paragraph_buffer))

    return {
        "title": title,
        "items": items[:8],
        "paragraphs": paragraphs[:3],
    }
