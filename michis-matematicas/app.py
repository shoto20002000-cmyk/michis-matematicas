from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from bson import ObjectId
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "michis-super-secret-2026")

# ── MongoDB ──────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/michis")
client = MongoClient(MONGO_URI)
db = client["michis_matematicas"]
users_col = db["users"]
scores_col = db["scores"]

# ── Helpers ──────────────────────────────────────────────────
def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    return users_col.find_one({"_id": ObjectId(uid)})

def serialize(doc):
    """Convert MongoDB doc to JSON-safe dict."""
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    return doc

# ── Pages ─────────────────────────────────────────────────────
@app.route("/")
def index():
    user = current_user()
    return render_template("index.html", user=user)

@app.route("/dashboard")
def dashboard():
    user = current_user()
    if not user:
        return redirect(url_for("login_page"))
    # Top 10 global scores
    top_scores = list(scores_col.find().sort("score", -1).limit(10))
    for s in top_scores:
        s["_id"] = str(s["_id"])
    # User's personal best
    personal = list(scores_col.find({"user_id": str(user["_id"])}).sort("score", -1).limit(5))
    for p in personal:
        p["_id"] = str(p["_id"])
    return render_template("dashboard.html", user=user, top_scores=top_scores, personal=personal)

@app.route("/login")
def login_page():
    if current_user():
        return redirect(url_for("index"))
    return render_template("login.html")

@app.route("/register")
def register_page():
    if current_user():
        return redirect(url_for("index"))
    return render_template("register.html")

# ── Auth API ──────────────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    email    = data.get("email", "").strip().lower()

    if not username or not password or not email:
        return jsonify({"ok": False, "msg": "Todos los campos son obligatorios."}), 400
    if len(username) < 3:
        return jsonify({"ok": False, "msg": "El usuario debe tener al menos 3 caracteres."}), 400
    if len(password) < 6:
        return jsonify({"ok": False, "msg": "La contraseña debe tener al menos 6 caracteres."}), 400
    if users_col.find_one({"username": username}):
        return jsonify({"ok": False, "msg": "Ese nombre de usuario ya está en uso."}), 409
    if users_col.find_one({"email": email}):
        return jsonify({"ok": False, "msg": "Ese correo ya está registrado."}), 409

    user_id = users_col.insert_one({
        "username": username,
        "email":    email,
        "password": generate_password_hash(password),
        "avatar":   data.get("avatar", "😺"),
        "created":  datetime.utcnow(),
        "total_games": 0,
        "total_score": 0,
    }).inserted_id

    session["user_id"] = str(user_id)
    return jsonify({"ok": True, "redirect": "/"})

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    user = users_col.find_one({"username": username})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"ok": False, "msg": "Usuario o contraseña incorrectos."}), 401
    session["user_id"] = str(user["_id"])
    return jsonify({"ok": True, "redirect": "/"})

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True, "redirect": "/"})

# ── Scores API ────────────────────────────────────────────────
@app.route("/api/score", methods=["POST"])
def api_score():
    data = request.get_json()
    user = current_user()
    entry = {
        "score":      data.get("score", 0),
        "mode":       data.get("mode", "practice"),
        "operation":  data.get("operation", "suma"),
        "difficulty": data.get("difficulty", "easy"),
        "correct":    data.get("correct", 0),
        "total":      data.get("total", 0),
        "date":       datetime.utcnow(),
    }
    if user:
        entry["user_id"]  = str(user["_id"])
        entry["username"] = user["username"]
        entry["avatar"]   = user.get("avatar", "😺")
        users_col.update_one(
            {"_id": user["_id"]},
            {"$inc": {"total_games": 1, "total_score": entry["score"]}}
        )
    else:
        entry["user_id"]  = "guest"
        entry["username"] = "Invitado"
        entry["avatar"]   = "🐾"

    scores_col.insert_one(entry)
    return jsonify({"ok": True})

@app.route("/api/leaderboard")
def api_leaderboard():
    top = list(scores_col.find(
        {"user_id": {"$ne": "guest"}},
        {"_id": 0, "username": 1, "score": 1, "avatar": 1, "difficulty": 1, "date": 1}
    ).sort("score", -1).limit(10))
    for t in top:
        t["date"] = t["date"].strftime("%d/%m/%Y") if "date" in t else ""
    return jsonify(top)

# ── Run ───────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
