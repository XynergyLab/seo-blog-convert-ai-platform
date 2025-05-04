from flask import Blueprint, jsonify

bp = Blueprint('api', __name__)

@bp.route('/health')
def health_check():
    """Basic health check endpoint for the API."""
    return jsonify({"status": "ok"})

