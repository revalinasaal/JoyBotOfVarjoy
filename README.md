from pathlib import Path

readme = """# 🌱 Joy AI / Varjoy

## 📝 Judul Proyek
**Joy AI: Intelligent Chatbot for Students’ Mental Health**

Joy AI adalah proyek chatbot berbasis AI yang diimplementasikan dalam website bernama **Varjoy**.  
Di dalam Varjoy, pengguna dapat berinteraksi dengan chatbot bernama **Joy**.

Pembagian istilah:
- **Joy AI** = nama proyek
- **Varjoy** = platform website
- **Joy** = chatbot/asisten virtual


## 💡 Deskripsi
Varjoy dibuat sebagai prototype website untuk membantu mahasiswa mendapatkan dukungan emosional awal secara lebih mudah dan nyaman.

Mahasiswa sering menghadapi tekanan akademik, stres, burnout, kecemasan, atau masalah pribadi. Tidak semua mahasiswa merasa nyaman untuk langsung bercerita kepada orang lain atau mencari bantuan profesional. Karena itu, Varjoy menyediakan ruang awal bagi mahasiswa untuk bercerita melalui chatbot Joy.

Joy dirancang untuk memberikan respons yang empatik, suportif, tidak menghakimi, dan sesuai konteks percakapan pengguna.

> Catatan: Joy bukan psikolog, konselor, atau tenaga medis profesional. Joy tidak memberikan diagnosis atau terapi, tetapi hanya berperan sebagai pendamping awal.


## ✨ Fitur Utama
- 💬 **Chat dengan Joy**  
  Pengguna dapat bercerita dan mendapatkan respons empatik dari chatbot Joy.

- 🎙️ **Input Suara**  
  Pengguna dapat menggunakan mikrofon untuk mengubah suara menjadi teks.

- 📌 **Riwayat Percakapan**  
  Percakapan pengguna dengan Joy dapat tersimpan agar mudah dilanjutkan kembali.

- 😊 **Mood Tracking**  
  Pengguna dapat mencatat mood harian sebagai media refleksi diri.

- 📅 **Mood Calendar**  
  Pengguna dapat melihat riwayat mood yang sudah dicatat.

- 📝 **Journaling**  
  Pengguna dapat menulis jurnal harian terkait perasaan atau pengalaman yang dialami.

- 🏠 **Dashboard Wellness**  
  Menampilkan ringkasan dan akses cepat ke fitur utama Varjoy.

- 👤 **Profil Pengguna**  
  Pengguna dapat mengelola data profil dan preferensi akun.

- ⚙️ **Pengaturan Chat**  
  Pengguna dapat mengatur preferensi percakapan, seperti nama panggilan, tone respons, dan bahasa.

- 🚨 **Arahan Bantuan untuk Kondisi Serius**  
  Jika pengguna menunjukkan indikasi kondisi serius, Joy memberikan respons yang hati-hati dan menyarankan pengguna untuk mencari bantuan dari orang terdekat atau tenaga profesional.


## 🖼️ Demonstrasi / Pratinjau
Link prototype:
https://varjoy-web.vercel.app/

Screenshot atau dokumentasi tampilan aplikasi dapat diletakkan pada folder:

```txt
docs/preview/

Contoh isi folder:

docs/preview/landing-page.png
docs/preview/home.png
docs/preview/chat-joy.png
docs/preview/mood-tracking.png
docs/preview/profile.png

File desain sistem dapat diletakkan pada folder:

docs/diagrams/

Contoh isi folder:

docs/diagrams/use-case-diagram.png
docs/diagrams/alur-sistem-chatbot-joy.png
docs/diagrams/activity-diagram-varjoy.png
⚙️ Cara Instalasi

Ikuti langkah berikut untuk menjalankan project secara lokal.

1. Clone repository
git clone <link-repository>
cd JoyBotOfVarjoy-main
2. Buat virtual environment
python -m venv venv

Aktifkan virtual environment:

Windows:

venv\\Scripts\\activate

macOS/Linux:

source venv/bin/activate
3. Install dependency
pip install -r requirements.txt
4. Buat file .env

Buat file .env berdasarkan .env.example, lalu isi konfigurasi berikut:

GROQ_API_KEY=isi_dengan_groq_api_key
SUPABASE_URL=isi_dengan_supabase_url
SUPABASE_SERVICE_KEY=isi_dengan_supabase_service_role_key
SUPABASE_ANON_KEY=isi_dengan_supabase_anon_key
SUPABASE_JWT_SECRET=isi_jika_diperlukan
5. Setup database Supabase

Jalankan file berikut di SQL Editor Supabase:

supabase_schema.sql
6. Jalankan backend
uvicorn main:app --reload --port 8000

Backend akan berjalan di:

http://localhost:8000
7. Jalankan frontend

Buka file index.html di browser, atau jalankan local server:

python -m http.server 5500

Lalu buka:

http://localhost:5500
🚀 Panduan Penggunaan

Contoh alur penggunaan Varjoy:

Buka website Varjoy.
Register atau login akun.
Masuk ke halaman home/dashboard.
Catat mood harian pada fitur mood tracking.
Buka halaman chat Joy.
Ketik pesan atau gunakan input suara.
Joy akan memberikan respons sesuai konteks percakapan.
Pengguna dapat melihat riwayat percakapan, menulis jurnal, atau mengubah profil.
🛠️ Teknologi yang Digunakan
Frontend
HTML
CSS
JavaScript
Supabase JS Client
Web Speech API
Backend
Python
FastAPI
Uvicorn
Pydantic
python-dotenv
AI dan LLM
Groq API
Llama 3.3 70B Versatile
Database dan Auth
Supabase
PostgreSQL
Supabase Auth
Row Level Security
Deployment
Vercel
AI Tools Pengembangan
ChatGPT
Claude
🤝 Lisensi & Kontribusi

Project ini dibuat untuk keperluan tugas besar mata kuliah Kecerdasan Buatan.

Kontribusi diperbolehkan untuk pengembangan atau pembelajaran lebih lanjut, seperti:

memperbaiki tampilan antarmuka,
menambahkan fitur baru,
meningkatkan keamanan data,
memperbaiki bug,
mengembangkan analisis mood,
atau mengintegrasikan layanan konseling kampus.

Jika ingin mengembangkan project ini, silakan fork repository, buat branch baru, lalu ajukan pull request.

Lisensi dapat disesuaikan dengan kebutuhan kelompok. Jika ingin dibuat open source, project ini dapat menggunakan lisensi MIT.

👥 Anggota Kelompok

Kelompok 3:

Alyssa Shane Kurniawan
Galang Bintang Ramadhan
Olivia Oktaviani
Puti Shasta Khafiyani
Revalina Salwa Aliya Wicaksono Prabowo
🌷 Penutup

Varjoy dibuat sebagai prototype sederhana untuk menunjukkan bagaimana AI dapat digunakan sebagai pendamping awal kesehatan mental mahasiswa.

Semoga project ini bisa menjadi langkah kecil untuk membuat ruang bercerita yang lebih aman, nyaman, dan mudah diakses.
"""

path = Path("/mnt/data/README_Varjoy_Singkat.txt")
path.write_text(readme, encoding="utf-8")
print(f"File berhasil dibuat: {path}")
print(f"Ukuran file: {path.stat().st_size} bytes")
