import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { API_BASE_URL } from '../services/config';

const FREE_LINE_LIMIT = 30;

/**
 * TODO (production deployment) — replace the plan IDs below with real
 * PayPal Subscription Plan IDs created at:
 *   https://developer.paypal.com/dashboard/applications → Subscriptions
 *
 * For sandbox testing use sandbox plan IDs with the sandbox URL.
 * Switch PAYPAL_BASE to "https://www.paypal.com" for production.
 */
const PAYPAL_BASE = import.meta.env.VITE_PAYPAL_MODE === 'sandbox' 
  ? 'https://www.sandbox.paypal.com' 
  : 'https://www.paypal.com';

const PRICING_PLANS = [
  {
    id: '20min',
    label: '20 Minutes',
    price: '$2',
    period: '/one-time',
    savings: 'Trial',
    planId: import.meta.env.VITE_PAYPAL_MODE === 'sandbox' 
      ? 'P-1N881337FX8951608NGVF3JI' 
      : 'P-3298108474070713UNGVGFBQ',
  },
  {
    id: '1month',
    label: '1 Month',
    price: '$20',
    period: '/month',
    savings: '',
    planId: import.meta.env.VITE_PAYPAL_MODE === 'sandbox' 
      ? 'P-8K4378055C637962ANGVEEBY' 
      : 'PASTE_YOUR_LIVE_1_DOLLAR_PLAN_ID_HERE',
  },
  {
    id: '6months',
    label: '6 Months',
    price: '$100',
    period: '/6 months',
    savings: 'Save 17%',
    planId: import.meta.env.VITE_PAYPAL_MODE === 'sandbox' 
      ? 'PASTE_SANDBOX_ID_2_HERE' 
      : 'P-1A0527784T027311WNGUG4KQ',
  },
  {
    id: '12months',
    label: '12 Months',
    price: '$180',
    period: '/year',
    savings: 'Save 25%',
    planId: import.meta.env.VITE_PAYPAL_MODE === 'sandbox' 
      ? 'PASTE_SANDBOX_ID_3_HERE' 
      : 'P-7H139700RF500774FNGUG4TQ',
  },
] as const;

const ActivationModal: React.FC = () => {
  const { showActivationModal, setShowActivationModal, setActivated, setActivationExpiry } = useStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'activate' | 'pricing'>('activate');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimSubId, setClaimSubId] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimError, setClaimError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!code.trim()) {
      setError('Please enter your activation code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/activation/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setActivated(true);
        setActivationExpiry(data?.expiry || null);
        setShowActivationModal(false);
        setEmail('');
        setCode('');
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detail || 'Invalid activation code.');
      }
    } catch {
      setError('Could not reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, code, setActivated, setActivationExpiry, setShowActivationModal]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
    },
    [handleSubmit],
  );

  const handleClaim = useCallback(async () => {
    if (!claimEmail.trim()) {
      setClaimError('Please enter the email you used for PayPal.');
      return;
    }
    setClaimLoading(true);
    setClaimError('');
    setClaimMessage('');
    try {
      const payload: Record<string, string> = { email: claimEmail.trim() };
      if (claimSubId.trim()) {
        payload.subscription_id = claimSubId.trim();
      }
      const res = await fetch(`${API_BASE_URL}/api/activation/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setClaimMessage(data?.message || 'Activation code sent! Check your email.');
      } else {
        setClaimError(data?.detail || 'Could not find a payment for this email.');
      }
    } catch {
      setClaimError('Could not reach server. Please try again.');
    } finally {
      setClaimLoading(false);
    }
  }, [claimEmail, claimSubId]);

  if (!showActivationModal) return null;

  return (
    <div className="activation-overlay">
      <div className="activation-modal">
        <h2>{view === 'activate' ? 'Activation Required' : 'Choose a Plan'}</h2>

        {view === 'activate' && (
          <>
            <p>
              You've reached the free limit of <strong>{FREE_LINE_LIMIT} lines</strong> (or{' '}
              <strong>{FREE_LINE_LIMIT} blocks</strong>).
              Purchase a subscription to unlock unlimited usage. After payment, an activation
              code will be sent to your email automatically.
            </p>

            <input
              className="activation-input"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              autoFocus
            />

            <input
              className="activation-input"
              type="text"
              placeholder="Activation code (e.g. PB-A1B2-C3D4-2609)"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
            />

            {error && <p className="activation-error">{error}</p>}

            <button
              className="activation-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Validating...' : 'Activate'}
            </button>

            <div className="activation-links">
              <button
                className="activation-pricing-link"
                onClick={() => setView('pricing')}
              >
                View Pricing &amp; Subscribe
              </button>
              <span className="activation-link-hint">
                Activation code is emailed after payment
              </span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
            </div>
          </>
        )}

        {view === 'pricing' && (
          <>
            <p>Select a subscription plan. Payment is recurring via PayPal — cancel anytime.</p>

            <div className="pricing-cards">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`pricing-card${plan.id === '12months' ? ' pricing-card--best' : ''}`}
                >
                  {plan.savings && <span className="pricing-badge">{plan.savings}</span>}
                  <div className="pricing-label">{plan.label}</div>
                  <div className="pricing-price">
                    {plan.price}<span className="pricing-period">{plan.period}</span>
                  </div>
                  <a
                    className="pricing-subscribe"
                    href={`${PAYPAL_BASE}/webapps/billing/plans/subscribe?plan_id=${plan.planId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Subscribe
                  </a>
                </div>
              ))}
            </div>

            <div className="claim-section" style={{ marginTop: '20px', padding: '16px', background: '#161b22', borderRadius: '8px', border: '1px solid #30363d' }}>
              <p style={{ margin: '0 0 10px', fontSize: '14px', color: '#c9d1d9' }}>
                <strong>Already paid?</strong> Enter your details to receive your activation code:
              </p>
              <input
                className="activation-input"
                type="email"
                placeholder="Your PayPal email"
                value={claimEmail}
                onChange={(e) => { setClaimEmail(e.target.value); setClaimError(''); setClaimMessage(''); }}
                style={{ margin: '0 0 8px' }}
              />
              <input
                className="activation-input"
                type="text"
                placeholder="Subscription ID (e.g. I-H28V6EYY7BAM) — from PayPal confirmation"
                value={claimSubId}
                onChange={(e) => { setClaimSubId(e.target.value); setClaimError(''); setClaimMessage(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleClaim(); }}
                style={{ margin: '0 0 8px' }}
              />
              <button
                className="activation-submit"
                onClick={handleClaim}
                disabled={claimLoading}
                style={{ margin: 0, width: '100%' }}
              >
                {claimLoading ? 'Checking...' : 'Get My Activation Code'}
              </button>
              <p style={{ color: '#8b949e', fontSize: '12px', margin: '8px 0 0' }}>
                Find your Subscription ID in PayPal: Settings → Payments → Manage pre-approved payments.
                Without a Subscription ID, we'll re-send your most recent code.
              </p>
              {claimMessage && <p style={{ color: '#3fb950', margin: '8px 0 0', fontSize: '13px' }}>{claimMessage}</p>}
              {claimError && <p className="activation-error" style={{ margin: '8px 0 0' }}>{claimError}</p>}
            </div>

            <button
              className="activation-back-link"
              onClick={() => setView('activate')}
            >
              ← Back to Activation
            </button>
          </>
        )}

        <button
          className="activation-close"
          onClick={() => setShowActivationModal(false)}
          title="Close (you can keep editing up to the free limit)"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ActivationModal;
