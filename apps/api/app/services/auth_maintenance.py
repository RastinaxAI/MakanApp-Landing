"""Bounded cleanup of expired, disposable authentication records only."""

from datetime import datetime

from sqlalchemy import delete, select, tuple_
from sqlalchemy.orm import Session

from app.models import AdminOtp, AuthChallenge, RateLimitBucket


def cleanup_expired(session: Session, cutoff: datetime, batch_size: int = 1000) -> dict[str, int]:
    if not 1 <= batch_size <= 10000:
        raise ValueError("batch_size must be between 1 and 10000")
    challenges = select(AuthChallenge.id).where(AuthChallenge.expires_at < cutoff).limit(batch_size)
    removed_challenges = session.execute(
        delete(AuthChallenge).where(AuthChallenge.id.in_(challenges))
    ).rowcount
    columns = (RateLimitBucket.scope, RateLimitBucket.subject_hmac, RateLimitBucket.window_start)
    buckets = select(*columns).where(RateLimitBucket.expires_at < cutoff).limit(batch_size)
    removed_buckets = session.execute(
        delete(RateLimitBucket).where(tuple_(*columns).in_(buckets))
    ).rowcount
    otps = select(AdminOtp.id).where(AdminOtp.expires_at < cutoff).limit(batch_size)
    removed_otps = session.execute(delete(AdminOtp).where(AdminOtp.id.in_(otps))).rowcount
    return {"challenges": removed_challenges, "rate_buckets": removed_buckets, "otps": removed_otps}
