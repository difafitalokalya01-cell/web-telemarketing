from dotenv import load_dotenv
import os

load_dotenv()

API_ID   = int(os.getenv("API_ID", "0"))
API_HASH = os.getenv("API_HASH", "")

def get_session_name(phone: str) -> str:
    bersih = phone.replace("+", "").replace(" ", "")
    return f"session/akun_{bersih}"
