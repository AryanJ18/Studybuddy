from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Summary(BaseModel):
    totalTime: int
    focusedTime: int
    totalWastedTime: int
    eyesClosedCount: int
    phoneCount: int
    distractionCount: int

@app.post("/report")
async def generate_report(data: Summary):
    print(data)

    return {
        "message": "Report received successfully",
        "data": data
    }