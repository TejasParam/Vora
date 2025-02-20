from flask import Flask, jsonify, Request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "API is working!"})

@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello from Python backend!"})

def handler(request):
    """Handle incoming requests."""
    return app(request)