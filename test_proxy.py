import requests
import json

url = "http://localhost:5000/api/chat-proxy"
payload = {
    "message": "Hola, ¿quién eres?",
    "conversation_id": None
}

try:
    print(f"Sending POST request to {url}...")
    response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    else:
        print("Error Response:")
        print(response.text)

except Exception as e:
    print(f"Request failed: {e}")
