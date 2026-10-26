from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from nova_core import generate_response, load_memory, save_memory

app = FastAPI()

# CORS (wichtig für Browser)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory = load_memory()


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
def chat(req: ChatRequest):

    response = generate_response(req.message, memory)

    save_memory(memory)

    return {"response": response}