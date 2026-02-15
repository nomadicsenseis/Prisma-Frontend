import requests
import json

try:
    response = requests.get('http://localhost:8001/openapi.json')
    response.raise_for_status()
    with open('openapi_response.json', 'w', encoding='utf-8') as f:
        json.dump(response.json(), f, indent=2)
    print("OpenAPI spec saved to openapi_response.json")
except Exception as e:
    print(f"Error fetching OpenAPI: {e}")
