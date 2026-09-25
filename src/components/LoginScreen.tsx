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
        <div className="login-logo">
          <span className="mark">LV</span>
          <span className="name">La Varenne CRM</span>
        </div>
        <p className="login-sub">
          Accès interne Alea Food — connectez-vous avec l&apos;email et le mot de passe de votre compte.
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
            <input
              type="password"
              id="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
