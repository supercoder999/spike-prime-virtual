"""Contact form endpoint – sends an email to the admin."""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "mygoolet@gmail.com")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
RECAPTCHA_SECRET = os.getenv("RECAPTCHA_SECRET", "")


class ContactRequest(BaseModel):
    email: str
    topic: str
    message: str
    recaptcha_token: Optional[str] = None


async def verify_recaptcha(token: str) -> bool:
    """Verify a reCAPTCHA token with Google's API."""
    if not RECAPTCHA_SECRET:
        # If no secret is configured, skip verification (dev mode)
        print("[Contact] RECAPTCHA_SECRET not set — skipping verification.")
        return True
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={"secret": RECAPTCHA_SECRET, "response": token},
            )
            result = resp.json()
            return result.get("success", False)
    except Exception as e:
        print(f"[Contact] reCAPTCHA verification error: {e}")
        return False


@router.post("/")
async def submit_contact(req: ContactRequest):
    """Receive a contact form submission and email it to the admin."""

    if not req.email or not req.topic or not req.message:
        raise HTTPException(status_code=400, detail="All fields are required.")

    # Verify reCAPTCHA token
    if not req.recaptcha_token:
        raise HTTPException(status_code=400, detail="reCAPTCHA verification required.")
    if not await verify_recaptcha(req.recaptcha_token):
        raise HTTPException(status_code=403, detail="reCAPTCHA verification failed. Please try again.")

    subject = f"[Code Pybricks Contact] {req.topic}"
    body = (
        f"Topic: {req.topic}\n"
        f"From: {req.email}\n"
        f"{'—' * 40}\n\n"
        f"{req.message}"
    )

    # If SMTP credentials are configured, send a real email
    if SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_USER
            msg["To"] = ADMIN_EMAIL
            msg["Subject"] = subject
            msg["Reply-To"] = req.email
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, ADMIN_EMAIL, msg.as_string())
        except Exception as e:
            print(f"[Contact] SMTP error: {e}")
            raise HTTPException(status_code=500, detail="Failed to send email. Please try again later.")
    else:
        # No SMTP config — log to console so nothing is lost
        print(f"[Contact] New message (SMTP not configured):\n{body}\n")

    return {"status": "ok", "message": "Message sent successfully."}
