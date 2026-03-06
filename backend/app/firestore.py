"""
Firestore client initialization.

- In production: uses Application Default Credentials or a service account key
  pointed to by GOOGLE_APPLICATION_CREDENTIALS.
- In local development: connects to the Firebase Emulator when
  FIRESTORE_EMULATOR_HOST is set (e.g. "localhost:8080").

Environment variables (set in backend/.env):
    FIRESTORE_EMULATOR_HOST  – e.g. "localhost:8080"  (local only)
    GCP_PROJECT_ID           – Google Cloud project ID
    GOOGLE_APPLICATION_CREDENTIALS – path to service-account JSON (prod)
"""

import os
import logging

import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

_app: firebase_admin.App | None = None
_db: firestore.AsyncClient | None = None


def init_firestore() -> firestore.AsyncClient:
    """Initialise the Firebase Admin SDK and return an async Firestore client.

    Safe to call multiple times – subsequent calls return the cached client.
    """
    global _app, _db

    if _db is not None:
        return _db

    emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST")
    project_id = os.getenv("GCP_PROJECT_ID", "code-pybricks-local")

    if emulator_host:
        logger.info("Firestore emulator detected at %s", emulator_host)
        # The emulator doesn't need real credentials – use no-credential init
        if not firebase_admin._apps:
            _app = firebase_admin.initialize_app(
                options={"projectId": project_id}
            )
        else:
            _app = firebase_admin.get_app()
    else:
        # Production: use ADC or explicit service-account key
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path:
            cred = credentials.Certificate(cred_path)
        else:
            cred = credentials.ApplicationDefault()

        if not firebase_admin._apps:
            _app = firebase_admin.initialize_app(
                cred, options={"projectId": project_id}
            )
        else:
            _app = firebase_admin.get_app()

        logger.info("Firestore initialised for project %s", project_id)

    _db = firestore.AsyncClient(project=project_id)
    return _db


def get_db() -> firestore.AsyncClient:
    """Return the cached Firestore async client. Raises if not initialised."""
    if _db is None:
        return init_firestore()
    return _db
