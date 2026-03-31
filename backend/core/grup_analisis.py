# Analisis grup — fetch last chat, hitung score
from utils.storage_db import update_last_chat_grup
from utils.database import get_conn
from core.scoring import update_score_grup

async def fetch_last_chat(client, grup_id: int) -> str:
    try:
        msgs = await client.get_messages(int(grup_id), limit=1)
        if msgs and msgs[0].date:
            waktu = msgs[0].date.strftime("%Y-%m-%d %H:%M")
            update_last_chat_grup(grup_id, waktu)
            return waktu
    except: pass
    return None

def get_semua_analisis() -> list:
    conn = get_conn()
    rows = conn.execute("""
        SELECT * FROM grup ORDER BY score DESC, jumlah_member DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_semua_score():
    conn = get_conn()
    ids  = [r["id"] for r in conn.execute("SELECT id FROM grup").fetchall()]
    conn.close()
    for gid in ids:
        update_score_grup(gid)
