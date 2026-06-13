import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

res = supabase.table("journal_entries").select("*").execute()
for r in res.data:
    print(f"ID: {r['id']}")
    print(f"Content: {repr(r['content'])}")
    print(f"AI Feedback: {repr(r['ai_feedback'])}")
    print("---")

