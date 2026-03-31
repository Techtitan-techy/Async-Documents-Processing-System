import redis
import os
import json

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL)

def publish_event(document_id: str, status: str, step: str, details: dict = None):
    """
    Publish an event to a specific document's channel for real-time SSE.
    """
    channel = f"doc_progress:{document_id}"
    message = {
        "document_id": document_id,
        "status": status,
        "step": step,
        "details": details or {}
    }
    redis_client.publish(channel, json.dumps(message))
