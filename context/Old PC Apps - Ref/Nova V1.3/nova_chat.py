import requests

from config import MODEL_NAME, OLLAMA_URL
from memory import load_memory, save_memory, extract_fact
from intent import detect_intent
from guardian import reality_check
from prompt_builder import build_prompt
from ethics import ethical_note, style_fix

# 👇 HIER MUSS ES SEIN
with open("system_prompt.txt", "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

# =========================
# INIT
# =========================
memory = load_memory()

print("Nova V1.4 gestartet (Clean Architecture) - exit zum Beenden")

# =========================
# MAIN LOOP
# =========================
while True:

    user_input = input("\nDu: ")

    if user_input.lower() == "exit":
        print("Nova: System beendet.")
        break

    # =========================
    # GUARDIAN CHECK (NO OUTPUT)
    # =========================
    if reality_check(user_input):
        print("\nNova: Anfrage blockiert durch Sicherheitslayer.")
        continue

    # =========================
    # INTENT
    # =========================
    intent = detect_intent(user_input)
    print(f"[Intent: {intent}]")

    # =========================
    # MEMORY UPDATE
    # =========================
    memory["conversation"].append({
        "role": "user",
        "content": user_input
    })

    extract_fact(user_input, memory)

    # =========================
    # PROMPT BUILD
    # =========================
    messages = build_prompt(SYSTEM_PROMPT, intent, memory, user_input)

    # =========================
    # OLLAMA CALL
    # =========================
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "stream": False
            }
        )

        data = response.json()
        answer = data["message"]["content"]

        # =========================
        # ETHICS + STYLE
        # =========================
        answer = ethical_note(answer)
        answer = style_fix(answer)

        print("\nNova:", answer)

        # =========================
        # MEMORY SAVE
        # =========================
        memory["conversation"].append({
            "role": "assistant",
            "content": answer
        })

        save_memory(memory)

    except Exception as e:
        print("Fehler:", e)