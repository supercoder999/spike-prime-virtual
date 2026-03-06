
import asyncio
import os
import sys
from datetime import datetime

# Add the backend directory to sys.path so we can import app
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.firestore import init_firestore

async def list_recent_codes():
    db = init_firestore()
    
    # Query activation_codes collection ordered by created_at descending
    # Limit to 5 results
    collection_ref = db.collection("activation_codes")
    query = collection_ref.order_by("created_at", direction="DESCENDING").limit(5)
    
    docs = await query.get()
    
    if not docs:
        print("No activation codes found.")
        return

    print(f"{'Code':<25} | {'Buyer Email':<30} | {'Expiry ISO':<12}")
    print("-" * 75)
    
    for doc in docs:
        data = doc.to_dict()
        code = data.get("code", "N/A")
        buyer_email = data.get("buyer_email", "N/A")
        expiry_iso = data.get("expiry", "N/A")
        print(f"{code:<25} | {buyer_email:<30} | {expiry_iso:<12}")

if __name__ == "__main__":
    asyncio.run(list_recent_codes())
