import requests
from config import MODEL_NAME, OLLAMA_URL
from memory import load_memory, save_memory, extract_fact
from intent import detect_intent
from prompt_builder import build_prompt
from ethics import ethical_note


SYSTEM_PROMPT = open("system_prompt.txt", "r", encoding="utf-8").read()


def generate_response(user_input, memory):

    intent = detect_intent(user_input)

    # Memory update
    memory["conversation"].append({
        "role": "user",
        "content": user_input
    })

    extract_fact(user_input, memory)

    messages = build_prompt(SYSTEM_PROMPT, intent, memory, user_input)

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

    answer = ethical_note(answer)

    memory["conversation"].append({
        "role": "assistant",
        "content": answer
    })

    return answer