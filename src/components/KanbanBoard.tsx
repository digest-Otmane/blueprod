"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { User, Lead, LeadStage, CommercialUser, Brand } from "@/types/crm";

interface KanbanBoardProps {
  user: User;
  leads: Lead[];
  commerciaux: CommercialUser[];
  currentBrand?: Brand;
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
  currentBrand = "all",
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
  const [openMenuLeadId, setOpenMenuLeadId] = useState<string | null>(null);

  const kanbanContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isAdmin = user.role === "admin";
  const isCentreAppel = user.role === "centre_appel";
  const isCommercial = user.role === "commercial";

  // Les commerciaux ne voient pas l'étape brute "À qualifier" (réservée au Centre d'Appel / Admin)
  const visibleStages = useMemo(() => {
    if (isCommercial) {
      return STAGES.filter((s) => s.key !== "a_qualifier");
    }
    return STAGES;
  }, [isCommercial]);

  // 1. Filtrage dynamique des commerciaux en fonction de la marque sélectionnée
  const filteredCommerciaux = useMemo(() => {
    if (currentBrand && currentBrand !== "all") {
      return commerciaux.filter((c) => c.brand === currentBrand);
    }
    return commerciaux;
  }, [commerciaux, currentBrand]);

  // Réinitialiser le filtre si le commercial sélectionné ne correspond plus à la marque active
  useEffect(() => {
    if (commercialFilter !== "tous") {
      const exists = filteredCommerciaux.some((c) => c.name === commercialFilter);
      if (!exists) {
        setCommercialFilter("tous");
      }
    }
  }, [filteredCommerciaux, commercialFilter]);

  // Fermer le menu dropdown sur clic extérieur
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
    if (isCommercial && l.stage === "a_qualifier") {
      return false;
    }
    if (isAdmin && commercialFilter !== "tous") {
      return l.commercial === commercialFilter;
    }
    return true;
  });

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
    if (isCommercial && targetStage === "a_qualifier") return;

    try {
      await onStageChange(draggedLeadId, targetStage);
    } catch (err: any) {
      alert(err.message || "Erreur lors du déplacement du lead.");
    } finally {
      setDraggedLeadId(null);
    }
  };

  return (
    <div className="page active">
      {/* Barre d'outils épurée, compacte et minimaliste */}
      <div className="toolbar" style={{ marginBottom: "16px" }}>
        <p className="sub" style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.84rem" }}>
          Pipeline de conversion commercial · {filteredLeads.length} lead{filteredLeads.length > 1 ? "s" : ""}
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
                cursor: "pointer",
              }}
            >
              <option value="tous">
                {currentBrand === "lv"
                  ? "Tous les commerciaux (La Varenne)"
                  : currentBrand === "lvt"
                  ? "Tous les commerciaux (Touch)"
                  : "Tous les commerciaux"}
              </option>
              {filteredCommerciaux.map((c) => (
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
              Simuler un lead Meta Ads
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
        <div ref={kanbanContainerRef} className="kanban">
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
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.78rem",
                      padding: "24px 8px",
                      textAlign: "center",
                      fontStyle: "italic",
                      opacity: 0.7,
                    }}
                  >
                    Aucun lead dans cette étape
                  </div>
                )}

                {colLeads.map((l) => {
                  const lastMsg =
                    l.messages && l.messages.length > 0
                      ? l.messages[l.messages.length - 1]
                      : null;
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

                          {/* Bouton direct WhatsApp */}
                          <button
                            type="button"
                            className="kcard-wa-btn"
                            title="Discuter sur WhatsApp"
                            aria-label="Discuter sur WhatsApp"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenWa(l.id);
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.5 2 2 6.3 2 11.6c0 1.8.5 3.5 1.4 5L2 22l5.6-1.4c1.5.8 3.1 1.2 4.4 1.2 5.5 0 10-4.3 10-9.7S17.5 2 12 2Z" />
                            </svg>
                            {l.messages && l.messages.length > 0 && (
                              <span className="kcard-wa-count">{l.messages.length}</span>
                            )}
                          </button>

                          {/* Menu 3 points pour transfert d'étape */}
                          <div className="kcard-menu-wrap">
                            <button
                              type="button"
                              className={`kcard-dots-btn ${isMenuOpen ? "active" : ""}`}
                              title="Options du lead"
                              aria-label="Options du lead"
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
                                <button
                                  type="button"
                                  className="kcard-dropdown-item wa-action"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuLeadId(null);
                                    onOpenWa(l.id);
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, color: "#3FBF63" }}>
                                    <path d="M12 2C6.5 2 2 6.3 2 11.6c0 1.8.5 3.5 1.4 5L2 22l5.6-1.4c1.5.8 3.1 1.2 4.4 1.2 5.5 0 10-4.3 10-9.7S17.5 2 12 2Z" />
                                  </svg>
                                  <span>Chat WhatsApp</span>
                                </button>
                                <div className="kcard-dropdown-divider" />
                                <div className="kcard-dropdown-head">Déplacer vers :</div>
                                {visibleStages.map((target) => (
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
                                          alert(
                                            err.message ||
                                              "Erreur lors du déplacement du lead."
                                          );
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
                          📋 {INTERET_NIVEAU[l.fiche.interet]?.label || l.fiche.interet} ·{" "}
                          {l.fiche.budget || ""}
                        </div>
                      )}

                      {l.metaNote && (
                        <div className="cell-sub" style={{ marginTop: "5px" }}>
                          {l.metaNote}
                        </div>
                      )}

                      {/* RÈGLE STRICTE : "Qualifier l'appel" uniquement pour Admin et Centre d'Appel (JAMAIS pour les Commerciaux) */}
                      {!isCommercial && (isAdmin || isCentreAppel) && s.key === "a_qualifier" && (
                        <button
                          type="button"
                          className="kcard-btn-qualify"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFiche(l.id);
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{ width: 14, height: 14, flexShrink: 0 }}
                          >
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          Qualifier l&apos;appel
                        </button>
                      )}

                      {isAdmin && (
                        <div
                          className="row-actions"
                          style={{ marginTop: "9px", justifyContent: "flex-start" }}
                        >
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

                      {lastMsg ? (
                        <div
                          className="kwa"
                          title="Ouvrir la conversation WhatsApp"
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
                      ) : (
                        <button
                          type="button"
                          className="kcard-wa-start-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenWa(l.id);
                          }}
                          title="Lancer une conversation WhatsApp avec ce lead"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.5 2 2 6.3 2 11.6c0 1.8.5 3.5 1.4 5L2 22l5.6-1.4c1.5.8 3.1 1.2 4.4 1.2 5.5 0 10-4.3 10-9.7S17.5 2 12 2Z" />
                          </svg>
                          <span>Chat WhatsApp</span>
                        </button>
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
