from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from google import genai  # <-- Updated Import
from dotenv import load_dotenv

# uvicorn main:app --reload
import os

load_dotenv()

app = FastAPI()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

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

    prompt = f"""
    You are an AI productivity coach.

    Analyze this focus session:

    Total Time: {data.totalTime / 60000:.2f} minutes
    Focused Time: {data.focusedTime} ms
    Wasted Time: {data.totalWastedTime} ms

    Eyes Closed: {data.eyesClosedCount}
    Phone Usage: {data.phoneCount}
    Distractions: {data.distractionCount}

    Give:
    1. A short performance summary
    2. One key weakness
    3. One actionable improvement tip
    Keep it concise.
    """


    response = await client.aio.models.generate_content(model="gemini-2.5-flash",contents=prompt)

    return {
        "report": response.text
    }