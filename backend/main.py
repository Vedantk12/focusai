# main.py
# Runs from inside the backend/ folder.
# All imports are direct — no "backend." prefix.

import sys
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

import database as db_module
from routes.auth_routes import router as auth_router
from routes.log_routes  import router as log_router

app = FastAPI(
    title       = "FocusAI API",
    description = "AI-powered digital addiction detection and prevention",
    version     = "2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    db_module.init_db()

app.include_router(auth_router)
app.include_router(log_router)

@app.get("/", tags=["Root"])
def root():
    return {"app": "FocusAI API", "version": "2.0.0", "status": "running"}

@app.get("/health", tags=["Root"])
def health():
    return {"status": "healthy"}

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title="FocusAI API", version="2.0.0",
        description="AI-powered digital addiction detection and prevention",
        routes=app.routes,
    )
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
    }
    for path in schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema

app.openapi = custom_openapi