import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ShoppingBasket, Sprout } from 'lucide-react';
import { API_BASE } from '../utils/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import LanguageSelector from '../components/LanguageSelector.jsx';

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'farmer'
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [mode, setMode] = useState('login');
  const [authMethod, setAuthMethod] = useState('password');
  const [otpStep, setOtpStep] = useState('request');
  const [otpCode, setOtpCode] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState({ loading: false, error: '', info: '' });
  const [location, setLocation] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showDemoRoles, setShowDemoRoles] = useState(false);

  const title = mode === 'login' ? t('auth.title.login') : t('auth.title.register');

  const locationLabel = useMemo(() => {
    if (!location) return t('auth.location');
    const parts = [location.city, location.district, location.state].filter(Boolean);
    const place = parts.length > 0 ? parts.join(', ') : 'Location';
    return `${place} | Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)} (±${Math.round(location.accuracy)}m)`;
  }, [location]);

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const enterDemo = (role) => {
    const demoUser = {
      id: `demo-${role}`,
      name: role === 'farmer' ? 'Demo Farmer' : 'Demo Buyer',
      email: `${role}@kisanmitr.demo`,
      role,
      language,
      demo: true
    };
    localStorage.removeItem('kisanmitr_token');
    localStorage.setItem('kisanmitr_user', JSON.stringify(demoUser));
    navigate(role === 'buyer' ? '/buyer' : '/farmer');
  };

  const localizeError = (message) => {
    if (!message) return '';
    const map = {
      'Invalid credentials': t('errors.invalidCreds'),
      'User not found': t('errors.userNotFound'),
      'Password mismatch': t('errors.passwordMismatch'),
      'Role mismatch for this account': t('errors.roleMismatch'),
      'Email or phone already registered': t('errors.userExists'),
      'Invalid OTP': t('auth.otp.invalid'),
      'OTP expired or not found': t('auth.otp.invalid'),
      'Phone is required': t('auth.otp.phoneRequired')
    };
    return map[message] || t('errors.default');
  };

  const resetOtp = () => {
    setOtpStep('request');
    setOtpCode('');
  };

  const offlineOtpKey = (phone) => `kisanmitr_offline_otp_${phone}`;
  const pendingRegisterKey = 'kisanmitr_pending_registration';

  const generateOfflineOtp = (phone) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    localStorage.setItem(offlineOtpKey(phone), JSON.stringify({ otp, expiresAt }));
    return otp;
  };

  const validateOfflineOtp = (phone, code) => {
    const raw = localStorage.getItem(offlineOtpKey(phone));
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (Date.now() > data.expiresAt) return false;
      return data.otp === code;
    } catch (error) {
      return false;
    }
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setStatus({ loading: false, error: 'Geolocation is not supported in this browser.', info: '' });
      return Promise.resolve(null);
    }

    setStatus({ loading: true, error: '', info: t('auth.location.request') });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          let coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`);
            const data = await resp.json();
            const address = data?.address || {};
            coords = {
              ...coords,
              city: address.city || address.town || address.village || address.hamlet || '',
              district: address.county || address.state_district || '',
              state: address.state || ''
            };
          } catch (error) {
            // fallback to coords only
          }
          setLocation(coords);
          setStatus({ loading: false, error: '', info: t('auth.location.captured') });
          resolve(coords);
        },
        () => {
          setStatus({ loading: false, error: t('auth.location.denied'), info: '' });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  useEffect(() => {
    resetOtp();
  }, [mode, authMethod]);

  useEffect(() => {
    const syncPendingRegistration = async () => {
      if (!navigator.onLine) return;
      const raw = localStorage.getItem(pendingRegisterKey);
      if (!raw) return;
      try {
        const pending = JSON.parse(raw);
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pending)
        });
        if (response.ok) {
          localStorage.removeItem(pendingRegisterKey);
        }
      } catch (error) {
        // keep pending for later
      }
    };
    syncPendingRegistration();
  }, []);

  const requestOtp = async () => {
    if (!form.phone) {
      setStatus({ loading: false, error: t('auth.otp.phoneRequired'), info: '' });
      return;
    }
    setStatus({ loading: true, error: '', info: '' });

    if (!navigator.onLine) {
      const otp = generateOfflineOtp(form.phone);
      setOtpStep('verify');
      setStatus({ loading: false, error: '', info: `${t('auth.otp.sent.offline')} ${t('auth.otp.offlineCode')} ${otp}` });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          purpose: mode
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to send OTP');
      }
      setOtpStep('verify');
      setStatus({ loading: false, error: '', info: t('auth.otp.sent') });
    } catch (error) {
      setStatus({ loading: false, error: localizeError(error.message), info: '' });
    }
  };

  const verifyOtp = async (coords) => {
    if (!otpCode) {
      setStatus({ loading: false, error: t('auth.otp.codeRequired'), info: '' });
      return;
    }

    if (!navigator.onLine) {
      const valid = validateOfflineOtp(form.phone, otpCode);
      if (!valid) {
        setStatus({ loading: false, error: t('auth.otp.invalid'), info: '' });
        return;
      }

      const offlineUser = {
        id: `offline-${Date.now()}`,
        name: form.name || 'User',
        email: form.email || '',
        phone: form.phone,
        role: form.role,
        language,
        location: coords || location
      };
      localStorage.setItem('kisanmitr_token', 'offline');
      localStorage.setItem('kisanmitr_user', JSON.stringify(offlineUser));

      if (mode === 'register') {
        const pending = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          location: coords || location,
          language
        };
        localStorage.setItem(pendingRegisterKey, JSON.stringify(pending));
      }

      navigate(form.role === 'buyer' ? '/buyer' : '/farmer');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          otp: otpCode,
          purpose: mode,
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          location: coords,
          language
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }
      const user = data.user || { role: form.role };
      localStorage.setItem('kisanmitr_token', data.token || '');
      localStorage.setItem('kisanmitr_user', JSON.stringify(user));
      if (user.language && user.language !== language) {
        setLanguage(user.language);
      }
      navigate(user.role === 'buyer' ? '/buyer' : '/farmer');
    } catch (error) {
      setStatus({ loading: false, error: localizeError(error.message), info: '' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', info: '' });

    const coords = location || (await fetchLocation());

    if (authMethod === 'otp') {
      if (otpStep === 'request') {
        setStatus({ loading: false, error: '', info: '' });
        await requestOtp();
        return;
      }
      setStatus({ loading: false, error: '', info: '' });
      await verifyOtp(coords);
      return;
    }

    const payload = {
      email: form.email,
      password: form.password,
      role: form.role,
      location: coords,
      language
    };

    if (mode === 'register') {
      payload.name = form.name;
      payload.phone = form.phone;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong.');
      }

      const user = data.user || { role: form.role };
      localStorage.setItem('kisanmitr_token', data.token || '');
      localStorage.setItem('kisanmitr_user', JSON.stringify(user));
      if (user.language && user.language !== language) {       setLanguage(user.language);     }

      navigate(user.role === 'buyer' ? '/buyer' : '/farmer');
    } catch (error) {
      setStatus({ loading: false, error: localizeError(error.message), info: '' });
      return;
    }

    setStatus({ loading: false, error: '', info: '' });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {!showAccountForm && mode === 'login' ? (
          <div className="auth-demo-screen">
            <Link to="/" className="auth-brand">Kisanmitr</Link>
            <div className="auth-lang">
              <LanguageSelector />
            </div>
            <div className="auth-demo-mark" aria-hidden="true">
              <Sprout size={30} />
            </div>
            <p className="auth-demo-eyebrow">{t('auth.demo.eyebrow')}</p>
            <h1>{t('auth.demo.title')}</h1>
            <p className="auth-demo-copy">{t('auth.demo.subtitle')}</p>

            {!showDemoRoles ? (
              <button
                type="button"
                className="btn btn-primary auth-demo-primary"
                onClick={() => setShowDemoRoles(true)}
              >
                {t('auth.demo.cta')} <ArrowRight size={18} />
              </button>
            ) : (
              <div className="auth-demo-roles">
                <p>{t('auth.demo.chooseRole')}</p>
                <button type="button" onClick={() => enterDemo('farmer')}>
                  <Sprout size={20} />
                  <span>{t('auth.demo.farmer')}</span>
                  <ArrowRight size={17} />
                </button>
                <button type="button" onClick={() => enterDemo('buyer')}>
                  <ShoppingBasket size={20} />
                  <span>{t('auth.demo.buyer')}</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            )}

            <button
              type="button"
              className="auth-account-link"
              onClick={() => {
                setMode('login');
                setShowAccountForm(true);
              }}
            >
              {t('auth.demo.accountLink')}
            </button>
          </div>
        ) : (
          <>
        <div className="auth-header">
          <Link to="/" className="auth-brand">Kisanmitr</Link>
          <div className="auth-lang">
            <LanguageSelector />
          </div>
          <h2>{title}</h2>
          <p>
            {mode === 'login'
              ? t('auth.subtitle.login')
              : t('auth.subtitle.register')}
          </p>
        </div>

        <div className="auth-toggle">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
            type="button"
          >
            {t('auth.login')}
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
            type="button"
          >
            {t('auth.register')}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-row">
              <label>{t('auth.fullname')}</label>
              <input
                type="text"
                placeholder={t('auth.fullname')}
                value={form.name}
                onChange={updateField('name')}
                required
              />
            </div>
          )}

          {(mode === 'register' || authMethod === 'password') && (
            <div className="form-row">
              <label>{t('auth.email')}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField('email')}
                required={authMethod === 'password' || mode === 'register'}
              />
            </div>
          )}

          {(mode === 'register' || authMethod === 'otp') && (
            <div className="form-row">
              <label>{t('auth.phone')}</label>
              <input
                type="tel"
                placeholder={t('auth.phone')}
                value={form.phone}
                onChange={updateField('phone')}
                required
              />
            </div>
          )}

          {authMethod === 'password' && (
            <div className="form-row">
              <label>{t('auth.password')}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={updateField('password')}
                required
              />
            </div>
          )}

          {authMethod === 'otp' && otpStep === 'verify' && (
            <div className="form-row">
              <label>{t('auth.otp.code')}</label>
              <input
                type="text"
                maxLength={4}
                placeholder="1234"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          )}

          <div className="form-row">
            <label>{t('auth.selectRole')}</label>
            <div className="role-toggle">
              <button
                type="button"
                className={form.role === 'farmer' ? 'active' : ''}
                onClick={() => setForm((prev) => ({ ...prev, role: 'farmer' }))}
              >
                {t('auth.role.farmer')}
              </button>
              <button
                type="button"
                className={form.role === 'buyer' ? 'active' : ''}
                onClick={() => setForm((prev) => ({ ...prev, role: 'buyer' }))}
              >
                {t('auth.role.buyer')}
              </button>
            </div>
          </div>

          <div className="form-row">
            <label>{t('auth.loginMethod')}</label>
            <div className="role-toggle">
              <button
                type="button"
                className={authMethod === 'password' ? 'active' : ''}
                onClick={() => setAuthMethod('password')}
              >
                {t('auth.loginMethod.password')}
              </button>
              <button
                type="button"
                className={authMethod === 'otp' ? 'active' : ''}
                onClick={() => setAuthMethod('otp')}
              >
                {t('auth.loginMethod.otp')}
              </button>
            </div>
          </div>

          <div className="location-row">
            <div>
              <span className="location-label">{locationLabel}</span>
              <small>{t('auth.location.note')}</small>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fetchLocation}>
              {t('auth.location.cta')}
            </button>
          </div>

          {status.error && <p className="form-error">{status.error}</p>}
          {status.info && <p className="form-info">{status.info}</p>}

          <button type="submit" className="btn btn-primary" disabled={status.loading}>
            {status.loading
              ? t('auth.wait')
              : authMethod === 'otp'
              ? otpStep === 'request'
                ? t('auth.otp.send')
                : t('auth.otp.verify')
              : mode === 'login'
              ? t('auth.submit.login')
              : t('auth.submit.register')}
          </button>

          {authMethod === 'otp' && otpStep === 'verify' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={requestOtp}
              style={{ marginTop: '0.75rem' }}
            >
              {t('auth.otp.resend')}
            </button>
          )}
        </form>
            <button
              type="button"
              className="auth-account-link"
              onClick={() => {
                setMode('login');
                setShowAccountForm(false);
              }}
            >
              {t('auth.demo.backToDemo')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
