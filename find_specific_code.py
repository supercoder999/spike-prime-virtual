
import asyncio
import os
from firebase_admin import credentials, initialize_app, firestore

async def find_activation_code(buyer_email):
    project_id = os.getenv("GCP_PROJECT_ID", "spikeprimevirtual")
    key_path = "/home/thanh/Documents/spike-prime-virtual/backend/sa-key.json"
    
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        try:
            initialize_app(cred, {"projectId": project_id})
        except ValueError:
            pass
        db = firestore.client()
    else:
        print(f"Error: Service account key not found at {key_path}")
        return

    # 1. Search for documents where 'buyer_email' matches
    print(f"Searching for codes with buyer_email: {buyer_email}...")
    # Removing order_by to avoid needing a composite index
    query = db.collection("activation_codes").where("buyer_email", "==", buyer_email).limit(10)
    docs = query.get()
    
    found_doc = None
    results = []
    for doc in docs:
        results.append(doc)
    
    if results:
        # Sort manually if multiple are found
        results.sort(key=lambda d: d.to_dict().get('created_at'), reverse=True)
        found_doc = results[0]
    
    if not found_doc:
        print("No match found for emails. Searching for the absolute latest code by 'created_at'...")
        # 2. Search for the absolute latest code
        query = db.collection("activation_codes").order_by("created_at", direction=firestore.Query.DESCENDING).limit(1)
        docs = query.get()
        for doc in docs:
            found_doc = doc
            break

    if found_doc:
        data = found_doc.to_dict()
        print("\nMatch Found:")
        print(f"Code: {data.get('code')}")
        print(f"Buyer Email: {data.get('buyer_email')}")
        print(f"Created At: {data.get('created_at')}")
    else:
        print("No activation codes found in the collection.")

if __name__ == "__main__":
    email = "sb-ifcxe49765761@personal.example.com"
    asyncio.run(find_activation_code(email))
