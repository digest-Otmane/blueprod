"use client";

import React, { useState } from "react";
import Image from "next/image";
import { User } from "@/types/crm";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

interface DemoAccount {
  label: string;
  email: string;
  password: string;
  role: string;
  badge: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Admin Demo",
    email: "administration@aleafood.ma",
    password: "AleaFood2026",
    role: "Admin",
    badge: "Admin",
  },
  {
    label: "Centre d'Appel Demo",
    email: "meryem.sqalli@aleafood.ma",
    password: "Meryem2026",
    role: "Centre d'Appel",
    badge: "Appel",
  },
  {
    label: "Commercial LV Demo",
    email: "yassine.el.amrani@lavarenne.ma",
    password: "Yassine2026",
    role: "Commercial LV",
    badge: "LV",
  },
  {
    label: "Commercial LVT Demo",
    email: "hicham.tazi@lavarennetouch.ma",
    password: "Hicham2026",
    role: "Commercial LVT",
    badge: "LVT",
  },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPass,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de connexion. Vérifiez vos identifiants.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
      setActiveDemo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez renseigner votre email et mot de passe.");
      return;
    }
    await performLogin(email, password);
  };

  const handleDemoLogin = async (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemo(account.email);
    await performLogin(account.email, account.password);
  };

  return (
    <div className="login-split-page">
      {/* ============================================================ */}
      {/* LEFT COLUMN: VISUAL SHOWCASE WITH COFFEE ASSET */}
      {/* ============================================================ */}
      <div className="login-visual-pane">
        <div className="login-visual-frame">
          <Image
            src="/login/Café puissant, regard d’aigle v3.png"
            alt="La Varenne Visual Experience"
            width={1200}
            height={1700}
            priority
            className="login-showcase-img"
            style={{
              height: "100%",
              width: "auto",
              objectFit: "contain",
              borderTopRightRadius: "32px",
              borderBottomRightRadius: "32px",
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: AUTHENTICATION FORM CONTAINER */}
      {/* ============================================================ */}
      <div className="login-form-pane">
        <div className="login-form-container">
          {/* Primary Brand Header */}
          <div className="login-logo-header">
            <Image
              src="/login/LA VARENNE LOGO VR  white.png"
              alt="La Varenne"
              width={160}
              height={56}
              priority
              className="login-brand-hero-logo"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-auth-form" noValidate>
            {/* Email Field */}
            <div className="login-control-group">
              <label htmlFor="login-email-input" className="login-field-label">
                Email address
              </label>
              <div className="login-input-box">
                <input
                  id="login-email-input"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-text-input"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-control-group">
              <div className="login-label-row">
                <label htmlFor="login-password-input" className="login-field-label">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="login-forgot-password-link"
                >
                  forgot password?
                </button>
              </div>
              <div className="login-input-box login-password-box">
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-text-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle-btn"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="login-remember-box">
              <label className="login-custom-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-hidden-checkbox"
                />
                <span className={`login-checkbox-indicator ${rememberMe ? "checked" : ""}`}>
                  {rememberMe && (
                    <svg
                      viewBox="0 0 14 14"
                      width="10"
                      height="10"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="2.5 7 5.5 10 11.5 3.5" />
                    </svg>
                  )}
                </span>
                <span className="login-remember-caption">Remember for 30 days</span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="login-error-alert" role="alert">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`login-submit-action-btn ${loading ? "is-loading" : ""}`}
              disabled={loading}
            >
              {loading && !activeDemo ? (
                <span className="login-btn-loading-content">
                  <span className="login-btn-spinner" />
                  <span>Connexion en cours...</span>
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Quick Demo Access Switcher */}
          <div className="login-demo-accordion">
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="login-demo-accordion-header"
              aria-expanded={showDemoDrawer}
            >
              <div className="login-demo-accordion-title">
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Accès Rapide Démo (Comptes de test CRM)</span>
              </div>
              <svg
                className={`login-accordion-arrow ${showDemoDrawer ? "expanded" : ""}`}
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDemoDrawer && (
              <div className="login-demo-card-grid">
                {DEMO_ACCOUNTS.map((account) => {
                  const isThisAccountLoading = loading && activeDemo === account.email;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      className={`login-demo-pill-btn ${isThisAccountLoading ? "is-loading" : ""}`}
                      onClick={() => handleDemoLogin(account)}
                      disabled={loading}
                      title={`Connexion instantanée en tant que ${account.label}`}
                    >
                      <div className="login-demo-pill-header">
                        <span className="login-demo-pill-label">{account.label}</span>
                        <span className={`login-demo-role-badge badge-${account.badge.toLowerCase().replace(/\s+/g, "-")}`}>
                          {account.badge}
                        </span>
                      </div>
                      <span className="login-demo-pill-email">{account.email}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subtle CRM Footer Branding */}
          <div className="login-copyright-footer">
            <p>© 2026 La Varenne • Alea Food CRM Interne</p>
          </div>
        </div>
      </div>


      {/* ============================================================ */}
      {/* MODAL: FORGOT PASSWORD */}
      {/* ============================================================ */}
      {showForgotPasswordModal && (
        <div
          className="login-modal-overlay"
          onClick={() => setShowForgotPasswordModal(false)}
        >
          <div
            className="login-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-modal-title"
          >
            <div className="login-modal-header">
              <h3 id="forgot-modal-title" className="login-modal-title">
                Réinitialisation de mot de passe
              </h3>
              <button
                type="button"
                className="login-modal-close-btn"
                onClick={() => setShowForgotPasswordModal(false)}
                aria-label="Fermer"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="login-modal-body">
              <p>
                Pour des raisons de sécurité interne, les réinitialisations de mot de passe
                sont gérées directement par l&apos;administrateur du CRM Alea Food.
              </p>
              <p className="login-modal-subnote">
                Veuillez contacter le support informatique ou l&apos;administrateur à l&apos;adresse :{" "}
                <strong>administration@aleafood.ma</strong>
              </p>
            </div>
            <div className="login-modal-footer">
              <button
                type="button"
                className="login-modal-ok-btn"
                onClick={() => setShowForgotPasswordModal(false)}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
