# main.py
# Entry point of the FocusAI backend server.

import sys
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from backend.routes.auth_routes import router as auth_router
from backend.routes.log_routes  import router as log_router

# -------------------------------------------------------
# CREATE THE APP
# -------------------------------------------------------

app = FastAPI(
    title       = "FocusAI API",
    description = "AI-powered digital addiction detection and prevention",
    version     = "1.0.0"
)

# -------------------------------------------------------
# CORS MIDDLEWARE
# -------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# -------------------------------------------------------
# ATTACH ROUTERS
# -------------------------------------------------------

app.include_router(auth_router)
app.include_router(log_router)

# -------------------------------------------------------
# ROOT ROUTES
# -------------------------------------------------------

@app.get("/", tags=["Root"])
def root():
    return {
        "app":     "FocusAI API",
        "version": "1.0.0",
        "status":  "running",
        "docs":    "/docs"
    }

@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "healthy"}

# -------------------------------------------------------
# ADD AUTHORIZE BUTTON TO SWAGGER UI
# This tells FastAPI our API uses Bearer token authentication
# which makes the Authorize button appear in the docs
# -------------------------------------------------------

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title       = "FocusAI API",
        version     = "1.0.0",
        description = "AI-powered digital addiction detection and prevention",
        routes      = app.routes,
    )

    # This adds the security scheme — tells Swagger UI to show
    # the Authorize button and accept Bearer tokens
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type":         "http",
            "scheme":       "bearer",
            "bearerFormat": "JWT",
        }
    }

    # Apply security to all routes
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# -------------------------------------------------------
# START SERVER
# -------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    print("Starting FocusAI API server...")
    print("API docs available at: http://localhost:8000/docs")
    uvicorn.run(
        "backend.main:app",
        host   = "0.0.0.0",
        port   = 8000,
        reload = True
    )