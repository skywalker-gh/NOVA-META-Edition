from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Nova V2 Backend",
    description="Backend API for Nova AI System",
    version="0.1"
)

# CORS -> erlaubt später Zugriff vom Browser (Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # später einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# TEST ROUTE
@app.get("/")
def root():
    return {"message": "Nova Backend is running 🚀"}


# CHAT ROUTE (noch fake)
@app.post("/chat")
def chat():
    return {
        "response": "Nova Backend ist bereit. Chat-System kommt im nächsten Schritt."
    }