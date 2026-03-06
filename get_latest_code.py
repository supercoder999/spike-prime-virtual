
import asyncio
import os
import json
from google.cloud import firestore
from firebase_admin import credentials, initialize_app, firestore as admin_firestore

async def get_latest_activation_code():
    # Use the same logic as backend/app/firestore.py but simplified for a script
    project_id = os.getenv("GCP_PROJECT_ID", "spikeprimevirtual")
    emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST")

    if emulator_host:
        print(f"Connecting to Firestore emulator at {emulator_host}")
        os.environ["FIRESTORE_EMULATOR_HOST"] = emulator_host
        db = admin_firestore.client()
    else:
        # For production/real Firestore, we need the service account key
        # Point to the sa-key.json in the backend folder
        key_path = "/home/thanh/Documents/spike-prime-virtual/backend/sa-key.json"
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            try:
                initialize_app(cred, {"projectId": project_id})
            except ValueError:
                # Already initialized
                pass
            db = admin_firestore.client()
        else:
            print(f"Service account key not found at {key_path}")
            return

    # Query the latest activation code
    # Note: admin_firestore.client() is synchronous, but we can treat it as such
    collection_ref = db.collection("activation_codes")
    query = collection_ref.order_by("created_at", direction=admin_firestore.Query.DESCENDING).limit(1)
    docs = query.stream()

    found = False
    for doc in docs:
        found = True
        data = doc.to_dict()
        result = {
            "code": data.get("code"),
            "buyer_email": data.get("buyer_email"),
            "expiry_iso": data.get("expiry"),
            "created_at": data.get("created_at")
        }
        print(json.dumps(result, indent=2))
        break
    
    if not found:
        print("No activation codes found in the collection.")

if __name__ == "__main__":
    asyncio.run(get_latest_activation_code())
