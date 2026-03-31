from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import *  # noqa: F401,F403
from app.services.seed_service import seed_reference_data
from app.services.storage_service import ensure_storage_dirs


def init_db() -> None:
    ensure_storage_dirs()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_reference_data(db)


if __name__ == "__main__":
    init_db()
