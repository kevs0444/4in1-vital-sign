from flask import Blueprint, jsonify

bp = Blueprint("main", __name__)

@bp.route("/status", methods=["GET"])
def status():
    return jsonify({"status": "Backend Connected ✅"})
