"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [commercialFilter, setCommercialFilter] = useState("tous");
  const [openMenuLeadId, setOpenMenuLeadId] = useState<string | null>(null);

  const [selectedMobileStage, setSelectedMobileStage] = useState<LeadStage>("a_qualifier");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const stagesToRender = useMemo(() => {
    if (isMobile) {
      return visibleStages.filter((s) => s.key === selectedMobileStage);
    }
    return visibleStages;
  }, [isMobile, visibleStages, selectedMobileStage]);

  // 1. Filtrage dynamique des commerciaux en fonction de la marque sélectionnée
  const filteredCommerciaux = useMemo(() => {
    if (currentBrand && currentBrand !== "all") {
      return commerciaux.filter((c) => c.brand === currentBrand);
    }
    return commerciaux;
  }, [commerciaux, currentBrand]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (isCommercial && l.stage === "a_qualifier") {
        return false;
      }
      if (isAdmin && commercialFilter !== "tous") {
        return l.commercial === commercialFilter;
      }
      return true;
    });
  }, [leads, isCommercial, isAdmin, commercialFilter]);

  const kanbanContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [scrollProgress, setScrollProgress] = useState({ widthPct: 25, leftPct: 0 });
  const [isDraggingTrack, setIsDraggingTrack] = useState(false);

  const updateScrollProgress = useCallback(() => {
    const el = kanbanContainerRef.current;
    if (!el) return;
    const { clientWidth, scrollWidth, scrollLeft } = el;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress({ widthPct: 100, leftPct: 0 });
      return;
    }
    const thumbWidthPercent = Math.max(15, Math.min(100, (clientWidth / scrollWidth) * 100));
    const thumbLeftPercent = Math.max(
      0,
      Math.min(100 - thumbWidthPercent, (scrollLeft / maxScroll) * (100 - thumbWidthPercent))
    );
    setScrollProgress({ widthPct: thumbWidthPercent, leftPct: thumbLeftPercent });
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const el = kanbanContainerRef.current;
    if (!el) return;

    updateScrollProgress();

    el.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateScrollProgress();
      });
      ro.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
      if (ro) ro.disconnect();
    };
  }, [updateScrollProgress, visibleStages, filteredLeads.length]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = kanbanContainerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackWidth = rect.width;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0 || trackWidth <= 0) return;

    const thumbWidth = (scrollProgress.widthPct / 100) * trackWidth;
    const availableTrackWidth = trackWidth - thumbWidth;
    if (availableTrackWidth <= 0) return;

    const targetThumbLeft = clickX - thumbWidth / 2;
    const clickRatio = Math.max(0, Math.min(1, targetThumbLeft / availableTrackWidth));
    const targetScrollLeft = clickRatio * maxScroll;
    el.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  };

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = kanbanContainerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    setIsDraggingTrack(true);
    const startX = e.clientX;
    const startScrollLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const trackRect = track.getBoundingClientRect();
    const trackWidth = trackRect.width;
    const thumbWidth = (scrollProgress.widthPct / 100) * trackWidth;
    const availableTrackWidth = trackWidth - thumbWidth;

    if (availableTrackWidth <= 0 || maxScroll <= 0) return;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaScroll = (deltaX / availableTrackWidth) * maxScroll;
      const newScroll = Math.max(0, Math.min(maxScroll, startScrollLeft + deltaScroll));
      el.scrollLeft = newScroll;

      const thumbWidthPercent = Math.max(15, Math.min(100, (el.clientWidth / el.scrollWidth) * 100));
      const thumbLeftPercent = Math.max(
        0,
        Math.min(100 - thumbWidthPercent, (newScroll / maxScroll) * (100 - thumbWidthPercent))
      );
      setScrollProgress({ widthPct: thumbWidthPercent, leftPct: thumbLeftPercent });
    };

    const onPointerUp = () => {
      setIsDraggingTrack(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Synchroniser l'étape mobile sélectionnée si visibleStages change (ex: commercial vs admin)
  useEffect(() => {
    if (!visibleStages.some((s) => s.key === selectedMobileStage)) {
      if (visibleStages.length > 0) {
        setSelectedMobileStage(visibleStages[0].key);
      }
    }
  }, [visibleStages, selectedMobileStage]);

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

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of visibleStages) {
      counts[s.key] = 0;
    }
    for (const l of filteredLeads) {
      if (counts[l.stage] !== undefined) {
        counts[l.stage]++;
      }
    }
    return counts;
  }, [visibleStages, filteredLeads]);

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
    <div
      className="page active leads-page h-screen max-h-screen overflow-hidden flex flex-col justify-between bg-[#18181A] px-6 pb-4 pt-3"
      style={
        isMobile
          ? undefined
          : {
              height: "100%",
              maxHeight: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
              backgroundColor: "#18181A",
              padding: "14px 24px 14px",
              boxSizing: "border-box",
            }
      }
    >
      {/* Barre d'outils épurée, compacte et minimaliste */}
      <div
        className="toolbar shrink-0 mb-3"
        style={{
          flexShrink: 0,
          marginBottom: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
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
              className="btn-secondary"
              onClick={onSimulateMeta}
            >
              Simuler un lead Meta Ads
            </button>
          )}

          <button type="button" className="btn-create-white" onClick={onCreateLead}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouveau lead
          </button>
        </div>
      </div>

      {/* Barre d'onglets horizontaux défilable pour mobile (md:hidden) */}
      <div className="kanban-mobile-tabs md:hidden" role="tablist" aria-label="Étapes du pipeline">
        {visibleStages.map((s) => {
          const count = stageCounts[s.key] || 0;
          const isActive = selectedMobileStage === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`kanban-mobile-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setSelectedMobileStage(s.key)}
            >
              <span>{s.label}</span>
              <span className="kanban-mobile-tab-count">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns Area */}
      <div
        ref={kanbanContainerRef}
        className="kanban no-scrollbar flex-1 min-h-0 w-full overflow-x-auto flex gap-4 px-6"
        style={
          isMobile
            ? undefined
            : {
                flex: "1 1 0%",
                minHeight: 0,
                width: "100%",
                overflowX: "auto",
                overflowY: "hidden",
                display: "flex",
                gap: "16px",
                padding: 0,
                margin: 0,
                boxSizing: "border-box",
              }
        }
      >
        {stagesToRender.map((s) => {
          const colLeads = filteredLeads.filter((l) => l.stage === s.key);
          const isOver = dragOverStage === s.key;
          const isMobileActive = selectedMobileStage === s.key;

          return (
            <div
              key={s.key}
              ref={(el) => {
                columnRefs.current[s.key] = el;
              }}
              className={`kcol w-[310px] shrink-0 h-full max-h-full flex flex-col bg-[#09090B] rounded-2xl border border-neutral-800/60 overflow-hidden ${isOver ? "dragover" : ""} ${isMobileActive ? "mobile-active" : ""}`}
              style={
                isMobile
                  ? undefined
                  : {
                      width: "310px",
                      minWidth: "310px",
                      maxWidth: "310px",
                      flexShrink: 0,
                      height: "100%",
                      maxHeight: "100%",
                      display: "flex",
                      flexDirection: "column",
                      backgroundColor: "#09090B",
                      borderRadius: "16px",
                      border: "1px solid rgba(38, 38, 38, 0.6)",
                      overflow: "hidden",
                      position: "relative",
                      boxSizing: "border-box",
                    }
              }
              onDragOver={(e) => handleDragOver(e, s.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, s.key)}
            >
              <div
                className="kcol-head shrink-0"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  flexShrink: 0,
                  borderBottom: "1px solid rgba(38, 38, 38, 0.4)",
                  boxSizing: "border-box",
                }}
              >
                <span className="kname">{s.label}</span>
                <span className="kcount">{colLeads.length}</span>
              </div>

              <div
                className="kcol-body flex-1 min-h-0 overflow-y-auto space-y-3 p-3"
                style={
                  isMobile
                    ? undefined
                    : {
                        flex: "1 1 0%",
                        minHeight: 0,
                        height: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        boxSizing: "border-box",
                      }
                }
              >
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
                          {INTERET_NIVEAU[l.fiche.interet]?.label || l.fiche.interet} ·{" "}
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
                          style={{ marginTop: "9px", justifyContent: "flex-start", gap: "6px" }}
                        >
                          <button
                            type="button"
                            className="action-btn-pill"
                            title="Modifier"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLead(l.id);
                            }}
                            aria-label={`Modifier le lead ${l.client}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="action-btn-pill danger"
                            title="Supprimer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLead(l.id);
                            }}
                            aria-label={`Supprimer le lead ${l.client}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      )}

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
                          {lastMsg
                            ? (lastMsg.from === "moi" ? "Vous : " : "") + lastMsg.text
                            : "Lead généré automatiquement..."}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gradient fade mask for smooth bottom card clipping affordance */}
              <div className="kcol-fade-mask" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      {/* Dedicated visible Linear-style horizontal bottom slider track */}
      {!isMobile && (
        <div
          className="shrink-0 w-full flex justify-center items-center py-3 bg-[#18181A] kanban-footer-slider-wrap hidden md:flex"
          style={{
            flexShrink: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingTop: "10px",
            paddingBottom: "2px",
            backgroundColor: "#18181A",
          }}
        >
          <div
            ref={trackRef}
            className="w-[50%] max-w-md h-1.5 bg-neutral-800 rounded-full relative cursor-pointer overflow-hidden kanban-slider-track"
            style={{
              width: "50%",
              maxWidth: "448px",
              height: "6px",
              backgroundColor: "#262626",
              borderRadius: "9999px",
              position: "relative",
              cursor: "pointer",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
            onClick={handleTrackClick}
            role="scrollbar"
            aria-label="Contrôleur de défilement horizontal du pipeline"
            aria-controls="kanban-board"
            aria-valuenow={Math.round(scrollProgress.leftPct)}
          >
            <div
              className={`h-full bg-neutral-300 hover:bg-white rounded-full transition-none kanban-slider-thumb ${isDraggingTrack ? "dragging" : ""}`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                height: "100%",
                backgroundColor: isDraggingTrack ? "#FFFFFF" : "#D4D4D4",
                borderRadius: "9999px",
                width: `${scrollProgress.widthPct}%`,
                left: `${scrollProgress.leftPct}%`,
                cursor: isDraggingTrack ? "grabbing" : "grab",
                transition: "none",
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                willChange: "left, width",
              }}
              onPointerDown={handleThumbPointerDown}
            />
          </div>
        </div>
      )}
    </div>
  );
};
