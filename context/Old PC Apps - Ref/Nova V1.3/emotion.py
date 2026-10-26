def tone(intent):
    if intent == "coding":
        return "technisch"
    if intent == "learning":
        return "klar erklärend"
    if intent == "creative":
        return "offen kreativ"
    return "neutral"