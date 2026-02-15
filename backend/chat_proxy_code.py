@app.route('/api/chat-proxy', methods=['POST'])
def chat_proxy():
    """Proxy requests to the external agent service to avoid CORS issues"""
    try:
        data = request.json
        agent_url = "http://localhost:8001/api/chat"
        
        # Forward the request to the agent
        resp = requests.post(agent_url, json=data)
        
        # Return the agent's response
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Agent service unreachable"}), 503
    except Exception as e:
        print(f"Error in chat proxy: {e}")
        return jsonify({"error": str(e)}), 500
