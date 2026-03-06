import os
import asyncio
from google.cloud import firestore
import json

async def search_activation_codes():
    # Set credentials path
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/home/thanh/Documents/spike-prime-virtual/backend/sa-key.json"
    
    # Initialize Firestore client
    db = firestore.AsyncClient(project="spikeprimevirtual")
    
    subscription_id = "I-C4HU191T91AY"
    buyer_email = "sb-ifcxe49765761@personal.example.com"
    collection_name = "activation_codes"
    
    print(f"Searching for Subscription ID: {subscription_id} or Buyer Email: {buyer_email}...")
    
    # 1. Search by buyer_email
    docs = db.collection(collection_name).where("buyer_email", "==", buyer_email).stream()
    found = False
    async for doc in docs:
        print(f"Found by buyer_email: {doc.id} => {json.dumps(doc.to_dict(), indent=2, default=str)}")
        found = True
        
    # 2. Search all docs for the subscription ID in any field (including metadata)
    # Since we can't easily query nested fields without knowing the exact path, 
    # and we want to search "any metadata", we'll fetch all and filter locally if not found yet.
    # But let's try some common paths first.
    
    if not found:
        print("Searching all documents for matching metadata...")
        all_docs = db.collection(collection_name).stream()
        async for doc in all_docs:
            data = doc.to_dict()
            data_str = json.dumps(data)
            if subscription_id in data_str or buyer_email in data_str:
                print(f"Found matching doc: {doc.id} => {json.dumps(data, indent=2, default=str)}")
                found = True

    # 3. If still nothing found, get the latest 3 codes
    if not found:
        print("\nNothing found. Fetching the latest 3 codes:")
        latest_docs = db.collection(collection_name).order_by("created_at", direction=firestore.Query.DESCENDING).limit(3).stream()
        async for doc in latest_docs:
            print(f"Latest doc: {doc.id} => {json.dumps(doc.to_dict(), indent=2, default=str)}")

if __name__ == "__main__":
    asyncio.run(search_activation_codes())
