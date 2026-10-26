import json
import os

FILE = "memory.json"


def load_memory():
    if not os.path.exists(FILE):
        return {
            "conversation": [],
            "facts": [],
            "summary": "",
            "system_state": {
                "version": "v1.4",
                "model": "llama3.2:3b"
            }
        }

    with open(FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # BACKWARD COMPATIBILITY FIX
    if "system_state" not in data:
        data["system_state"] = {
            "version": "v1.4",
            "model": "llama3.2:3b"
        }

    return data


def save_memory(memory):
    with open(FILE, "w", encoding="utf-8") as f:
        json.dump(memory, f, indent=4, ensure_ascii=False)


def extract_fact(user_input, memory):

    text = user_input.strip().lower()

    triggers = ["ich bin", "mein name", "ich habe", "ich will", "ich arbeite", "ich wohne"]

    if any(t in text for t in triggers):
        memory["facts"].append({
            "text": user_input,
            "type": "fact"
        })