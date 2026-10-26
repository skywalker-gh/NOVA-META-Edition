import requests
import json
import os

# -----------------------------
# SYSTEM PROMPT
# -----------------------------
SYSTEM_PROMPT = """
Du bist NOVA, eine lokale Assistenzinstanz des Yggdrasil-Systems.

Du antwortest klar, strukturiert und ehrlich.

REGELN:
- keine Fantasie als Fakt
- Nutzer entscheidet
- hilf beim Denken und Programmieren
"""

# -----------------------------
# INTENT LAYER (V1.1)
# -----------------------------
def detect_intent(user_input: str):
    text = user_input.lower()

    if any(k in text for k in ["python", "code", "fehler", "bug", "error", "script", "api"]):
        return "coding"

    if any(k in text for k in ["was ist", "wie funktioniert", "erkläre", "warum", "why"]):
        return "learning"

    if any(k in text for k in ["idee", "story", "design", "bild", "create", "bauen"]):
        return "creative"

    if any(k in text for k in ["mach", "erstelle", "bau", "install", "run", "start"]):
        return "task"

    if any(k in text for k in ["geht nicht", "fehler", "problem", "kaputt", "crash"]):
        return "problem"

    return "chat"


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
            "user_profile": {},
            "system_state": {
                "model": "llama3.2:3b",
                "mode": "v1.1"
            }
        }

    with open(MEMORY_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "conversation" not in data:
        data["conversation"] = []
    if "important_facts" not in data:
        data["important_facts"] = []

    return data


def save_memory(memory):
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(memory, f, indent=4, ensure_ascii=False)


# -----------------------------
# INIT
# -----------------------------
memory = load_memory()

print("Nova V1.1 gestartet (Intent Layer aktiv) - exit zum Beenden")

# -----------------------------
# CHAT LOOP
# -----------------------------
while True:
    user_input = input("\nDu: ")

    if user_input.lower() == "exit":
        print("Nova: System beendet.")
        break

    # 🧠 Intent erkennen
    intent = detect_intent(user_input)
    print(f"[Intent erkannt: {intent}]")

    # Memory speichern (User)
    memory["conversation"].append({
        "role": "user",
        "content": user_input,
        "intent": intent
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

        # Memory speichern (Assistant)
        memory["conversation"].append({
            "role": "assistant",
            "content": answer,
            "intent": intent
        })

        save_memory(memory)

    except Exception as e:
        print("\nNova: Fehler beim Verbinden.")
        print("Details:", e)