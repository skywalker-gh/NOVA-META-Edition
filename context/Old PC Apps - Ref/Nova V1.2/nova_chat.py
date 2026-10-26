import requests
import json
import os

# =========================
# LOAD SYSTEM PROMPT
# =========================
with open("system_prompt.txt", "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

# =========================
# MEMORY
# =========================
MEMORY_FILE = "memory.json"

def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return {
            "conversation": [],
            "important_facts": []
        }

    with open(MEMORY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_memory(memory):
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(memory, f, indent=4, ensure_ascii=False)

memory = load_memory()

# =========================
# INTENT LAYER
# =========================
def detect_intent(text):
    text = text.lower()

    if any(k in text for k in ["code", "python", "fehler", "bug"]):
        return "coding"
    if any(k in text for k in ["wie", "warum", "erkläre"]):
        return "learning"
    if any(k in text for k in ["idee", "bauen", "create"]):
        return "creative"
    if any(k in text for k in ["problem", "geht nicht", "error"]):
        return "problem"

    return "chat"

# =========================
# STYLE LAYER
# =========================
def style(intent):
    if intent == "coding":
        return "technisch, präzise"
    if intent == "learning":
        return "didaktisch"
    if intent == "problem":
        return "ruhig, lösungsorientiert"
    if intent == "creative":
        return "offen, kreativ"
    return "neutral freundlich"

# =========================
# CHAT LOOP
# =========================
print("Nova V1.2 Stable gestartet - exit zum Beenden")

while True:
    user_input = input("\nDu: ")

    if user_input.lower() == "exit":
        print("Nova: System beendet.")
        break

    intent = detect_intent(user_input)
    tone = style(intent)

    print(f"[Intent: {intent} | Style: {tone}]")

    memory["conversation"].append({
        "role": "user",
        "content": user_input
    })

    system_context = f"""
STIL:
- Ton: {tone}
"""

    try:
        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "llama3.2:3b",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT + system_context}
                ] + memory["conversation"][-6:],
                "stream": False
            }
        )

        data = response.json()
        answer = data["message"]["content"]

        print("\nNova:", answer)

        memory["conversation"].append({
            "role": "assistant",
            "content": answer
        })

        save_memory(memory)

    except Exception as e:
        print("Fehler:", e)