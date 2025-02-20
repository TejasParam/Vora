from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "API is working!"})

def handler(request):
    return app(request)