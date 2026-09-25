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
}

const STAGES: Array<{ key: LeadStage; label: string }> = [
  { key: "a_qualifier", label: "À qualifier" },
  { key: "nouveau", label: "Nouveau" },
  { key: "contacte", label: "Contacté" },
  { key: "qualifie", label: "Qualifié" },
  { key: "converti", label: "Converti" },
  { key: "perdu", label: "Perdu" },
];

const STAGE_COLOR: Record<LeadStage, string> = {
  a_qualifier: "var(--danger)",
  nouveau: "var(--text-muted)",
  contacte: "var(--gold)",
  qualifie: "var(--accent)",
  converti: "var(--success)",
  perdu: "var(--danger)",
};

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  leads,
  commandes,
  factures,
  onOpenFiche,
  onSimulateMeta,
}) => {
  const isAdmin = user.role === "admin";
  const isCentreAppel = user.role === "centre_appel";

  const formatMoney = (n: number) =>
    Number(n || 0).toLocaleString("fr-FR") + " DH";

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
          <div className="kpi">
            <div className="label">Leads à qualifier</div>
            <div className="value">{queue.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Appels traités</div>
            <div className="value">{qualifies.length}</div>
          </div>
          <div className="kpi">
            <div className="label">Leads chauds identifiés</div>
            <div className="value">{chauds}</div>
          </div>
          <div className="kpi">
            <div className="label">Convertis après mon appel</div>
            <div className="value">{convertisApresAppel}</div>
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
            className="btn-ghost"
            type="button"
            style={{ border: "1px solid var(--border)", borderRadius: "9px" }}
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
                      fontFamily: "'Fraunces',serif",
                      fontWeight: 600,
                      fontSize: "1.02rem",
                      color: "var(--text)",
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
                <button
                  type="button"
                  className="btn"
                  onClick={() => onOpenFiche(l.id)}
                >
                  Traiter l&apos;appel
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            File d&apos;attente vide — tous les leads ont été qualifiés. 👏
          </div>
        )}
      </div>
    );
  }

  // Admin and Commercial Dashboard
  const activeLeads = leads.filter(
    (l) => l.stage !== "converti" && l.stage !== "perdu"
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

  const stageCounts = STAGES.map((s) => ({
    ...s,
    n: leads.filter((l) => l.stage === s.key).length,
  }));
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.n));

  return (
    <div className="page active">
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">Chiffre d&apos;affaires (commandes)</div>
          <div className="value">{formatMoney(caTotal)}</div>
          <div className="delta up">{commandes.length} commandes</div>
        </div>
        <div className="kpi">
          <div className="label">Leads actifs</div>
          <div className="value">{activeLeads}</div>
          <div className="delta up">Pipeline en cours</div>
        </div>
        <div className="kpi">
          <div className="label">Taux de conversion</div>
          <div className="value">{tauxConv}%</div>
          <div className={`delta ${tauxConv >= 50 ? "up" : "down"}`}>
            {convertis} convertis / {perdus} perdus
          </div>
        </div>
        <div className="kpi">
          <div className="label">Factures en retard</div>
          <div className="value">{enRetard}</div>
          <div className={`delta ${enRetard ? "down" : "up"}`}>
            {enAttente} commandes en attente
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Entonnoir des leads</h2>
        <p className="sub">
          {isAdmin ? "Vue complète, tous commerciaux" : "Votre portefeuille"}
        </p>
        {stageCounts.map((s) => (
          <div key={s.key} className="funnel-row">
            <span className="fname">{s.label}</span>
            <div className="ftrack">
              <div
                className="ffill"
                style={{
                  width: `${(s.n / maxStage) * 100}%`,
                  background: STAGE_COLOR[s.key],
                }}
              />
            </div>
            <span className="fval">{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
