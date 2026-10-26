import requests

response = requests.post(
    "http://localhost:11434/api/chat",
    json={
        "model": "llama3",
        "messages": [
            {"role": "user", "content": "Hallo"}
        ],
        "stream": False
    }
)

print(response.json())