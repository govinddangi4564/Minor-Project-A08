from datetime import timezone, timedelta, datetime
from pathlib import Path
import uuid
from utils.log_config import logger


BASE_DIR = Path(__file__).resolve().parent.parent
logger.info(f"BASE_DIR set to: {BASE_DIR}")

IST = timezone(timedelta(hours=5, minutes=30))  # Define IST timezone once


def format_datetime_to_ist(dt):
    """Convert a datetime object to IST timezone and format it as a string."""
    return dt.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S")


def get_current_datetime_utc():
    now = datetime.now(timezone.utc)
    return now


def get_new_id():
    return uuid.uuid4().hex
