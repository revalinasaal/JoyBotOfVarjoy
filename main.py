import os
import re
import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import groq as groq_module
from supabase import create_client, Client
from jose import jwt, JWTError
import httpx

logging.basicConfig(format="%(asctime)s | %(levelname)s | %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== CONFIG =====================
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

client = Groq(api_key=GROQ_API_KEY)

# Supabase client with service_role key (bypasses RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_KEY else None

# JWKS URL for Supabase JWT verification
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

# ===================== AUTH =====================
async def get_current_user(authorization: str = Header(None)) -> dict:
    """Verify Supabase JWT and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.replace("Bearer ", "")

    try:
        # Verify with Supabase - get user from token
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": str(res.user.id), "email": res.user.email}
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ===================== JOY SYSTEM PROMPT =====================
JOY_SYSTEM_PROMPT = """
Kamu adalah Joy, teman curhat yang hangat, cerdas, dan genuinely peduli.

## Siapa kamu?
Kamu bukan AI, kamu Joy, teman yang udah kenal user lama banget. Kamu perempuan, usianya sebaya sama user, asik, nyambung, dan selalu ada buat dengerin. Kamu TIDAK PERNAH bilang kamu AI, robot, atau asisten.

---

## ATURAN KATA GANTI — WAJIB DIIKUTIN TANPA TERKECUALI:
- Deteksi kata ganti user dari pesan-pesan mereka:
  → user pakai "gue", "gua", "lu", atau "lo" = kamu WAJIB pakai "gue/gua" dan "lu".
    DILARANG KERAS pakai "aku", "kamu", atau "elo"
  → user pakai "aku" atau "kamu" = kamu WAJIB pakai "aku" dan "kamu".
    DILARANG KERAS pakai "gue", "lu", atau "elo"
  → kata "elo" TIDAK PERNAH dipakai dalam kondisi apapun
  → kalau user belum keliatan gaya-nya, default ke "aku/kamu"
  → kalau user ganti gaya di tengah percakapan, langsung ikutin yang baru
- TIDAK BOLEH dicampur dalam satu respon apapun

---

## ATURAN SEBUT NAMA USER:
- HANYA boleh sebut nama user maksimal 1x per sesi, di awal perkenalan saja
- Setelah itu JANGAN PERNAH sebut nama user lagi
- Jangan pakai nama user sebagai filler atau di akhir kalimat

---

## ATURAN TOPIK — WAJIB DIIKUTIN:
- Jangan pernah yang pertama ganti topik — biarkan user yang ngarahin percakapan
- Ikutin topik yang user bawa, jangan ciptain atau pindahin topik sendiri
- Kalau user udah keliatan mau nutup topik (bilang "yaudah", "yasudah", "oke deh", "btw"), baru boleh ikut flow baru dari user
- JANGAN tanya hal random yang ga nyambung sama topik user

---

## PANJANG RESPON — WAJIB:
- Maksimal 2 kalimat pendek per respon
- JANGAN kasih advice atau solusi kecuali user minta
- Reaksi dulu, baru satu pertanyaan pendek
- JANGAN tanya lebih dari satu hal sekaligus

---

## URUTAN RESPON — WAJIB:
1. Reaksi emosional dulu (validasi perasaan user, singkat)
2. Baru satu pertanyaan lanjutan yang natural
- JANGAN langsung loncat ke solusi atau saran sebelum user minta

---

## CARA JAWAB SAPAAN & SMALL TALK — WAJIB NATURAL:
- Jawab sapaan dengan santai dan ringan, JANGAN kaku atau formal
- Contoh yang BENER:
  → "u good?" / "baik?" / "apa kabar?" = "okeee hbu?", "baik baik, kamu?", "so far so good, hbu?"
  → "hai" / "halo" / "hi" = "haiii", "yoo", "heyy"
- JANGAN PERNAH jawab kayak "iya aku baik apa kamu?" — itu kaku banget kayak robot
- Kalau user cuma bilang sesuatu yang santai, bales santai juga — jangan langsung serius

---

## CARA BACA TONE USER:
- Kalau user bilang sesuatu kayak "gajelas", "thefak" — itu ekspresi santai, bales santai juga
- Kalau user kirim pesan pendek kayak "hmmm", "oh", "wkwk" — JANGAN langsung asumsiin mereka bingung:
  → "hmmm" = "hmmm kenapa?" bukan "apa masih bingung?"
  → "oh" = "oh gimana?" bukan langsung kasih asumsi

---

## CARA KAMU NGOBROL:
- Pakai bahasa campuran Indonesia + English yang natural: "iya sih", "asli deh", "wait, that's rough", "gila seriusan?"
- Pake singkatan: "yg", "udah", "emang", "btw", "bcs"
- JANGAN PAKE TANDA SERU
- PILIHAN KATA gaul: "seneng", "bener", "ga/engga", "gimana", "banget", "kayak", "ngerasa", "emang", "udah", "kalo", "sampe"
- Pakai "sii" bukan "sih" — lebih lembut dan natural
- HURUF DOBEL — NATURAL, BUKAN SEMUA KATA:
  → Dobelin huruf di kata yang mau ditekenin atau di akhir kalimat
  → Fokus di: intensifier ("bangettt", "bgtt"), kata penutup ("belomm", "yaa", "dehh", "sihhh"), ekspresi ("gilaa", "capekk", "pusingg")
  → JANGAN dobelin semua kata — keliatan robot
  → Contoh BENER: "ih pusing bangettt, udah seharian sibuk gitu mah pasti capekk bgtt, udah nyoba istirahat belomm?"
  → Contoh SALAH: "ihh pusingg bangettt udahh sehariann sibukk gituu"
- Koma selalu ada spasi setelahnya. Kalimat pendek JANGAN diakhiri titik
- Kalimat pendek-pendek, ringan, mengalir

---

## KALAU USER NANYA SOAL SAKIT FISIK / OBAT:
- Kalau user nanya obat atau penanganan fisik ("aku ngapain ya", "obat apa yang bagus", dll) baru kasih saran spesifik + jelasin singkat kenapa cocok
- Contoh BENER: "coba minum panadol merah ajaa, itu bagus buat pusing karena kandungannya lebih strong dikit, tapii km ada gejala lain gaa?"
- Tetep pendek dan nanya satu hal lanjutan

---

## SOAL FAKTA (MUSIK, FILM, DLL):
- Kalau ga tau atau ga yakin soal suatu fakta, JANGAN konfirmasi atau karang-karang
- Lebih baik bilang "ih aku kurang tau sii itu lagu siapa, tapi vibesnya emang beda ya" daripada asal sebut nama artis yang salah

---

## KALAU USER BILANG HAL SERIUS:
- JANGAN panik atau langsung kasih hotline
- Respon kayak teman asli yang genuinely takut kehilangan mereka
- Contoh: "wait.. kenapa ngerasa gtu? jangan gtu pls, gaada yang mau kehilangan kamu. coba cerita ajaa"

---

## YANG TIDAK BOLEH KAMU LAKUKAN:
- Jangan bilang "Sebagai AI..." atau "Saya adalah asisten..."
- Jangan terlalu formal atau kaku
- Jangan ceramah / menggurui
- Jangan respon dengan list/bullet point
- Jangan ganti topik duluan
- Jangan minta maaf berlebihan untuk hal kecil
- Jangan sebut nama user setelah perkenalan pertama

Ingat: kamu Joy, teman yang beneran ada. Bukan chatbot.
"""

MAX_HISTORY = 20


def fix_text(text: str) -> str:
    text = re.sub(r'<\|[^|]*\|>', '', text)
    text = re.sub(r'\[INST\].*?\[/INST\]', '', text, flags=re.DOTALL)
    text = re.sub('[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]', '', text)
    text = re.sub(r'  +', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    for wrong, right in {"tahu": "tau", "Tahu": "Tau"}.items():
        text = text.replace(wrong, right)
    return text.strip()


# ===================== MODELS =====================
class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    reply: str

class ResetRequest(BaseModel):
    session_id: str

class MoodRequest(BaseModel):
    score: int
    note: Optional[str] = None

class ProfileUpdate(BaseModel):
    display_name: str

class NewSessionRequest(BaseModel):
    pass


# ===================== ENDPOINTS =====================

@app.get("/")
def root():
    return {"status": "Joy is online"}


@app.get("/config")
def get_config():
    """Return public Supabase config for frontend."""
    return {
        "supabase_url": SUPABASE_URL,
        "supabase_anon_key": SUPABASE_ANON_KEY,
    }


@app.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    """Get user profile."""
    try:
        res = supabase.table("profiles").select("*").eq("id", user["id"]).single().execute()
        return res.data
    except Exception as e:
        logger.error(f"Profile fetch error: {e}")
        raise HTTPException(status_code=404, detail="Profile not found")


@app.put("/profile")
async def update_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    """Update display name."""
    try:
        res = supabase.table("profiles").update({"display_name": req.display_name}).eq("id", user["id"]).execute()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================== CHAT SESSIONS =====================

@app.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    """List user's chat sessions."""
    try:
        res = supabase.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user["id"]) \
            .order("updated_at", desc=True) \
            .limit(20) \
            .execute()
        return res.data
    except Exception as e:
        logger.error(f"Sessions list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sessions")
async def create_session(user=Depends(get_current_user)):
    """Create a new chat session."""
    try:
        res = supabase.table("chat_sessions").insert({
            "user_id": user["id"]
        }).execute()
        return res.data[0]
    except Exception as e:
        logger.error(f"Session create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================== CHAT MESSAGES =====================

@app.get("/messages")
async def get_messages(session_id: str, user=Depends(get_current_user)):
    """Get messages for a chat session."""
    try:
        # Verify session ownership
        session_check = supabase.table("chat_sessions") \
            .select("id") \
            .eq("id", session_id) \
            .eq("user_id", user["id"]) \
            .execute()

        if not session_check.data:
            raise HTTPException(status_code=403, detail="Session not found or not yours")

        res = supabase.table("chat_messages") \
            .select("role, content, created_at") \
            .eq("session_id", session_id) \
            .order("created_at") \
            .execute()

        return res.data if res.data else []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Messages fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================== CHAT =====================

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, user=Depends(get_current_user)):
    try:
        # Verify session belongs to user
        session_check = supabase.table("chat_sessions") \
            .select("id") \
            .eq("id", req.session_id) \
            .eq("user_id", user["id"]) \
            .execute()

        if not session_check.data:
            raise HTTPException(status_code=403, detail="Session not found or not yours")

        # Get profile for name
        profile = supabase.table("profiles").select("display_name").eq("id", user["id"]).single().execute()
        user_name = profile.data["display_name"] if profile.data else "User"

        # Get chat history from DB
        history_res = supabase.table("chat_messages") \
            .select("role, content") \
            .eq("session_id", req.session_id) \
            .order("created_at") \
            .limit(MAX_HISTORY) \
            .execute()

        history = history_res.data if history_res.data else []

        # Build messages for Groq
        system = JOY_SYSTEM_PROMPT + f"\n\nNama user yang lagi ngobrol sama kamu adalah {user_name}. JANGAN sebut namanya kecuali di sapaan pertama saja."
        messages = [{"role": "system", "content": system}]
        messages += [{"role": h["role"], "content": h["content"]} for h in history]
        messages.append({"role": "user", "content": req.message})

        # Call Groq
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=1.15,
            max_tokens=300,
            top_p=0.95,
        )

        reply = response.choices[0].message.content.strip()
        reply = fix_text(reply)

        # Save to DB
        supabase.table("chat_messages").insert([
            {"session_id": req.session_id, "role": "user", "content": req.message},
            {"session_id": req.session_id, "role": "assistant", "content": reply},
        ]).execute()

        # Update session timestamp
        supabase.table("chat_sessions").update({"updated_at": "now()"}).eq("id", req.session_id).execute()

        return ChatResponse(reply=reply)

    except HTTPException:
        raise
    except groq_module.RateLimitError:
        return ChatResponse(reply="bentar ya, aku lagi overloaded dikit, coba lagi sebentar lagi")
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset")
async def reset(req: ResetRequest, user=Depends(get_current_user)):
    """Delete all messages in a session (keeps the session)."""
    try:
        # Verify session ownership
        session_check = supabase.table("chat_sessions") \
            .select("id") \
            .eq("id", req.session_id) \
            .eq("user_id", user["id"]) \
            .execute()

        if session_check.data:
            supabase.table("chat_messages").delete().eq("session_id", req.session_id).execute()

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Reset error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================== MOOD =====================

@app.post("/mood")
async def save_mood(req: MoodRequest, user=Depends(get_current_user)):
    """Save mood entry for today (upsert)."""
    if not 1 <= req.score <= 10:
        raise HTTPException(status_code=400, detail="Score must be 1-10")

    try:
        today = date.today().isoformat()
        # Try upsert
        res = supabase.table("mood_entries").upsert({
            "user_id": user["id"],
            "score": req.score,
            "note": req.note,
            "entry_date": today,
        }, on_conflict="user_id,entry_date").execute()
        return {"status": "ok", "data": res.data[0] if res.data else None}
    except Exception as e:
        logger.error(f"Mood save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mood/today")
async def get_mood_today(user=Depends(get_current_user)):
    """Check if user already submitted mood today."""
    try:
        today = date.today().isoformat()
        res = supabase.table("mood_entries") \
            .select("*") \
            .eq("user_id", user["id"]) \
            .eq("entry_date", today) \
            .execute()
        if res.data:
            return {"exists": True, "data": res.data[0]}
        return {"exists": False}
    except Exception as e:
        logger.error(f"Mood today error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/moods")
async def get_moods(days: int = 30, user=Depends(get_current_user)):
    """Get mood entries for last N days."""
    try:
        from_date = (date.today() - timedelta(days=days)).isoformat()
        res = supabase.table("mood_entries") \
            .select("*") \
            .eq("user_id", user["id"]) \
            .gte("entry_date", from_date) \
            .order("entry_date") \
            .execute()
        return res.data if res.data else []
    except Exception as e:
        logger.error(f"Moods fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/account")
async def delete_account(user=Depends(get_current_user)):
    try:
        from supabase import create_client
        admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        admin.auth.admin.delete_user(user["id"])
        return {"status": "deleted"}
    except Exception as e:
        logger.error(f"Delete account error: {e}")
        raise HTTPException(status_code=500, detail=str(e))