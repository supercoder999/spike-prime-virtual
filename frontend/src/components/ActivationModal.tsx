import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';

const FREE_LINE_LIMIT = 30;

/**
 * TODO (production deployment) — replace the plan IDs below with real
 * PayPal Subscription Plan IDs created at:
 *   https://developer.paypal.com/dashboard/applications → Subscriptions
 *
 * For sandbox testing use sandbox plan IDs with the sandbox URL.
 * Switch PAYPAL_BASE to "https://www.paypal.com" for production.
 */
const PAYPAL_BASE = 'https://www.sandbox.paypal.com'; // TODO: change to https://www.paypal.com for production

const PRICING_PLANS = [
  {
    id: '1month',
    label: '1 Month',
    price: '$20',
    period: '/month',
    savings: '',
    planId: 'P-REPLACE_1MONTH_PLAN_ID',   // TODO: replace with real PayPal Subscription Plan ID
  },
  {
    id: '6months',
    label: '6 Months',
    price: '$100',
    period: '/6 months',
    savings: 'Save 17%',
    planId: 'P-REPLACE_6MONTH_PLAN_ID',   // TODO: replace with real PayPal Subscription Plan ID
  },
  {
    id: '12months',
    label: '12 Months',
    price: '$180',
    period: '/year',
    savings: 'Save 25%',
    planId: 'P-REPLACE_12MONTH_PLAN_ID',  // TODO: replace with real PayPal Subscription Plan ID
  },
] as const;

const ActivationModal: React.FC = () => {
  const { showActivationModal, setShowActivationModal, setActivated, setActivationExpiry } = useStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'activate' | 'pricing'>('activate');

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter the email you used for payment.');
      return;
    }
    if (!code.trim()) {
      setError('Please enter your activation code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/activation/validate', {
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
              code will be sent to your PayPal email automatically.
            </p>

            <input
              className="activation-input"
              type="email"
              placeholder="PayPal email address"
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
                Code is emailed automatically after payment
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

            <span className="activation-link-hint" style={{ marginTop: '10px', display: 'block' }}>
              After subscribing, an activation code will be emailed to your PayPal address.
              Return here and enter it above to activate.
            </span>

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
