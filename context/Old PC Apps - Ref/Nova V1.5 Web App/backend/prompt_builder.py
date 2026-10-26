def safe_fact(f):
    if isinstance(f, dict):
        return f.get("text", "")
    return str(f)


def build_prompt(system_prompt, intent, memory, user_input):

    # =========================
    # FACTS (HARD MODE)
    # =========================
    facts_text = "\n".join(
        safe_fact(f)
        for f in memory["facts"][-10:]
    )

    if not facts_text:
        facts_text = "KEINE FAKTEN GESPEICHERT"

    # =========================
    # SYSTEM STATE
    # =========================
    state = memory.get("system_state", {})

    state_text = f"""
SYSTEM STATUS:
- Version: {state.get('version', 'unknown')}
- Model: {state.get('model', 'unknown')}
"""

    # =========================
    # SYSTEM MESSAGE
    # =========================
    system_message = {
        "role": "system",
        "content": (
            system_prompt +
            f"\n\nINTENT: {intent}\n"
            f"\n{state_text}\n"
            f"\nWICHTIGE FAKTEN ÜBER USER (HARD MEMORY - DO NOT GUESS):\n{facts_text}\n"
            f"\nREGEL:\n"
            f"Du darfst ausschließlich diese Fakten verwenden.\n"
            f"Wenn etwas nicht vorhanden ist: 'Nicht im Memory gespeichert.'"
        )
    }

    # =========================
    # CHAT HISTORY
    # =========================
    messages = [system_message]
    messages += memory["conversation"][-6:]

    # =========================
    # CURRENT USER INPUT
    # =========================
    messages.append({
        "role": "user",
        "content": user_input
    })

    return messages