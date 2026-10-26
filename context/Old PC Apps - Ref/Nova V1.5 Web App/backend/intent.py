def detect_intent(text):
    t = text.lower()

    if any(x in t for x in ["code", "fehler", "python"]):
        return "coding"
    if any(x in t for x in ["wie", "warum", "erkläre"]):
        return "learning"
    if any(x in t for x in ["idee", "bauen", "create"]):
        return "creative"
    return "chat"