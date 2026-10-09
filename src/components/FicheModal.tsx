"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lead, CommercialUser, LeadInterest } from "@/types/crm";

interface FicheModalProps {
  lead: Lead | null;
  commerciaux: CommercialUser[];
  onClose: () => void;
  onSubmit: (leadId: string, data: any) => Promise<void>;
  onOpenWa?: (leadId: string) => void;
}

const BESOIN_TAGS = [
  "Café / Compléments",
  "Tables & chaises",
  "Machines à café",
  "Moulins",
  "Autre",
];

const BUDGET_RANGES = [
  "Moins de 10 000 DH",
  "10 000 – 30 000 DH",
  "30 000 – 60 000 DH",
  "Plus de 60 000 DH",
];

const DISPO_OPTIONS = ["Matin", "Après-midi", "Soir"];

export const FicheModal: React.FC<FicheModalProps> = ({
  lead,
  commerciaux,
  onClose,
  onSubmit,
  onOpenWa,
}) => {
  const [besoins, setBesoins] = useState<string[]>([]);
  const [budget, setBudget] = useState(BUDGET_RANGES[0]);
  const [dispo, setDispo] = useState(DISPO_OPTIONS[0]);
  const [interet, setInteret] = useState<LeadInterest>("chaud");
  const [notes, setNotes] = useState("");
  const [commercialName, setCommercialName] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter sales reps matching lead brand strictly
  const filteredCommerciaux = useMemo(() => {
    return commerciaux.filter((c) => !lead || c.brand === lead.brand);
  }, [commerciaux, lead]);

  useEffect(() => {
    if (filteredCommerciaux.length > 0) {
      const exists = filteredCommerciaux.some((c) => c.name === commercialName);
      if (!exists) {
        setCommercialName(filteredCommerciaux[0].name);
      }
    } else {
      setCommercialName("");
    }
  }, [filteredCommerciaux, commercialName]);

  if (!lead) return null;

  const toggleBesoin = (tag: string) => {
    setBesoins((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commercialName) {
      alert("Veuillez choisir un commercial destinataire.");
      return;
    }

    const assigned = filteredCommerciaux.find((c) => c.name === commercialName);

    setLoading(true);
    try {
      await onSubmit(lead.id, {
        besoin: besoins.length > 0 ? besoins.join(", ") : "Non précisé",
        budget,
        dispo,
        notes: notes.trim() || "—",
        interet,
        commercial: commercialName,
        commercial_id: assigned?.id || null,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la soumission de la fiche.");
    } finally {
      setLoading(false);
    }
  };

  const brandLabel = (b: "lv" | "lvt") =>
    b === "lv" ? "La Varenne" : "La Varenne Touch";

  return (
    <div className="wa-overlay" onClick={onClose}>
      <form
        className="fiche-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="fiche-modal-head">
          <div>
            <div className="who">{lead.client}</div>
            <div className="sub2">
              {brandLabel(lead.brand)}
              {lead.tel ? ` · ${lead.tel}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            {onOpenWa && (
              <button
                type="button"
                className="btn-ghost"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.78rem",
                  color: "#3FBF63",
                  border: "1px solid rgba(63, 191, 99, 0.3)",
                  background: "rgba(63, 191, 99, 0.08)",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
                onClick={() => onOpenWa(lead.id)}
                title="Ouvrir la conversation WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                  <path d="M12 2C6.5 2 2 6.3 2 11.6c0 1.8.5 3.5 1.4 5L2 22l5.6-1.4c1.5.8 3.1 1.2 4.4 1.2 5.5 0 10-4.3 10-9.7S17.5 2 12 2Z" />
                </svg>
                Chat WhatsApp
              </button>
            )}
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
        </div>

        <div className="fiche-modal-body">
          <div className="fiche-field">
            <label>Besoin / produits</label>
            <div className="fiche-chips">
              {BESOIN_TAGS.map((tag) => (
                <label key={tag} className="fiche-chip">
                  <input
                    type="checkbox"
                    checked={besoins.includes(tag)}
                    onChange={() => toggleBesoin(tag)}
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="fiche-row2">
            <div className="fiche-field">
              <label>Budget approximatif</label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                {BUDGET_RANGES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="fiche-field">
              <label>Disponibilité</label>
              <select
                value={dispo}
                onChange={(e) => setDispo(e.target.value)}
              >
                {DISPO_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fiche-field">
            <label>Niveau d&apos;intérêt</label>
            <div className="fiche-chips">
              <label className="fiche-chip fiche-radio">
                <input
                  type="radio"
                  name="fiche-interet"
                  value="chaud"
                  checked={interet === "chaud"}
                  onChange={() => setInteret("chaud")}
                />
                <span>Chaud</span>
              </label>
              <label className="fiche-chip fiche-radio">
                <input
                  type="radio"
                  name="fiche-interet"
                  value="tiede"
                  checked={interet === "tiede"}
                  onChange={() => setInteret("tiede")}
                />
                <span>Tiède</span>
              </label>
              <label className="fiche-chip fiche-radio">
                <input
                  type="radio"
                  name="fiche-interet"
                  value="froid"
                  checked={interet === "froid"}
                  onChange={() => setInteret("froid")}
                />
                <span>Froid</span>
              </label>
            </div>
          </div>

          <div className="fiche-field">
            <label>Notes libres — résumé de l&apos;appel</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Détails de l'échange téléphonique..."
            />
          </div>

          <div className="fiche-field">
            <label>Transmettre à</label>
            <select
              value={commercialName}
              onChange={(e) => setCommercialName(e.target.value)}
              required
            >
              {filteredCommerciaux.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="fiche-modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Transmission..." : "Transmettre au commercial"}
          </button>
        </div>
      </form>
    </div>
  );
};
