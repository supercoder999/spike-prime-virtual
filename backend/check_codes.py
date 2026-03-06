import asyncio
import os
from firebase_admin import firestore
from app.firestore import init_firestore

async def check_activation_codes():
    # Use environment project ID instead of hardcoded default
    project_id = os.getenv("GCP_PROJECT_ID", "spikeprimevirtual")
    print(f"Using project: {project_id}")
    db = firestore.AsyncClient(project=project_id)
    email = 'sb-ifcxe49765761@personal.example.com'
    
    print(f"Searching for buyer_email: {email}...")
    
    # 1. Search by buyer_email manually (no index required if we don't use order_by with where on different fields)
    query = db.collection('activation_codes').where('buyer_email', '==', email)
    docs = [d async for d in query.stream()]
    
    if docs:
        # Sort manually in Python since the index is missing
        docs.sort(key=lambda x: x.to_dict().get('created_at'), reverse=True)
        doc = docs[0]
        data = doc.to_dict()
        print("\nMatch found for buyer_email:")
        print(f"Data: {data}")
        print(f"Code: {data.get('code')}")
        print(f"Expiry ISO: {data.get('expiry_iso')}")
        print(f"Buyer Email: {data.get('buyer_email')}")
        print(f"Created At: {data.get('created_at')}")
    else:
        print("\nNo match found for that buyer_email. Checking the very last code created in the collection...")
        
        # 2. Check the 5 most recent codes to see what's happening
        last_query = db.collection('activation_codes').order_by('created_at', direction=firestore.Query.DESCENDING).limit(5)
        last_docs = [d async for d in last_query.stream()]
        
        if last_docs:
            print("\nLast 5 codes created in the collection:")
            for d in last_docs:
                last_data = d.to_dict()
                print(f"- Code: {last_data.get('code')}, Email: {last_data.get('buyer_email')}, Created: {last_data.get('created_at')}")
        else:
            print("\nNo codes found in the 'activation_codes' collection at all.")

if __name__ == "__main__":
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/home/thanh/Documents/spike-prime-virtual/backend/sa-key.json"
    asyncio.run(check_activation_codes())
