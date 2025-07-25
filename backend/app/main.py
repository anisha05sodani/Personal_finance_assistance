from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth_router, category_router, transaction_router, upload_router, stats_router, user_router

app = FastAPI()

# Enable CORS for all origins (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(category_router)
app.include_router(transaction_router)
app.include_router(upload_router)
app.include_router(stats_router)
app.include_router(user_router)

@app.get("/")
def read_root():
    return {"message": "Personal Finance Assistant API"} 