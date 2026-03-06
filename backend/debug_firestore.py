import os
import datetime
from google.cloud import firestore
from google.oauth2 import service_account

# Set up credentials and client
# Assuming sa-key.json is the service account key
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/home/thanh/Documents/spike-prime-virtual/backend/sa-key.json"
project_id = "spikeprimevirtual"

db = firestore.Client(project=project_id)

def check_activation_codes():
    print("--- Searching for buyer_email: sb-ifcxe49765761@personal.example.com ---")
    codes_ref = db.collection("activation_codes")
    query = codes_ref.where("buyer_email", "==", "sb-ifcxe49765761@personal.example.com").stream()
    
    found = False
    for doc in query:
        found = True
        print(f"ID: {doc.id} => {doc.to_dict()}")
    
    if not found:
        print("No codes found for this email.")

    print("\n--- Searching for codes created in the last 60 minutes ---")
    now = datetime.datetime.now(datetime.timezone.utc)
    sixty_mins_ago = now - datetime.timedelta(minutes=60)
    
    # Check if 'created_at' or similar field exists. We'll try to guess common names.
    # First, let's see what fields are in a recent document to be sure.
    recent_codes = codes_ref.order_by("created_at", direction=firestore.Query.DESCENDING).limit(5).stream()
    
    print("Recent codes (last 5):")
    for doc in recent_codes:
        data = doc.to_dict()
        created_at_raw = data.get("created_at")
        buyer_email = data.get("buyer_email")
        print(f"ID: {doc.id}, Email: {buyer_email}, Created: {created_at_raw}")
        
        # If string, convert to datetime
        if isinstance(created_at_raw, str):
            # Parse '2026-03-05T03:46:03.367126+00:00'
            try:
                created_at = datetime.datetime.fromisoformat(created_at_raw.replace('Z', '+00:00'))
                if created_at > sixty_mins_ago:
                    print(f"  MATCH: Created in last 60 mins: {data}")
            except Exception as e:
                print(f"Error parsing date {created_at_raw}: {e}")
        elif isinstance(created_at_raw, datetime.datetime):
            if created_at_raw > sixty_mins_ago:
                print(f"  MATCH: Created in last 60 mins: {data}")

if __name__ == "__main__":
    check_activation_codes()
