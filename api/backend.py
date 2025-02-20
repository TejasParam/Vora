from flask import Flask, jsonify, Request

app = Flask(__name__)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return jsonify({"message": "API is working!", "path": path})

def handler(request: Request):
    """Handle incoming requests."""
    with app.request_context(request):
        return app