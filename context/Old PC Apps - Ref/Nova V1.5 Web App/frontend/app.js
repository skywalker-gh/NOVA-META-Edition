async function send() {

    const input = document.getElementById("input");
    const chatbox = document.getElementById("chatbox");

    const message = input.value;

    chatbox.innerHTML += "<div><b>Du:</b> " + message + "</div>";

    input.value = "";

    const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
    });

    const data = await res.json();

    chatbox.innerHTML += "<div><b>Nova:</b> " + data.response + "</div>";
}