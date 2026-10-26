def reality_check(user_input):
    risky_keywords = [
        "hack", "exploit", "illegal", "steal", "virus"
    ]

    text = user_input.lower()

    for k in risky_keywords:
        if k in text:
            return True

    return False