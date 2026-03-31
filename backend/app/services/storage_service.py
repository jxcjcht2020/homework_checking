from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings


def ensure_storage_dirs() -> None:
    for path in [
        settings.storage_root,
        settings.standards_dir,
        settings.submissions_dir,
        settings.reviews_dir,
        settings.postgres_data_dir,
    ]:
        path.mkdir(parents=True, exist_ok=True)


async def save_upload(upload: UploadFile, target_dir: Path) -> tuple[str, str]:
    target_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(upload.filename or "").suffix
    stored_name = f"{uuid4().hex}{suffix}"
    stored_path = target_dir / stored_name
    stored_path.write_bytes(await upload.read())
    return upload.filename or stored_name, str(stored_path)


def read_text_if_possible(path: str) -> str:
    file_path = Path(path)
    if file_path.suffix.lower() not in {".md", ".txt"}:
        return ""
    return file_path.read_text(encoding="utf-8", errors="ignore")
