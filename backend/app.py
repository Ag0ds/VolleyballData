import os
from functools import wraps
from flask import Flask, request, jsonify, g
from supabase import create_client
from dotenv import load_dotenv
import jwt
from postgrest.exceptions import APIError

load_dotenv()

def getenv_required(key: str, default: str | None = None) -> str:
    val = os.getenv(key, default)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return val

SUPABASE_URL = getenv_required("SUPABASE_URL").rstrip("/")
SUPABASE_ANON_KEY = getenv_required("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = getenv_required("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_JWT_SECRET = getenv_required("SUPABASE_JWT_SECRET")

def extract_bearer(header: str | None):
    if not header:
        return None
    parts = header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None

def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = extract_bearer(request.headers.get("Authorization"))
        if not token:
            return jsonify({"error": "missing bearer token"}), 401

        try:
            hdr = jwt.get_unverified_header(token)
            alg = hdr.get("alg")
        except Exception as e:
            return jsonify({"error": "invalid token header", "detail": str(e)}), 401

        try:
            if alg == "HS256":
                claims = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={
                        "verify_exp": True,
                        "verify_aud": False,
                        "require": ["sub"],
                    },
                )
                g.user_id = claims["sub"]
                g.access_token = token
                g.sb.postgrest.auth(token)

            else:
                g.sb.postgrest.auth(token)
                resp = g.sb.auth.get_user(token)
                user = getattr(resp, "user", None)
                if not user or not getattr(user, "id", None):
                    return jsonify({"error": "invalid token"}), 401
                g.user_id = user.id
                g.access_token = token

        except Exception as e:
            return jsonify({"error": "invalid token", "detail": str(e)}), 401

        return fn(*args, **kwargs)
    return wrapper

def create_app():
    app = Flask(__name__)

    @app.before_request
    def build_supabase_clients():
        g.sb = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        try:
            g.sb.postgrest.session.headers.pop("Authorization", None)
        except Exception:
            pass
        token = extract_bearer(request.headers.get("Authorization"))
        if token:
            g.sb.postgrest.auth(token)
        g.sb_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    @app.post("/auth/signup")
    def signup():
        payload = request.get_json(force=True)
        email = payload.get("email")
        password = payload.get("password")
        full_name = payload.get("full_name")
        if not email or not password:
            return jsonify({"error": "email and password are required"}), 400

        res = g.sb.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"full_name": full_name}}
        })
        return jsonify({
            "user": getattr(res, "user", None).model_dump() if getattr(res, "user", None) else None,
            "session": getattr(res, "session", None).model_dump() if getattr(res, "session", None) else None
        }), 201

    @app.post("/auth/login")
    def login():
        payload = request.get_json(force=True)
        email = payload.get("email")
        password = payload.get("password")
        if not email or not password:
            return jsonify({"error": "email and password are required"}), 400

        res = g.sb.auth.sign_in_with_password({"email": email, "password": password})
        if not res or not res.session:
            return jsonify({"error": "invalid credentials"}), 401

        return jsonify({
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user": res.user.model_dump()
        })

    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    @app.get("/me")
    @require_auth
    def me():
        try:
            q = g.sb.table("profiles").select("*").eq("id", g.user_id).single().execute()
            profile = q.data
        except Exception:
            profile = None
        return jsonify({"user_id": g.user_id, "profile": profile}), 200

    @app.post("/teams")
    @require_auth
    def create_team():
        body = request.get_json(force=True)
        name = body.get("name")
        is_ours = body.get("is_ours", True)
        if not name:
            return jsonify({"error": "name is required"}), 400

        response = g.sb.table("teams").insert({
            "name": name,
            "is_ours": is_ours,
            "created_by": g.user_id
        }).execute()

        if getattr(response, "error", None):
            return jsonify({"error": response.error.message}), 400

        inserted_team = response.data[0]

        return jsonify(inserted_team), 201

    @app.get("/teams")
    @require_auth
    def list_teams():
        teams = g.sb.table("teams").select("*").order("created_at", desc=True).execute()
        return jsonify(teams.data), 200

    @app.post("/teams/<team_id>/members")
    @require_auth
    def add_member(team_id):
        body = request.get_json(force=True)
        user_id = body.get("user_id")
        role = body.get("role", "analyst")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        if not _is_team_staff_or_creator(team_id):
            return jsonify({"error": "forbidden"}), 403

        try:
            ins = g.sb_admin.table("team_members").insert({
                "team_id": team_id,
                "user_id": user_id,
                "role": role
            }).execute()
            return jsonify(ins.data[0] if ins.data else {"ok": True}), 201
        except APIError as e:
            return jsonify({"error": e.message, "code": e.code}), 400
    
    @app.post("/sessions")
    @require_auth
    def create_session():
        body = request.get_json(force=True)
        team_id = body.get("team_id")
        if not team_id:
            return jsonify({"error": "team_id is required"}), 400

        payload = {
            "team_id": team_id,
            "opponent_team_id": body.get("opponent_team_id"),
            "opponent_name": body.get("opponent_name"),
            "kind": body.get("kind", "training"),
            "eval_level": body.get("eval_level", "simple"),
            "best_of": body.get("best_of", 5),
            "status": body.get("status", "open"),
            "created_by": g.user_id
        }
        res = g.sb.table("sessions").insert(payload).execute()
        if getattr(res, "error", None):
            return jsonify({"error": res.error.message}), 400
        return jsonify(res.data[0]), 201

    @app.get("/sessions")
    @require_auth
    def list_sessions():
        q = g.sb.table("sessions").select("*").order("started_at", desc=True).execute()
        if getattr(q, "error", None):
            return jsonify({"error": q.error.message}), 400
        return jsonify(q.data), 200

    @app.patch("/sessions/<session_id>")
    @require_auth
    def update_session(session_id):
        body = request.get_json(force=True)
        allowed = {"status", "eval_level", "opponent_name", "best_of"}
        update_data = {k: v for k, v in body.items() if k in allowed}
        if not update_data:
            return jsonify({"error": "no valid fields to update"}), 400

        res = g.sb.table("sessions").update(update_data).eq("id", session_id).execute()
        if getattr(res, "error", None):
            return jsonify({"error": res.error.message}), 400
        sel = g.sb.table("sessions").select("*").eq("id", session_id).single().execute()
        if getattr(sel, "error", None):
            return jsonify({"error": sel.error.message}), 400
        return jsonify(sel.data), 200


    @app.post("/events")
    @require_auth
    def create_event():
        body = request.get_json(force=True)
        required = ("session_id", "team_side", "kind")
        if any(not body.get(k) for k in required):
            return jsonify({"error": "session_id, team_side and kind are required"}), 400

        payload = {
            "session_id": body["session_id"],
            "team_side": body["team_side"],
            "player_id": body.get("player_id"),
            "opponent_number": body.get("opponent_number"),
            "kind": body["kind"], 
            "result": body.get("result"),
            "notes": body.get("notes"),
            "meta": body.get("meta") or {},
            "created_by": g.user_id
        }
        if "set_no" in body and body["set_no"] is not None:
            payload["set_no"] = int(body["set_no"])
        try:
            res = g.sb.table("events").insert(payload).execute()
            return jsonify(res.data[0]), 201
        except APIError as e:
            status = 403 if e.code == "42501" else 400
            return jsonify({
                "error": e.message,
                "code": e.code,
                "details": getattr(e, "details", None),
                "hint": getattr(e, "hint", None),
            }), status


    @app.get("/events")
    @require_auth
    def list_events():
        session_id = request.args.get("session_id")
        if not session_id:
            return jsonify({"error": "session_id is required"}), 400

        after = request.args.get("after", type=int)
        limit = request.args.get("limit", default=100, type=int)
        limit = max(1, min(500, limit))

        qb = g.sb.table("events").select("*").eq("session_id", session_id)
        if after is not None:
            qb = qb.gt("event_seq", after)
        qb = qb.order("event_seq", desc=False).limit(limit)

        res = qb.execute()
        if getattr(res, "error", None):
            return jsonify({"error": res.error.message}), 400
        return jsonify(res.data), 200
    
    @app.post("/players")
    @require_auth
    def create_player():
        body = request.get_json(force=True)
        team_id = body.get("team_id")
        name = body.get("name")
        if not team_id or not name:
            return jsonify({"error": "team_id and name are required"}), 400

        payload = {
            "team_id": team_id,
            "name": name,
            "created_by": g.user_id,
        }
        for opt in ("number", "position", "height_cm", "dominant_hand"):
            if opt in body and body[opt] is not None:
                payload[opt] = body[opt]
        try:
            res = g.sb.table("players").insert(payload).execute()
            return jsonify(res.data[0]), 201
        except APIError as e:
            status = 403 if e.code == "42501" else 400
            return jsonify({"error": e.message, "code": e.code}), status

    @app.get("/players")
    @require_auth
    def list_players():
        team_id = request.args.get("team_id")
        if not team_id:
            return jsonify({"error": "team_id is required"}), 400
        try:
            q = g.sb.table("players").select("*").eq("team_id", team_id).order("number", desc=False).execute()
            return jsonify(q.data), 200
        except APIError as e:
            status = 403 if e.code == "42501" else 400
            return jsonify({"error": e.message, "code": e.code}), status

    @app.patch("/players/<player_id>")
    @require_auth
    def update_player(player_id):
        body = request.get_json(force=True)
        allowed = {"name", "number", "position", "height_cm", "dominant_hand"}
        updates = {k: v for k, v in body.items() if k in allowed}
        if not updates:
            return jsonify({"error": "no valid fields to update"}), 400
        try:
            g.sb.table("players").update(updates).eq("id", player_id).execute()
            sel = g.sb.table("players").select("*").eq("id", player_id).single().execute()
            return jsonify(sel.data), 200
        except APIError as e:
            status = 403 if e.code == "42501" else 400
            return jsonify({"error": e.message, "code": e.code}), status

    @app.delete("/players/<player_id>")
    @require_auth
    def delete_player(player_id):
        try:
            g.sb.table("players").delete().eq("id", player_id).execute()
            return jsonify({"ok": True}), 200
        except APIError as e:
            status = 403 if e.code == "42501" else 400
            return jsonify({"error": e.message, "code": e.code}), status
        
    def _is_team_staff_or_creator(team_id: str) -> bool:
        m = g.sb.table("team_members").select("role").eq("team_id", team_id).eq("user_id", g.user_id).maybe_single().execute()
        role = (m.data or {}).get("role") if isinstance(m.data, dict) else None
        if role in ("owner", "coach"):
            return True
        t = g.sb.table("teams").select("created_by").eq("id", team_id).single().execute()
        return (t.data or {}).get("created_by") == g.user_id

    @app.get("/teams/<team_id>/members")
    @require_auth
    def list_members(team_id):
        if not _is_team_staff_or_creator(team_id):
            return jsonify({"error": "forbidden"}), 403
        q = g.sb_admin.table("team_members").select("user_id, role, team_id").eq("team_id", team_id).order("role", desc=False).execute()
        return jsonify(q.data), 200


    @app.delete("/teams/<team_id>/members/<member_user_id>")
    @require_auth
    def remove_member(team_id, member_user_id):
        if not _is_team_staff_or_creator(team_id):
            return jsonify({"error": "forbidden"}), 403
        try:
            g.sb_admin.table("team_members").delete().eq("team_id", team_id).eq("user_id", member_user_id).execute()
            return jsonify({"ok": True}), 200
        except APIError as e:
            return jsonify({"error": e.message, "code": e.code}), 400
        
    @app.get("/sessions/<session_id>/score")
    @require_auth
    def get_session_score(session_id):
        try:
            res = g.sb.rpc("session_score", {"p_session_id": session_id}).execute()
            return jsonify(res.data), 200
        except APIError as e:
            status = 403 if e.code == "42501" else 400
            return jsonify({"error": e.message, "code": e.code}), status

    @app.get("/sessions/<session_id>/boxscore")
    @require_auth
    def get_session_boxscore(session_id):
        try:
            res = g.sb.rpc("player_boxscore", {"p_session_id": session_id}).execute()
            return jsonify(res.data), 200
        except APIError as e:
            status = 403 if e.code == "42501" else 400
            return jsonify({"error": e.message, "code": e.code}), status

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(port=5000, debug=True)
