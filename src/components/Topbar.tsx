"use client";

import React from "react";
import { User, Brand, PageKey } from "@/types/crm";

interface TopbarProps {
  user: User;
  currentPage: PageKey;
  currentBrand: Brand;
  onBrandChange: (brand: Brand) => void;
  onReturnAdmin: () => void;
  onToggleMobileSidebar: () => void;
}

const PAGE_METADATA: Record<PageKey, { title: string; kicker: string }> = {
  dashboard: { title: "Tableau de bord", kicker: "Vue d'ensemble" },
  clients: { title: "Clients", kicker: "Portefeuille" },
  leads: { title: "Leads", kicker: "Pipeline commercial" },
  commandes: { title: "Commandes", kicker: "Cycle commercial" },
  devis: { title: "Devis", kicker: "Cycle commercial" },
  factures: { title: "Factures", kicker: "Cycle commercial" },
  equipe: { title: "Équipe", kicker: "Accès et supervision" },
};

export const Topbar: React.FC<TopbarProps> = ({
  user,
  currentPage,
  currentBrand,
  onBrandChange,
  onReturnAdmin,
  onToggleMobileSidebar,
}) => {
  const isAdmin = user.role === "admin";
  const isCentreAppel = user.role === "centre_appel";

  const getPageTitle = () => {
    if (currentPage === "dashboard") {
      if (isCentreAppel) return "Centre d'appel";
      if (isAdmin) return "Tableau de bord";
      return "Mon tableau de bord";
    }
    return PAGE_METADATA[currentPage].title;
  };

  const brandLabel = (b: Brand) =>
    b === "lv" ? "La Varenne" : b === "lvt" ? "La Varenne Touch" : "Toutes marques";

  return (
    <>
      {user.impersonatedBy && (
        <div
          id="impersonate-banner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            background: "color-mix(in srgb, var(--gold) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
            borderRadius: "10px",
            padding: "10px 16px",
            margin: "16px 32px 0",
            fontSize: "0.85rem",
          }}
        >
          <span>
            Vous visualisez l&apos;espace de <strong>{user.name}</strong> — accès identique au sien, en lecture.
          </span>
          <button
            type="button"
            className="btn-ghost"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "9px",
              whiteSpace: "nowrap",
            }}
            onClick={onReturnAdmin}
          >
            ← Retour Administration
          </button>
        </div>
      )}

      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={onToggleMobileSidebar}
            aria-label="Ouvrir le menu de navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <div>
            <p className="kicker">{PAGE_METADATA[currentPage].kicker}</p>
            <h1>{getPageTitle()}</h1>
          </div>
        </div>

        <div className="topbar-right">
          {isAdmin ? (
            <div className="segmented">
              <button
                type="button"
                className={currentBrand === "lv" ? "active" : ""}
                onClick={() => onBrandChange("lv")}
              >
                <span className="swatch" style={{ background: "var(--accent)" }} />
                La Varenne
              </button>
              <button
                type="button"
                className={currentBrand === "lvt" ? "active" : ""}
                onClick={() => onBrandChange("lvt")}
              >
                <span className="swatch" style={{ background: "var(--accent-touch)" }} />
                La Varenne Touch
              </button>
            </div>
          ) : isCentreAppel ? (
            <span
              className="badge"
              style={{
                fontSize: "0.8rem",
                padding: "7px 13px",
                background: "color-mix(in srgb, var(--gold) 20%, transparent)",
                color: "var(--gold)",
              }}
            >
              Centre d&apos;appel — La Varenne &amp; Touch
            </span>
          ) : (
            <span
              className={`badge ${user.brand === "lvt" ? "brand-lvt" : "brand-lv"}`}
              style={{ fontSize: "0.8rem", padding: "7px 13px" }}
            >
              Espace {brandLabel(user.brand)}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
