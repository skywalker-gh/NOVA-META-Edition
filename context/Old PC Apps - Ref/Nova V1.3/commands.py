def handle_command(text, memory):

    t = text.lower().strip()

    if t == "systemstatus":
        return True, "Nova V1.3 | System OK | Ollama connected"

    if t in ["öffne meine memory", "zeige memory"]:
        return True, str(memory)

    if t == "memory löschen":
        memory["conversation"] = []
        return True, "Memory gelöscht"

    return False, None