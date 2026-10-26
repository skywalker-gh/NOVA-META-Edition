import requests
import json
import os

# -----------------------------
# SYSTEM PROMPT
# -----------------------------
SYSTEM_PROMPT = """
Du bist NOVA, die Analyseinstanz des Yggdrasil-Systems.

Du antwortest klar, strukturiert und ehrlich.
Du hilfst beim Denken, Planen und Programmieren.

Regeln:
- keine Fantasie als Fakt
- Nutzer entscheidet, Nova berät
- kurz und verständlich bleiben
"""

# -----------------------------
# MEMORY SETUP
# -----------------------------
MEMORY_FILE = "memory.json"

def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return {
            "conversation": [],
            "important_facts": [],
            "summary": "",
            "user_profile": {
                "name": "",
                "language": "de",
                "interests": []
            },
            "system_state": {
                "mode": "speed",
                "model": "llama3.2:3b"
            }
        }

    with open(MEMORY_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Safety Fix
    if "conversation" not in data:
        data["conversation"] = []
    if "important_facts" not in data:
        data["important_facts"] = []
    if "summary" not in data:
        data["summary"] = ""

    return data


def save_memory(memory):
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(memory, f, indent=4, ensure_ascii=False)


# -----------------------------
# MEMORY INTELLIGENCE
# -----------------------------
def extract_memory(memory, user_input, answer):
    text = (user_input + " " + answer).lower()

    keywords = [
        "projekt", "name", "lerne", "wichtig",
        "plane", "ziel", "will", "bauen"
    ]

    if any(k in text for k in keywords):
        memory["important_facts"].append({
            "user": user_input,
            "assistant": answer
        })

    # einfache Auto-Zusammenfassung
    if len(memory["conversation"]) % 10 == 0:
        memory["summary"] = answer[:300]


# -----------------------------
# INIT
# -----------------------------
memory = load_memory()

print("Nova V1 Memory Upgrade gestartet - exit zum Beenden")

# -----------------------------
# CHAT LOOP
# -----------------------------
while True:
    user_input = input("\nDu: ")

    if user_input.lower() == "exit":
        print("Nova: System beendet.")
        break

    # Save user message
    memory["conversation"].append({
        "role": "user",
        "content": user_input
    })

    try:
        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "llama3.2:3b",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT}
                ] + memory["conversation"][-8:],
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_ctx": 2048
                }
            }
        )

        data = response.json()
        answer = data.get("message", {}).get("content", str(data))

        print("\nNova:", answer)

        # Save assistant message
        memory["conversation"].append({
            "role": "assistant",
            "content": answer
        })

        # 🧠 MEMORY INTELLIGENCE
        extract_memory(memory, user_input, answer)

        # SAVE
        save_memory(memory)

    except Exception as e:
        print("\nNova: Fehler beim Verbinden.")
        print("Details:", e)