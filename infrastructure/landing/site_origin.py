"""Set deployment origin once after importing the repository's authored content."""
from sqlalchemy.orm import Session
from app.core.config import Settings
from app.db.session import build_engine
from app.models import SiteSetting

engine = build_engine(Settings())
try:
    with Session(engine) as session, session.begin():
        general = session.get(SiteSetting, 'general')
        general.value_json = {**general.value_json, 'site_url': 'https://makanapp.org'}
finally:
    engine.dispose()
