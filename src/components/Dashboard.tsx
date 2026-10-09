"use client";

import React from "react";
import { User, Lead, Commande, Facture, LeadStage } from "@/types/crm";

interface DashboardProps {
  user: User;
  leads: Lead[];
  commandes: Commande[];
  factures: Facture[];
  onOpenFiche: (leadId: string) => void;
  onSimulateMeta: () => Promise<void>;
  onOpenWa?: (leadId: string) => void;
}

const STAGES: Array<{ key: LeadStage; label: string }> = [
  { key: "a_qualifier", label: "À qualifier" },
  { key: "nouveau", label: "Nouveau" },
  { key: "contacte", label: "Contacté" },
  { key: "qualifie", label: "Qualifié" },
  { key: "converti", label: "Converti" },
  { key: "perdu", label: "Perdu" },
];

const STAGE_CONFIG: Record<LeadStage, { color: string; glow?: boolean }> = {
  a_qualifier: { color: "#9CA8FC" },
  nouveau: { color: "#A7F3D0" },
  contacte: { color: "#38BDF8", glow: true },
  qualifie: { color: "#F472B6" },
  attribue: { color: "#C084FC" },
  converti: { color: "#64748B" },
  perdu: { color: "#64748B" },
};

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  leads,
  commandes,
  factures,
  onOpenFiche,
  onSimulateMeta,
  onOpenWa,
}) => {
  const isAdmin = user.role === "admin";
  const isCentreAppel = user.role === "centre_appel";

  const formatMoney = (n: number) =>
    Number(n || 0).toLocaleString("fr-FR").replace(/\s/g, "") + " DH";

  const formatCount = (n: number) => String(n || 0).padStart(2, "0");

  const brandBadge = (b: "lv" | "lvt") => (
    <span className={`badge ${b === "lv" ? "brand-lv" : "brand-lvt"}`}>
      {b === "lv" ? "La Varenne" : "La Varenne Touch"}
    </span>
  );

  const sourceBadge = (source: string) => {
    if (source !== "facebook" && source !== "instagram") return null;
    const label = source === "facebook" ? "Facebook Ads" : "Instagram Ads";
    return (
      <span className="badge badge-meta" title="Lead entrant via Meta Lead Ads">
        {label}
      </span>
    );
  };

  if (isCentreAppel) {
    const queue = leads.filter((l) => l.stage === "a_qualifier");
    const qualifies = leads.filter(
      (l) => l.fiche && l.fiche.qualifiePar === user.name
    );
    const chauds = qualifies.filter((l) => l.fiche?.interet === "chaud").length;
    const convertisApresAppel = qualifies.filter(
      (l) => l.stage === "converti"
    ).length;

    return (
      <div className="page active">
        <div className="kpi-grid">
          <div className="kpi kpi-card-tint">
            <div className="label">Leads à qualifier</div>
            <div className="value">{formatCount(queue.length)}</div>
          </div>
          <div className="kpi kpi-card-white">
            <div className="label">Appels traités</div>
            <div className="value">{formatCount(qualifies.length)}</div>
          </div>
          <div className="kpi kpi-card-tint">
            <div className="label">Leads chauds identifiés</div>
            <div className="value">{formatCount(chauds)}</div>
          </div>
          <div className="kpi kpi-card-white">
            <div className="label">Convertis après mon appel</div>
            <div className="value">{formatCount(convertisApresAppel)}</div>
          </div>
        </div>

        <div
          className="panel"
          style={{
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>File d&apos;attente — à qualifier</h2>
            <p className="sub">Nouveaux leads des deux marques, dans l&apos;ordre d&apos;arrivée</p>
          </div>
          <button
            className="btn-secondary"
            type="button"
            onClick={onSimulateMeta}
          >
            Simuler un lead Facebook/Instagram
          </button>
        </div>

        {queue.length > 0 ? (
          queue.map((l) => (
            <div key={l.id} className="panel" style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: "1.02rem",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {l.client} {sourceBadge(l.source)}
                  </div>
                  <div className="cell-sub" style={{ marginTop: "2px" }}>
                    {brandBadge(l.brand)}
                    {l.tel && <span style={{ marginLeft: "8px" }}>{l.tel}</span>}
                    <span style={{ marginLeft: "8px" }}>
                      Reçu le {l.date || l.date_label || "récemment"}
                    </span>
                  </div>
                  {l.metaNote && (
                    <div className="cell-sub" style={{ marginTop: "3px" }}>
                      {l.metaNote}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {onOpenWa && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.82rem",
                        color: "#3FBF63",
                        border: "1px solid rgba(63, 191, 99, 0.3)",
                        background: "rgba(63, 191, 99, 0.08)",
                        borderRadius: "9px",
                        padding: "8px 14px",
                      }}
                      onClick={() => onOpenWa(l.id)}
                      title="Discuter sur WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                        <path d="M12 2C6.5 2 2 6.3 2 11.6c0 1.8.5 3.5 1.4 5L2 22l5.6-1.4c1.5.8 3.1 1.2 4.4 1.2 5.5 0 10-4.3 10-9.7S17.5 2 12 2Z" />
                      </svg>
                      WhatsApp
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onOpenFiche(l.id)}
                  >
                    Traiter l&apos;appel
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            File d&apos;attente vide — tous les leads ont été qualifiés.
          </div>
        )}
      </div>
    );
  }

  // Admin and Commercial Dashboard
  const isCommercial = user.role === "commercial";
  const activeLeads = leads.filter(
    (l) => (isCommercial ? l.stage !== "a_qualifier" : true) && l.stage !== "converti" && l.stage !== "perdu"
  ).length;
  const enAttente = commandes.filter((c) => c.statut === "en_attente").length;
  const convertis = leads.filter((l) => l.stage === "converti").length;
  const perdus = leads.filter((l) => l.stage === "perdu").length;
  const tauxConv =
    convertis + perdus > 0
      ? Math.round((convertis / (convertis + perdus)) * 100)
      : 0;
  const enRetard = factures.filter((f) => f.statut === "retard").length;
  const caTotal = commandes.reduce(
    (s, c) => (c.statut !== "annulee" ? s + Number(c.montant || 0) : s),
    0
  );

  const visibleDashboardStages = isCommercial
    ? STAGES.filter((s) => s.key !== "a_qualifier")
    : STAGES;

  const stageCounts = visibleDashboardStages.map((s) => ({
    ...s,
    n: leads.filter((l) => l.stage === s.key).length,
  }));
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.n));

  return (
    <div className="page active">
      <div className="kpi-grid">
        <div className="kpi kpi-card-tint">
          <div className="label">Chiffre d&apos;affaires (commandes)</div>
          <div className="value">{formatMoney(caTotal)}</div>
          <div className="delta">{formatCount(commandes.length)} commandes</div>
        </div>
        <div className="kpi kpi-card-white">
          <div className="label">Leads actifs</div>
          <div className="value">{formatCount(activeLeads)}</div>
          <div className="delta">Pipeline en cours</div>
        </div>
        <div className="kpi kpi-card-tint">
          <div className="label">Taux de conversion</div>
          <div className="value">{tauxConv}%</div>
          <div className="delta">
            {formatCount(convertis)} convertis / {formatCount(perdus)} perdus
          </div>
        </div>
        <div className="kpi kpi-card-white">
          <div className="label">Factures en retard</div>
          <div className="value">{formatCount(enRetard)}</div>
          <div className="delta">
            {formatCount(enAttente)} commandes en attente
          </div>
        </div>
      </div>

      <div className="funnel-panel">
        <h2>Entonnoir des leads</h2>
        <p className="sub">
          {isAdmin ? "Vue complète, tous commerciaux" : "Votre portefeuille"}
        </p>
        <div className="funnel-list">
          {stageCounts.map((s) => {
            const config = STAGE_CONFIG[s.key] || { color: "#64748B" };
            const barWidth =
              s.n > 0 ? Math.max(6, Math.min(100, (s.n / maxStage) * 75)) : 0;
            return (
              <div key={s.key} className="funnel-row">
                <span className="fname">{s.label}</span>
                <div className="ftrack">
                  {s.n > 0 && (
                    <div
                      className={`ffill ${config.glow ? "ffill-glow" : ""}`}
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  )}
                </div>
                <span className="fval">{formatCount(s.n)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
