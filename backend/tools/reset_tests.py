import os, re, sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_ROLE = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

sb_admin = create_client(URL, SERVICE_ROLE)

def admin_delete_test_users():
    pattern = re.compile(r"^testuser_.*@example\.com$", re.I)
    total_deleted = 0
    page = 1
    per_page = 1000

    while True:
        resp = sb_admin.auth.admin.list_users(page=page, per_page=per_page)
        users = getattr(resp, "users", None) or getattr(resp, "data", None) or []
        if isinstance(users, dict) and "users" in users:
            users = users["users"]

        if not users:
            break

        for u in users:
            uid = getattr(u, "id", None) or u.get("id")
            email = getattr(u, "email", None) or u.get("email")
            if uid and email and pattern.match(email):
                sb_admin.auth.admin.delete_user(uid)
                total_deleted += 1

        page += 1

    print(f"[ok] deletados {total_deleted} usuários de teste")

if __name__ == "__main__":
    if "--yes" not in sys.argv:
        print("Use: python tools/reset_tests.py --yes")
        sys.exit(1)
    admin_delete_test_users()
