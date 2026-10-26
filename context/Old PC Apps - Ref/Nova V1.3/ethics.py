def ethical_note(text):
    # nur future use (noch passiv)
    return text


def style_fix(text):
    unwanted = [
        "ich bin ein KI-system",
        "als ki modell",
        "ich habe keine gefühle"
    ]

    for u in unwanted:
        text = text.replace(u, "")

    return text.strip()