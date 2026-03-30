# 📱 Telegram HR Dashboard v2

Dashboard untuk mengelola akun Telegram dan komunikasi grup secara manual dan terstruktur.

## Fitur v2
- 👤 Monitor status akun (active / limited / banned)
- 👥 Kelola status grup (active / failed / skip)
- 📝 Draft pesan tersimpan (template reusable)
- 📋 Antrian pengiriman (operator klik kirim satu per satu)
- ✉️ Kirim pesan langsung
- 📊 Riwayat & ringkasan pengiriman harian

## Cara Setup

### 1. Install library
```bash
pip install -r requirements.txt
```

### 2. Buat file .env
```bash
cp .env.example .env
# Isi API_ID dan API_HASH dari https://my.telegram.org
```

### 3. Jalankan backend
```bash
cd backend
python app.py
```

### 4. Buka frontend
Buka `frontend/index.html` di browser.

## Struktur Folder
```
tg-dashboard-v2/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── core/
│   │   ├── account_status.py
│   │   ├── group_status.py
│   │   ├── message_queue.py
│   │   └── send_history.py
│   ├── services/
│   │   ├── account_manager.py
│   │   ├── group_manager.py
│   │   └── message_service.py
│   └── utils/
│       ├── storage.py
│       └── logger.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
├── Procfile
└── requirements.txt
```

## API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | /api/akun | Daftar akun |
| POST | /api/akun/login | Login akun |
| POST | /api/akun/status | Set status akun |
| GET | /api/grup | Daftar grup |
| POST | /api/grup/fetch | Fetch grup dari Telegram |
| POST | /api/grup/status | Set status grup |
| GET | /api/draft | Daftar draft |
| POST | /api/draft | Simpan draft |
| GET | /api/antrian | Daftar antrian |
| POST | /api/antrian | Tambah antrian |
| POST | /api/antrian/:id/kirim | Kirim dari antrian |
| POST | /api/pesan/kirim | Kirim langsung |
| GET | /api/riwayat | Riwayat hari ini |
| GET | /api/riwayat/ringkasan | Ringkasan hari ini |
