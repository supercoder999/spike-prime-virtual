"""
Activation code generation & validation — Firestore-backed.

Code format:  PB-XXXX-XXXX-YYMM
  • XXXX-XXXX = 8 random hex chars (unique per code)
  • YYMM      = 2-digit year + 2-digit month of expiry

Codes are stored in Firestore (collection ``activation_codes``).
Any email can be used to activate a valid code — the email is bound
to the code on first activation for identification / support purposes.

Environment variables:
  ACTIVATION_SECRET  – HMAC key for legacy code verification (kept for
                       backward-compatibility with already-issued codes)
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS – for emailing codes to buyers
  ADMIN_EMAIL        – receives tracking emails for every payment
  PAYPAL_WEBHOOK_ID  – (optional) PayPal webhook ID for signature verification
"""

import json
import os
import secrets
import smtplib
from datetime import date, datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..firestore import get_db

router = APIRouter()

# ── Config ──────────────────────────────────────────────────────────
#
# TODO (production deployment) — update the following values:
#   1. ACTIVATION_SECRET  → set a strong random key (e.g. `openssl rand -hex 32`)
#   2. SMTP_USER / SMTP_PASS → real SMTP credentials (Gmail App Password or SES, etc.)
#   3. ADMIN_EMAIL → the address that receives BCC copies of activation emails
#   4. PAYPAL_WEBHOOK_ID → from PayPal Developer Dashboard > Webhooks
#   5. PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET → from PayPal Developer Dashboard > Apps
#   6. PAYPAL_MODE → change from "sandbox" to "live"
#
ACTIVATION_SECRET = os.getenv("ACTIVATION_SECRET", "aa24e83f02511ce18711f2352e8623a688561c3f94d66f1cfd9c59b69500e023")  # TODO: replace default
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "support@craftbots.ai")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "support@craftbots.ai")   # TODO: set for production
SMTP_PASS = os.getenv("SMTP_PASS", "vcmo nrvv gzey zxzt")   # TODO: set for production
PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "7WC277198H480111T")        # TODO: set for production
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "AZMHcchR2TVZfYe5ul1twS3_rX_zOecXucV792UUyQxZZ8oZpZE9Ng3gdff7iqloy6TkwdjuohYMfb2r")          # TODO: set for production
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "ENfaLNPFEjHKer01rSsB_msdwYF2E191DEBxDMokasYyygvWcUqxpLuFORbVmVnbDyVaCp0Gudl1fhfZ")  # TODO: set for production
# TODO: change to "live" for production
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "live")

# Map PayPal amounts to plan labels (must match pricing in frontend)
AMOUNT_TO_PLAN: dict[str, str] = {
    "1.00": "1 Month (Test)",
    "2.00": "20 Minutes",
    "20.00": "1 Month",
    "100.00": "6 Months",
    "180.00": "12 Months",
}

# Plan labels → number of units (months unless handled specially)
PLAN_LABEL_TO_MONTHS: dict[str, int] = {
    "1 Month (Test)": 1,
    "20 Minutes": 0,  # special: 20 min
    "1 Month": 1,
    "6 Months": 6,
    "12 Months": 12,
}

# PayPal plan IDs → plan labels (for claim endpoint)
PAYPAL_PLAN_IDS: dict[str, str] = {
    "P-3298108474070713UNGVGFBQ": "20 Minutes",
    "P-1A0527784T027311WNGUG4KQ": "6 Months",
    "P-7H139700RF500774FNGUG4TQ": "12 Months",
}


# ── Date helpers ────────────────────────────────────────────────────
def _last_day_of_month(year: int, month: int) -> date:
    """Return the last day of the given month."""
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1) - timedelta(days=1)


def _add_months(d: date, months: int) -> tuple[int, int]:
    """Add *months* to *d* and return (year, month) of the result."""
    total = (d.year * 12 + d.month - 1) + months
    return total // 12, total % 12 + 1


# ── Code generation & verification (Firestore-backed) ───────────────
async def _generate_code(buyer_email: str, months: int = 1, plan_duration: str = "") -> tuple[str, str]:
    """Generate a random activation code and store it in Firestore.

    Returns ``(code, expiry_iso)`` where:
      • ``code``       – e.g. ``"PB-A1B2-C3D4-2609"``
      • ``expiry_iso`` – e.g. ``"2026-09-30T10:20:00Z"`` or ISO date

    The code is NOT tied to any email.  The buyer_email is stored
    alongside it for admin reference only.
    """
    if plan_duration == "20 Minutes":
        # Specific fixed-time expiry for 20 minutes
        expiry_dt = datetime.now(timezone.utc) + timedelta(minutes=20)
        expiry_iso = expiry_dt.isoformat()
        yymm = f"{expiry_dt.year % 100:02d}{expiry_dt.month:02d}"
    else:
        # Month-based expiry
        now = datetime.now(timezone.utc).date()
        exp_year, exp_month = _add_months(now, months)
        last_day = _last_day_of_month(exp_year, exp_month)
        expiry_iso = last_day.isoformat()  # "2026-09-30"
        yymm = f"{exp_year % 100:02d}{exp_month:02d}"

    # Generate 8 random hex chars for uniqueness
    random_hex = secrets.token_hex(4).upper()  # 8 hex chars
    code = f"PB-{random_hex[:4]}-{random_hex[4:8]}-{yymm}"

    # Store in Firestore
    db = get_db()
    doc_ref = db.collection("activation_codes").document(code)
    await doc_ref.set({
        "code": code,
        "expiry": expiry_iso,
        "buyer_email": buyer_email.strip().lower(),
        "bound_email": None,       # set on first activation
        "created_at": datetime.now(timezone.utc).isoformat(),
        "months": months,
        "plan": plan_duration,
    })

    return code, expiry_iso


async def _verify_code(code: str) -> tuple[bool, str]:
    """Verify an activation code against Firestore.

    Returns ``(True, expiry_iso)`` on success, or ``(False, error_message)``
    on failure (not found, or expired).
    """
    code = code.strip().upper()
    parts = code.split("-")
    if len(parts) != 4 or parts[0] != "PB":
        return False, "Invalid code format."

    yymm = parts[3]
    if len(yymm) != 4 or not yymm.isdigit():
        return False, "Invalid code format."

    # Look up code in Firestore
    db = get_db()
    doc_ref = db.collection("activation_codes").document(code)
    doc = await doc_ref.get()

    if not doc.exists:
        # ── Legacy fallback: try HMAC-based verification ────────────
        # Codes issued before the Firestore migration are HMAC-based
        # and won't exist in the DB.  We keep backward compat here.
        return _verify_legacy_hmac_code(code)

    data = doc.to_dict()
    expiry_str = data.get("expiry", "")

    try:
        # Handle both date ("2026-09-30") and datetime ("2026-03-06T16:55:12+00:00") formats
        if "T" in expiry_str:
            expiry_dt = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
            now_utc = datetime.now(timezone.utc)
            if now_utc > expiry_dt:
                return False, (
                    f"This activation code expired on {expiry_dt.strftime('%B %d, %Y at %H:%M UTC')}. "
                    "Please renew your subscription to receive a new code."
                )
            return True, expiry_str
        else:
            expiry_date = date.fromisoformat(expiry_str)
    except Exception:
        return False, "Invalid code data."

    today = date.today()
    if today > expiry_date:
        return False, (
            f"This activation code expired on {expiry_date.strftime('%B %d, %Y')}. "
            "Please renew your subscription to receive a new code."
        )

    return True, expiry_str


def _verify_legacy_hmac_code(code: str) -> tuple[bool, str]:
    """Verify an old HMAC-based code (issued before Firestore migration).

    Legacy codes used HMAC(email|YYYY-MM) but we no longer require email.
    Since we cannot recover the email, we simply reject legacy codes that
    aren't in Firestore — admin can manually add them if needed.
    """
    return False, "Invalid activation code. Please contact support if you believe this is an error."


# ── Subscription-duration helper ────────────────────────────────────
def _detect_plan_duration(resource: dict) -> str:
    """Return a human-readable plan label from the PayPal event resource."""
    plan = resource.get("plan", {})
    plan_name = plan.get("name", "")
    if plan_name:
        return plan_name

    billing_info = resource.get("billing_info", {})
    cycle = billing_info.get("cycle_executions", [])
    if cycle:
        freq = cycle[0].get("frequency", {})
        interval = freq.get("interval_count", "")
        unit = freq.get("interval_unit", "")
        if interval and unit:
            return f"{interval} {unit.title()}"

    amount = (
        resource.get("amount", {}).get("total")
        or resource.get("amount", {}).get("value")
        or resource.get("gross_amount", {}).get("value")
        or ""
    )
    if amount in AMOUNT_TO_PLAN:
        return AMOUNT_TO_PLAN[amount]

    purchase_units = resource.get("purchase_units", [])
    if purchase_units:
        pu_amount = purchase_units[0].get("amount", {}).get("value", "")
        if pu_amount in AMOUNT_TO_PLAN:
            return AMOUNT_TO_PLAN[pu_amount]

    return "Unknown"


def _detect_plan_months(resource: dict) -> int:
    """Return the subscription duration in months from the PayPal event resource."""
    label = _detect_plan_duration(resource)
    return PLAN_LABEL_TO_MONTHS.get(label, 1)  # default to 1 month


# ── Email helpers ───────────────────────────────────────────────────
def _smtp_send(msg: MIMEMultipart, recipients: list[str]) -> None:
    """Low-level SMTP send. Shared by all email helpers."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[Activation] SMTP not configured — would send to {recipients}")
        return
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, recipients, msg.as_string())
    except Exception as e:
        print(f"[Activation] SMTP error: {e}")


def _send_activation_email(
    buyer_email: str,
    code: str,
    plan_duration: str = "",
    payment_date: str = "",
    expiry_date: str = "",
    is_renewal: bool = False,
) -> None:
    """Send the activation code to the buyer with subscription & expiry details."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[Activation] SMTP not configured. Code for {buyer_email}: {code}")
        return

    renewal_label = "Subscription Renewed" if is_renewal else "Thank You for Your Purchase"

    def _row(label: str, value: str) -> str:
        if not value:
            return ""
        return f'<tr><td style="color:#8b949e;padding:4px 12px;">{label}:</td><td style="padding:4px 12px;font-weight:600;">{value}</td></tr>'

    # Format expiry for display
    expiry_display = ""
    if expiry_date:
        try:
            d = date.fromisoformat(expiry_date)
            expiry_display = d.strftime("%B %d, %Y")
        except Exception:
            expiry_display = expiry_date

    subject = f"Your Spike Prime Virtual Activation Code — {plan_duration or 'Active'}"
    html_body = f"""\
<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#0d1117;color:#c9d1d9;border-radius:8px;">
  <h2 style="color:#58a6ff;margin-top:0;">🎉 {renewal_label}!</h2>
  <p>Your Spike Prime Virtual activation code is:</p>
  <div style="background:#161b22;border:2px solid #58a6ff;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
    <span style="font-size:24px;font-weight:bold;letter-spacing:3px;color:#58a6ff;">{code}</span>
  </div>
  <table style="width:100%;font-size:14px;margin:12px 0;">
    {_row("Plan", plan_duration)}
    {_row("Payment Date", payment_date)}
    {_row("Valid Until", expiry_display)}
  </table>
  <p>To activate, open <strong>Spike Prime Virtual</strong>, wait for the activation popup, enter your <strong>email</strong> and the code above, then click <strong>Activate</strong>.</p>
  <p style="color:#8b949e;font-size:13px;">Your subscription renews automatically — you will receive a new code each billing cycle. If you have any issues, reply to this email or use the Contact Us page on the site.</p>
  <hr style="border:none;border-top:1px solid #21262d;margin:20px 0;"/>
  <p style="color:#484f58;font-size:12px;">&copy; 2026 Spike Prime Virtual. All rights reserved.</p>
</div>
"""
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = buyer_email
    msg["Subject"] = subject
    msg["Reply-To"] = ADMIN_EMAIL
    msg.attach(MIMEText(
        f"Your Spike Prime Virtual activation code is: {code}\nPlan: {plan_duration}\nPayment Date: {payment_date}\nValid Until: {expiry_display}",
        "plain",
    ))
    msg.attach(MIMEText(html_body, "html"))

    _smtp_send(msg, [buyer_email])
    print(f"[Activation] Code emailed to {buyer_email} (expires {expiry_date})")


def _send_admin_tracking_email(
    buyer_email: str,
    code: str,
    plan_duration: str,
    payment_date: str,
    expiry_date: str,
    event_type: str,
    is_renewal: bool = False,
) -> None:
    """Send the admin a tracking email with payment + expiry details."""
    if not ADMIN_EMAIL or not SMTP_USER or not SMTP_PASS:
        print("[Activation] Admin email skipped (not configured).")
        return

    expiry_display = ""
    if expiry_date:
        try:
            d = date.fromisoformat(expiry_date)
            expiry_display = d.strftime("%B %d, %Y")
        except Exception:
            expiry_display = expiry_date

    kind = "RENEWAL" if is_renewal else "NEW"
    subject = f"[Spike Prime Virtual] {kind} Payment — {buyer_email} — {plan_duration}"

    html_body = f"""\
<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;background:#0d1117;color:#c9d1d9;border-radius:8px;">
  <h2 style="color:#58a6ff;margin-top:0;">💰 {kind} Subscription Payment</h2>
  <table style="width:100%;font-size:14px;border-collapse:collapse;">
    <tr>
      <td style="color:#8b949e;padding:8px 12px;border-bottom:1px solid #21262d;width:160px;">Payment Date</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-weight:600;">{payment_date}</td>
    </tr>
    <tr>
      <td style="color:#8b949e;padding:8px 12px;border-bottom:1px solid #21262d;">User Email</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-weight:600;">{buyer_email}</td>
    </tr>
    <tr>
      <td style="color:#8b949e;padding:8px 12px;border-bottom:1px solid #21262d;">Subscription</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-weight:600;">{plan_duration}</td>
    </tr>
    <tr>
      <td style="color:#8b949e;padding:8px 12px;border-bottom:1px solid #21262d;">Valid Until</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-weight:600;color:#3fb950;">{expiry_display}</td>
    </tr>
    <tr>
      <td style="color:#8b949e;padding:8px 12px;border-bottom:1px solid #21262d;">Activation Code</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-weight:600;letter-spacing:1px;color:#58a6ff;">{code}</td>
    </tr>
    <tr>
      <td style="color:#8b949e;padding:8px 12px;border-bottom:1px solid #21262d;">PayPal Event</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;">{event_type}</td>
    </tr>
    <tr>
      <td style="color:#8b949e;padding:8px 12px;">Type</td>
      <td style="padding:8px 12px;">{kind}</td>
    </tr>
  </table>
  <hr style="border:none;border-top:1px solid #21262d;margin:20px 0;"/>
  <p style="color:#484f58;font-size:12px;">Automated notification from Spike Prime Virtual activation system.</p>
</div>
"""
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = ADMIN_EMAIL
    msg["Subject"] = subject
    msg.attach(MIMEText(
        f"{kind} Payment\nDate: {payment_date}\nUser: {buyer_email}\nPlan: {plan_duration}\nValid Until: {expiry_display}\nCode: {code}\nEvent: {event_type}",
        "plain",
    ))
    msg.attach(MIMEText(html_body, "html"))

    _smtp_send(msg, [ADMIN_EMAIL])
    print(f"[Activation] Admin tracking email sent for {buyer_email}")


# ── Validate endpoint ───────────────────────────────────────────────
class ActivationRequest(BaseModel):
    email: str
    code: str


class ActivationResponse(BaseModel):
    valid: bool
    message: str
    expiry: str = ""  # ISO date, e.g. "2026-09-30"


@router.post("/validate", response_model=ActivationResponse)
async def validate_activation_code(body: ActivationRequest):
    """Validate an activation code and bind the email to it for identification."""
    email = body.email.strip().lower()
    code = body.code.strip().upper()

    if not email or not code:
        raise HTTPException(status_code=400, detail="Email and activation code are required.")

    valid, result = await _verify_code(code)
    if valid:
        # Bind email to this code in Firestore (for identification / support)
        try:
            db = get_db()
            doc_ref = db.collection("activation_codes").document(code)
            await doc_ref.update({"bound_email": email})
        except Exception as e:
            print(f"[Activation] Could not bind email to code: {e}")

        return ActivationResponse(valid=True, message="Activation successful!", expiry=result)

    raise HTTPException(status_code=403, detail=result)


# ── PayPal Webhook (payment completed) ──────────────────────────────
async def _get_paypal_access_token() -> Optional[str]:
    """Get an OAuth access token from PayPal."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        return None
    base = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{base}/v1/oauth2/token",
                data={"grant_type": "client_credentials"},
                auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            )
            return resp.json().get("access_token")
    except Exception as e:
        print(f"[PayPal] Token error: {e}")
        return None


async def _verify_paypal_webhook(request: Request, body_bytes: bytes) -> bool:
    """Verify a PayPal webhook notification signature."""
    if not PAYPAL_WEBHOOK_ID or not PAYPAL_CLIENT_ID:
        print("[PayPal] Webhook verification skipped — no PAYPAL_WEBHOOK_ID configured (dev mode).")
        return True

    token = await _get_paypal_access_token()
    if not token:
        return False

    base = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
    headers = request.headers
    verify_body = {
        "auth_algo": headers.get("paypal-auth-algo", ""),
        "cert_url": headers.get("paypal-cert-url", ""),
        "transmission_id": headers.get("paypal-transmission-id", ""),
        "transmission_sig": headers.get("paypal-transmission-sig", ""),
        "transmission_time": headers.get("paypal-transmission-time", ""),
        "webhook_id": PAYPAL_WEBHOOK_ID,
        "webhook_event": json.loads(body_bytes),
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{base}/v1/notifications/verify-webhook-signature",
                json=verify_body,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            result = resp.json()
            return result.get("verification_status") == "SUCCESS"
    except Exception as e:
        print(f"[PayPal] Webhook verification error: {e}")
        return False


# Events we handle
_HANDLED_EVENTS = {
    "PAYMENT.SALE.COMPLETED",
    "CHECKOUT.ORDER.APPROVED",
    "PAYMENT.CAPTURE.COMPLETED",
    "BILLING.SUBSCRIPTION.ACTIVATED",
    "BILLING.SUBSCRIPTION.RENEWED",
}

_RENEWAL_EVENTS = {
    "BILLING.SUBSCRIPTION.RENEWED",
}


@router.post("/paypal-webhook")
async def paypal_webhook(request: Request):
    """Receive PayPal payment/subscription webhook, generate time-limited code, email buyer + admin."""
    body_bytes = await request.body()

    if not await _verify_paypal_webhook(request, body_bytes):
        raise HTTPException(status_code=403, detail="Webhook verification failed.")

    event = json.loads(body_bytes)
    event_type = event.get("event_type", "")

    if event_type not in _HANDLED_EVENTS:
        return {"status": "ignored", "event_type": event_type}

    resource = event.get("resource", {})

    # ── Extract buyer email ──
    buyer_email = (
        resource.get("payer", {}).get("email_address")
        or resource.get("payer", {}).get("payer_info", {}).get("email")
        or resource.get("subscriber", {}).get("email_address")
        or resource.get("buyer", {}).get("email_address")
        or resource.get("custom_id", "")
        or ""
    )

    if not buyer_email or "@" not in buyer_email:
        print(f"[PayPal] Could not extract buyer email from event: {event_type}")
        return {"status": "error", "detail": "No buyer email found in event."}

    # ── Determine payment date ──
    payment_date_raw = (
        resource.get("create_time")
        or resource.get("update_time")
        or event.get("create_time")
        or ""
    )
    try:
        dt = datetime.fromisoformat(payment_date_raw.replace("Z", "+00:00"))
        payment_date = dt.strftime("%B %d, %Y at %H:%M UTC")
    except Exception:
        payment_date = payment_date_raw or datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    # ── Determine plan duration & months ──
    plan_duration = _detect_plan_duration(resource)
    months = _detect_plan_months(resource)
    is_renewal = event_type in _RENEWAL_EVENTS

    if event_type == "PAYMENT.SALE.COMPLETED" and resource.get("billing_agreement_id"):
        is_renewal = True

    # ── Generate time-limited code & send emails ──
    code, expiry_iso = await _generate_code(
        buyer_email=buyer_email,
        months=months,
        plan_duration=plan_duration,
    )

    _send_activation_email(
        buyer_email=buyer_email,
        code=code,
        plan_duration=plan_duration,
        payment_date=payment_date,
        expiry_date=expiry_iso,
        is_renewal=is_renewal,
    )

    _send_admin_tracking_email(
        buyer_email=buyer_email,
        code=code,
        plan_duration=plan_duration,
        payment_date=payment_date,
        expiry_date=expiry_iso,
        event_type=event_type,
        is_renewal=is_renewal,
    )

    print(f"[PayPal] Processed {event_type} for {buyer_email} — plan: {plan_duration}, expires: {expiry_iso}, renewal: {is_renewal}")
    return {"status": "ok", "email": buyer_email, "plan": plan_duration, "expiry": expiry_iso, "renewal": is_renewal}


# ── Admin endpoint to manually generate codes ──────────────────────
class AdminGenerateRequest(BaseModel):
    secret: str          # must match ACTIVATION_SECRET
    buyer_email: str     # for reference
    months: int = 12
    send_email: bool = True  # send activation email to buyer


@router.post("/admin/generate")
async def admin_generate_code(body: AdminGenerateRequest):
    """Admin-only endpoint to manually create an activation code and optionally email it."""
    if body.secret != ACTIVATION_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden.")

    plan_label = PLAN_LABEL_TO_MONTHS.get(str(body.months), f"{body.months} Month{'s' if body.months != 1 else ''}")
    # Reverse-lookup a nice plan label, or build one
    plan_duration = next(
        (k for k, v in PLAN_LABEL_TO_MONTHS.items() if v == body.months),
        f"{body.months} Month{'s' if body.months != 1 else ''}",
    )

    code, expiry = await _generate_code(body.buyer_email, body.months, plan_duration=plan_duration)
    payment_date = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    if body.send_email:
        _send_activation_email(
            buyer_email=body.buyer_email,
            code=code,
            plan_duration=plan_duration,
            payment_date=payment_date,
            expiry_date=expiry,
        )

    return {"code": code, "expiry": expiry, "buyer_email": body.buyer_email, "months": body.months, "email_sent": body.send_email}


# ── Claim activation code (after PayPal payment) ────────────────────
class ClaimRequest(BaseModel):
    email: str
    subscription_id: str = ""  # optional — PayPal subscription ID (e.g. I-XXXX)


@router.post("/claim")
async def claim_activation_code(body: ClaimRequest):
    """After a user completes a PayPal subscription, verify it and send activation code.

    If subscription_id is provided, the backend verifies that specific subscription.
    If only email is provided, the backend checks Firestore for any pending codes.
    """
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    sub_id = body.subscription_id.strip().upper()

    # If no subscription ID provided, check Firestore for existing unclaimed codes
    if not sub_id:
        db = get_db()
        # Check if there are any codes already generated for this email
        existing = db.collection("activation_codes").where("buyer_email", "==", email)
        docs = [d async for d in existing.stream()]
        if docs:
            # Find codes that haven't expired
            today = date.today()
            active_codes = []
            for doc in docs:
                data = doc.to_dict()
                try:
                    expiry = date.fromisoformat(data.get("expiry", "2000-01-01")[:10])
                    if expiry >= today:
                        active_codes.append(data)
                except Exception:
                    pass
            if active_codes:
                # Resend the most recent active code
                latest = sorted(active_codes, key=lambda x: x.get("created_at", ""), reverse=True)[0]
                _send_activation_email(
                    buyer_email=email,
                    code=latest["code"],
                    plan_duration=latest.get("plan", ""),
                    payment_date="",
                    expiry_date=latest.get("expiry", ""),
                )
                return {
                    "status": "ok",
                    "message": f"Your activation code has been re-sent to {email}. Check your inbox!",
                }

        raise HTTPException(
            status_code=404,
            detail="No subscription ID provided and no existing codes found. Please enter your PayPal subscription ID (starts with I-) or contact support.",
        )

    # ── Verify the specific subscription with PayPal ──
    token = await _get_paypal_access_token()
    if not token:
        raise HTTPException(status_code=502, detail="Could not connect to PayPal. Please try again.")

    base = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
    db = get_db()

    # Check if we already issued a code for this subscription
    existing = db.collection("activation_codes").where("subscription_id", "==", sub_id)
    docs = [d async for d in existing.stream()]
    if docs:
        # Already claimed — resend the email
        data = docs[0].to_dict()
        _send_activation_email(
            buyer_email=email,
            code=data["code"],
            plan_duration=data.get("plan", ""),
            payment_date="",
            expiry_date=data.get("expiry", ""),
        )
        return {
            "status": "ok",
            "message": f"Your activation code has been re-sent to {email}. Check your inbox!",
        }

    # Fetch subscription details from PayPal
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                f"{base}/v1/billing/subscriptions/{sub_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                print(f"[Claim] PayPal returned {resp.status_code} for subscription {sub_id}")
                raise HTTPException(
                    status_code=404,
                    detail="Subscription not found. Please check your subscription ID and try again.",
                )
            sub_detail = resp.json()
        except HTTPException:
            raise
        except Exception as e:
            print(f"[Claim] Error fetching subscription {sub_id}: {e}")
            raise HTTPException(status_code=502, detail="Could not verify subscription. Please try again.")

    # Verify subscriber email matches
    sub_email = sub_detail.get("subscriber", {}).get("email_address", "").strip().lower()
    if sub_email != email:
        print(f"[Claim] Email mismatch: {sub_email} != {email} for subscription {sub_id}")
        raise HTTPException(
            status_code=403,
            detail="The email you entered does not match the PayPal subscriber email.",
        )

    # Verify payment was completed
    billing = sub_detail.get("billing_info", {})
    last_payment = billing.get("last_payment", {})
    if not last_payment:
        raise HTTPException(
            status_code=400,
            detail="No payment found for this subscription. Payment may still be processing.",
        )

    # Determine plan from plan_id or amount
    plan_id = sub_detail.get("plan_id", "")
    plan_label = PAYPAL_PLAN_IDS.get(plan_id, "Unknown")
    if plan_label == "Unknown":
        # Try to detect from payment amount
        amount = last_payment.get("amount", {}).get("value", "")
        plan_label = AMOUNT_TO_PLAN.get(amount, "Unknown")

    months = PLAN_LABEL_TO_MONTHS.get(plan_label, 1)

    # Generate code
    code, expiry = await _generate_code(
        buyer_email=email,
        months=months,
        plan_duration=plan_label,
    )

    # Store subscription_id to prevent double-claiming
    doc_ref = db.collection("activation_codes").document(code)
    await doc_ref.update({"subscription_id": sub_id})

    # Determine payment date
    payment_time = last_payment.get("time", "")
    try:
        dt = datetime.fromisoformat(payment_time.replace("Z", "+00:00"))
        payment_date = dt.strftime("%B %d, %Y at %H:%M UTC")
    except Exception:
        payment_date = datetime.now(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

    # Send emails
    _send_activation_email(
        buyer_email=email,
        code=code,
        plan_duration=plan_label,
        payment_date=payment_date,
        expiry_date=expiry,
    )

    _send_admin_tracking_email(
        buyer_email=email,
        code=code,
        plan_duration=plan_label,
        payment_date=payment_date,
        expiry_date=expiry,
        event_type="CLAIM_ENDPOINT",
    )

    print(f"[Claim] Code {code} generated for {email} (sub: {sub_id}, plan: {plan_label})")
    return {
        "status": "ok",
        "message": f"Activation code sent to {email}! Check your inbox.",
        "code": code,
        "expiry": expiry,
        "plan": plan_label,
    }


# ── Dev/test endpoint to preview a code (remove in production) ──────
@router.get("/preview")
async def preview_code(email: str, months: int = 1):
    """DEV ONLY — preview the activation code for a given email + duration."""
    if ACTIVATION_SECRET == "change-me-in-production":
        code, expiry = await _generate_code(email, months)
        return {"email": email, "code": code, "expiry": expiry, "months": months}
    raise HTTPException(status_code=404, detail="Not found.")

