"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, Lead, LeadStage, CommercialUser } from "@/types/crm";

interface KanbanBoardProps {
  user: User;
  leads: Lead[];
  commerciaux: CommercialUser[];
  onStageChange: (leadId: string, newStage: LeadStage) => Promise<void>;
  onOpenFiche: (leadId: string) => void;
  onOpenWa: (leadId: string) => void;
  onEditLead: (leadId: string) => void;
  onDeleteLead: (leadId: string) => void;
  onSimulateMeta: () => Promise<void>;
  onCreateLead: () => void;
}

const STAGES: Array<{ key: LeadStage; label: string }> = [
  { key: "a_qualifier", label: "À qualifier" },
  { key: "nouveau", label: "Nouveau" },
  { key: "contacte", label: "Contacté" },
  { key: "qualifie", label: "Qualifié" },
  { key: "converti", label: "Converti" },
  { key: "perdu", label: "Perdu" },
];

const INTERET_NIVEAU: Record<string, { label: string; cls: string }> = {
  chaud: { label: "Chaud", cls: "st-danger" },
  tiede: { label: "Tiède", cls: "st-warning" },
  froid: { label: "Froid", cls: "st-muted" },
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  user,
  leads,
  commerciaux,
  onStageChange,
  onOpenFiche,
  onOpenWa,
  onEditLead,
  onDeleteLead,
  onSimulateMeta,
  onCreateLead,
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [commercialFilter, setCommercialFilter] = useState("tous");
  const [activeStageTab, setActiveStageTab] = useState<string>("tous");
  const [openMenuLeadId, setOpenMenuLeadId] = useState<string | null>(null);

  const kanbanContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isAdmin = user.role === "admin";
  const isCentreAppel = user.role === "centre_appel";

  // Close dropdown on click outside
  useEffect(() => {
    const handleDocClick = () => {
      setOpenMenuLeadId(null);
    };
    if (openMenuLeadId) {
      window.addEventListener("click", handleDocClick);
      return () => window.removeEventListener("click", handleDocClick);
    }
  }, [openMenuLeadId]);

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

  const filteredLeads = leads.filter((l) => {
    if (isAdmin && commercialFilter !== "tous") {
      return l.commercial === commercialFilter;
    }
    return true;
  });

  const allStageKeys = ["tous", ...STAGES.map((s) => s.key)];

  const goToPrevStage = () => {
    const currentIndex = allStageKeys.indexOf(activeStageTab);
    const newIndex = currentIndex <= 0 ? allStageKeys.length - 1 : currentIndex - 1;
    setActiveStageTab(allStageKeys[newIndex]);
  };

  const goToNextStage = () => {
    const currentIndex = allStageKeys.indexOf(activeStageTab);
    const newIndex = currentIndex >= allStageKeys.length - 1 ? 0 : currentIndex + 1;
    setActiveStageTab(allStageKeys[newIndex]);
  };

  const handleStageTabClick = (stageKey: string) => {
    setActiveStageTab(stageKey);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedLeadId) return;

    try {
      await onStageChange(draggedLeadId, targetStage);
    } catch (err: any) {
      alert(err.message || "Erreur lors du déplacement du lead.");
    } finally {
      setDraggedLeadId(null);
    }
  };

  const visibleStages =
    activeStageTab === "tous"
      ? STAGES
      : STAGES.filter((s) => s.key === activeStageTab);

  return (
    <div className="page active">
      <div className="toolbar">
        <p className="sub" style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Gérez votre pipeline de conversion ou transférez directement un prospect via le menu à 3 points.
        </p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isAdmin && (
            <select
              id="leads-commercial-filter"
              value={commercialFilter}
              onChange={(e) => setCommercialFilter(e.target.value)}
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "9px",
                padding: "8px 12px",
                color: "var(--text)",
                fontFamily: "inherit",
                fontSize: "0.82rem",
              }}
            >
              <option value="tous">Tous les commerciaux</option>
              {commerciaux.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {(isAdmin || isCentreAppel) && (
            <button
              type="button"
              className="btn-ghost"
              style={{ border: "1px solid var(--border)", borderRadius: "9px" }}
              onClick={onSimulateMeta}
            >
              Simuler un lead Facebook/Instagram
            </button>
          )}

          <button type="button" className="btn" onClick={onCreateLead}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouveau lead
          </button>
        </div>
      </div>

      <div className="kanban-wrapper">
        {/* Navigation bar with stage pills & touch arrows for mobile/tablet */}
        <div className="kanban-nav-bar">
          <div className="kanban-pills" role="tablist" aria-label="Étapes du pipeline">
            <button
              type="button"
              className={`kanban-pill-btn ${activeStageTab === "tous" ? "active" : ""}`}
              onClick={() => handleStageTabClick("tous")}
            >
              <span>Toutes les étapes</span>
              <span className="kanban-pill-count">{filteredLeads.length}</span>
            </button>
            {STAGES.map((s) => {
              const count = filteredLeads.filter((l) => l.stage === s.key).length;
              const isActive = activeStageTab === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`kanban-pill-btn ${isActive ? "active" : ""}`}
                  onClick={() => handleStageTabClick(s.key)}
                >
                  <span>{s.label}</span>
                  <span className="kanban-pill-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="kanban-nav-arrows">
            <button
              type="button"
              className="kanban-arrow-btn"
              title="Étape précédente"
              aria-label="Étape précédente"
              onClick={goToPrevStage}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="kanban-arrow-btn"
              title="Étape suivante"
              aria-label="Étape suivante"
              onClick={goToNextStage}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={kanbanContainerRef}
          className={`kanban ${visibleStages.length === 1 ? "single-stage" : ""}`}
        >
          {visibleStages.map((s) => {
            const colLeads = filteredLeads.filter((l) => l.stage === s.key);
            const isOver = dragOverStage === s.key;

            return (
              <div
                key={s.key}
                ref={(el) => {
                  columnRefs.current[s.key] = el;
                }}
                className={`kcol ${isOver ? "dragover" : ""}`}
                onDragOver={(e) => handleDragOver(e, s.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, s.key)}
              >
                <div className="kcol-head">
                  <span className="kname">{s.label}</span>
                  <span className="kcount">{colLeads.length}</span>
                </div>

                {colLeads.length === 0 && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", padding: "16px 8px", textAlign: "center", fontStyle: "italic" }}>
                    Aucun lead dans cette étape
                  </div>
                )}

                {colLeads.map((l) => {
                  const lastMsg = l.messages && l.messages.length > 0 ? l.messages[l.messages.length - 1] : null;
                  const isDragging = draggedLeadId === l.id;
                  const isMenuOpen = openMenuLeadId === l.id;

                  return (
                    <div
                      key={l.id}
                      className={`kcard ${isDragging ? "dragging" : ""}`}
                      draggable={s.key !== "a_qualifier"}
                      onDragStart={(e) => handleDragStart(e, l.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="kcard-header">
                        <div className="kclient" title={l.client}>
                          {l.client}
                        </div>
                        <div className="kcard-header-actions">
                          {s.key !== "a_qualifier" && (
                            <span
                              className="kcard-grip"
                              title="Glisser pour déplacer dans le pipeline"
                              aria-label="Poignée de déplacement"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="8" cy="6" r="1.6" />
                                <circle cx="16" cy="6" r="1.6" />
                                <circle cx="8" cy="12" r="1.6" />
                                <circle cx="16" cy="12" r="1.6" />
                                <circle cx="8" cy="18" r="1.6" />
                                <circle cx="16" cy="18" r="1.6" />
                              </svg>
                            </span>
                          )}

                          {/* 3-dot dropdown menu for stage transfer */}
                          <div className="kcard-menu-wrap">
                            <button
                              type="button"
                              className={`kcard-dots-btn ${isMenuOpen ? "active" : ""}`}
                              title="Déplacer vers une autre étape"
                              aria-label="Déplacer vers une autre étape"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuLeadId(isMenuOpen ? null : l.id);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>

                            {isMenuOpen && (
                              <div
                                className="kcard-dropdown"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="kcard-dropdown-head">Déplacer vers :</div>
                                {STAGES.map((target) => (
                                  <button
                                    key={target.key}
                                    type="button"
                                    className={`kcard-dropdown-item ${target.key === l.stage ? "current" : ""}`}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setOpenMenuLeadId(null);
                                      if (target.key !== l.stage) {
                                        try {
                                          await onStageChange(l.id, target.key);
                                        } catch (err: any) {
                                          alert(err.message || "Erreur lors du déplacement du lead.");
                                        }
                                      }
                                    }}
                                  >
                                    <span>{target.label}</span>
                                    {target.key === l.stage && (
                                      <span className="stage-check">✓</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {brandBadge(l.brand)}
                        {sourceBadge(l.source)}
                      </div>
                      <div className="kmeta" style={{ marginTop: "8px" }}>
                        <span>{l.commercial || "Non assigné"}</span>
                        <span>{l.date || l.date_label || "—"}</span>
                      </div>

                      {Boolean(l.valeur) && (
                        <div className="kval">{formatMoney(l.valeur)}</div>
                      )}

                      {l.fiche && l.fiche.interet && (
                        <div className="cell-sub" style={{ marginTop: "6px" }}>
                          📋 {INTERET_NIVEAU[l.fiche.interet]?.label || l.fiche.interet} · {l.fiche.budget || ""}
                        </div>
                      )}

                      {l.metaNote && (
                        <div className="cell-sub" style={{ marginTop: "5px" }}>
                          {l.metaNote}
                        </div>
                      )}

                      {s.key === "a_qualifier" && (
                        <button
                          type="button"
                          className="kcard-btn-qualify"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFiche(l.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, flexShrink: 0 }}>
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          Qualifier l&apos;appel
                        </button>
                      )}

                      {isAdmin && (
                        <div className="row-actions" style={{ marginTop: "9px", justifyContent: "flex-start" }}>
                          <button
                            type="button"
                            className="icon-btn"
                            title="Modifier"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLead(l.id);
                            }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Supprimer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLead(l.id);
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      )}

                      {lastMsg && (
                        <div
                          className="kwa"
                          title="Ouvrir la conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenWa(l.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.5 2 2 6.3 2 11.6c0 1.8.5 3.5 1.4 5L2 22l5.6-1.4c1.5.8 3.1 1.2 4.4 1.2 5.5 0 10-4.3 10-9.7S17.5 2 12 2Z" />
                          </svg>
                          <span className="kwa-text">
                            {(lastMsg.from === "moi" ? "Vous : " : "") + lastMsg.text}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
