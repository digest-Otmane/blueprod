"use client";

import React from "react";
import { User, PageKey } from "@/types/crm";

interface SidebarProps {
  user: User;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  leadsCount: number;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentPage,
  onNavigate,
  leadsCount,
  onLogout,
  isMobileOpen,
  onCloseMobile,
}) => {
  const isAdmin = user.role === "admin";
  const isCentreAppel = user.role === "centre_appel";

  const getRoleLabel = () => {
    if (user.role === "admin") return "Administrateur";
    if (user.role === "centre_appel") return "Centre d'appel — qualification";
    return `Commercial · ${user.brand === "lv" ? "La Varenne" : "La Varenne Touch"}`;
  };

  const getAvatarColor = () => {
    if (user.brand === "lvt") return "var(--accent-touch)";
    if (user.brand === "all") return "var(--gold)";
    return "var(--accent)";
  };

  const handleNavClick = (page: PageKey) => {
    onNavigate(page);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="brandmark">
          <span
            className="mark logo-mark"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold)",
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
            }}
          >
            LV
          </span>
          La Varenne
          {isMobileOpen && (
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={onCloseMobile}
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          )}
        </div>
        <div className="brand-sub">CRM interne — Alea Food</div>

        <nav className="mainnav">
          <button
            type="button"
            className={currentPage === "dashboard" ? "active" : ""}
            onClick={() => handleNavClick("dashboard")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
              <rect x="13" y="3.5" width="7.5" height="4.7" rx="1.6" />
              <rect x="13" y="10.4" width="7.5" height="10.1" rx="1.6" />
              <rect x="3.5" y="13.2" width="7.5" height="7.3" rx="1.6" />
            </svg>
            Tableau de bord
          </button>

          {!isCentreAppel && (
            <button
              type="button"
              className={currentPage === "clients" ? "active" : ""}
              onClick={() => handleNavClick("clients")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="8.5" r="3" />
                <path
                  d="M3.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"
                  strokeLinecap="round"
                />
                <circle cx="17" cy="8" r="2.4" />
                <path d="M15.6 13.7c2.3.3 3.9 2.2 3.9 5.3" strokeLinecap="round" />
              </svg>
              Clients
            </button>
          )}

          <button
            type="button"
            className={currentPage === "leads" ? "active" : ""}
            onClick={() => handleNavClick("leads")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z" strokeLinejoin="round" />
            </svg>
            Leads <span className="count">{leadsCount}</span>
          </button>

          {!isCentreAppel && (
            <>
              <div className="navlabel">Cycle commercial</div>
              <button
                type="button"
                className={currentPage === "commandes" ? "active" : ""}
                onClick={() => handleNavClick("commandes")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z"
                    strokeLinejoin="round"
                  />
                  <path d="M4 8.5 12 13l8-4.5M12 13v7" strokeLinejoin="round" />
                </svg>
                Commandes
              </button>
              <button
                type="button"
                className={currentPage === "devis" ? "active" : ""}
                onClick={() => handleNavClick("devis")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z"
                    strokeLinejoin="round"
                  />
                  <path d="M9.3 11h5.4M9.3 14.3h5.4M9.3 7.7h2.6" />
                </svg>
                Devis
              </button>
              <button
                type="button"
                className={currentPage === "factures" ? "active" : ""}
                onClick={() => handleNavClick("factures")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    d="M6 3.5h12v17l-2.3-1.5L14 20.5l-2-1.5-2 1.5-1.7-1.5L6 20.5v-17Z"
                    strokeLinejoin="round"
                  />
                  <path d="M8.7 8h6.6M8.7 11.3h6.6M8.7 14.6h4" />
                </svg>
                Factures
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <div className="navlabel">Administration</div>
              <button
                type="button"
                className={currentPage === "equipe" ? "active" : ""}
                onClick={() => handleNavClick("equipe")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="8" cy="8" r="3" />
                  <circle cx="17" cy="9" r="2.4" />
                  <path
                    d="M2.8 19.5c0-3.4 2.3-5.8 5.2-5.8s5.2 2.4 5.2 5.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14.5 14.3c2.2.4 3.7 2.3 3.7 5.2"
                    strokeLinecap="round"
                  />
                </svg>
                Équipe
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <p className="navlabel" style={{ padding: "0 2px 8px" }}>
            Connecté en tant que
          </p>
          <div className="switcher-wrap">
            <div className="user-chip">
              <div
                className="avatar"
                style={{ color: getAvatarColor() }}
              >
                {user.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="who">{user.name}</div>
                <div className="role">{getRoleLabel()}</div>
              </div>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={onLogout}>
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
};
