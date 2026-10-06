"use client";

import React, { useState } from "react";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de connexion.");
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
    await performLogin(email, password);
  };

  const handleDemoLogin = async (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemo(account.email);
    await performLogin(account.email, account.password);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div
          className="login-logo"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "18px",
            padding: "4px 0",
          }}
        >
          <img
            src="/images/LA VARENNE LOGO VR white.png"
            alt="La Varenne"
            style={{
              maxHeight: "58px",
              maxWidth: "220px",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
        <p className="login-sub" style={{ textAlign: "center", marginBottom: "22px" }}>
          Accès interne — connectez-vous avec vos identifiants pour continuer.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Adresse email</label>
            <input
              type="email"
              id="login-email"
              autoComplete="username"
              placeholder="prenom.nom@lavarenne.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Mot de passe</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", paddingRight: "42px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: showPassword ? "var(--gold)" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color .15s ease",
                }}
                title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading && !activeDemo ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div className="login-demo-divider">
          <span>Accès Rapide Démo</span>
        </div>

        <div className="login-demo-grid">
          {DEMO_ACCOUNTS.map((account) => {
            const isThisLoading = loading && activeDemo === account.email;
            return (
              <button
                key={account.email}
                type="button"
                className={`login-demo-btn ${isThisLoading ? "loading" : ""}`}
                onClick={() => handleDemoLogin(account)}
                disabled={loading}
                title={`Connexion instantanée en tant que ${account.label}`}
              >
                <div className="demo-btn-top">
                  <span className="demo-btn-title">{account.label}</span>
                  <span className="demo-btn-badge">{account.badge}</span>
                </div>
                <span className="demo-btn-sub">{account.email}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
