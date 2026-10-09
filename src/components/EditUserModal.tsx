"use client";

import React, { useState, useEffect } from "react";
import { User, UserRole, Brand } from "@/types/crm";

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState(user.password || "");
  const [showPassword, setShowPassword] = useState(true);
  const [role, setRole] = useState<UserRole>(user.role || "commercial");
  const [brand, setBrand] = useState<Brand>(user.brand || "lv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user.name || "");
    setEmail(user.email || "");
    setPassword(user.password || "");
    setRole(user.role || "commercial");
    setBrand(user.brand || "lv");
  }, [user]);

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let autoPass = "";
    for (let i = 0; i < 10; i++) {
      autoPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(autoPass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          brand: role === "commercial" ? brand : "all",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de mettre à jour l'utilisateur.");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur serveur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wa-overlay" onClick={onClose}>
      <form
        className="fiche-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ maxWidth: "560px" }}
      >
        <div className="fiche-modal-head">
          <div>
            <div className="who" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  background: "#2A2A2D",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
              Modifier le collaborateur
            </div>
            <div className="sub2">Mettre à jour les informations, rôle et mot de passe de {user.name}</div>
          </div>
          <button
            type="button"
            className="fiche-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="fiche-modal-body">
          {error && (
            <div
              style={{
                background: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="edit-field">
            <label>Nom complet *</label>
            <input
              type="text"
              placeholder="Ex: Salma Tazi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="edit-field">
            <label>Adresse email professionnelle *</label>
            <input
              type="email"
              placeholder="Ex: salma.tazi@lavarenne.ma"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="edit-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ margin: 0 }}>Mot de passe (en clair) *</label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#D4D4D8",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#D4D4D8")}
              >
                Générer un mot de passe
              </button>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Définir un nouveau mot de passe"
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
                  color: showPassword ? "#FFFFFF" : "var(--text-muted)",
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
            <div className="cell-sub" style={{ marginTop: "4px", fontSize: "0.72rem" }}>
              Le mot de passe est enregistré en clair pour une consultation et gestion directe par l&apos;administrateur.
            </div>
          </div>

          <div className="edit-row2">
            <div className="edit-field">
              <label>Rôle attribué *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                required
              >
                <option value="commercial">Commercial</option>
                <option value="centre_appel">Centre d&apos;appel (Call Center)</option>
                <option value="admin">Administrateur (Admin)</option>
              </select>
            </div>

            {role === "commercial" && (
              <div className="edit-field">
                <label>Marque attribuée *</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value as Brand)}
                  required
                >
                  <option value="lv">La Varenne (LV)</option>
                  <option value="lvt">La Varenne Touch (LVT)</option>
                  <option value="all">Toutes marques (LV & LVT)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="fiche-modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
};
