import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

app = FastAPI()

# 1. Aktifkan CORS agar Frontend (GitHub Pages) bisa tersambung lancar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Ambil API Key langsung dari sistem Environment Vercel secara aman
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# 3. Inisialisasi client Groq
client = Groq(api_key=GROQ_API_KEY)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": request.message}]
        )
        return {"reply": completion.choices[0].message.content}
    except Exception as e:
        # Jika ada error internal dari Groq, kembalikan status HTTP 500 agar frontend tahu
        return {"reply": f"Waduh, ada error nih: {str(e)}"}