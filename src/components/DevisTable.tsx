"use client";

import React, { useState } from "react";
import { User, Devis } from "@/types/crm";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

interface DevisTableProps {
  user: User;
  devis: Devis[];
  onEdit: (type: "devis", id: string) => void;
  onDelete: (type: "devis", id: string) => void;
  onCreateNew: () => void;
}

const DEVIS_STATUS: Record<string, { label: string; cls: string }> = {
  brouillon: { label: "Brouillon", cls: "st-muted" },
  envoye: { label: "Envoyé", cls: "st-warning" },
  accepte: { label: "Accepté", cls: "st-success" },
  refuse: { label: "Refusé", cls: "st-danger" },
};

export const DevisTable: React.FC<DevisTableProps> = ({
  user,
  devis,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  const [search, setSearch] = useState("");
  const [previewDevisId, setPreviewDevisId] = useState<string | null>(null);
  const isAdmin = user.role === "admin";
  const canManage = isAdmin || user.role === "commercial";

  const formatMoney = (n: number) =>
    Number(n || 0).toLocaleString("fr-FR") + " DH";

  const brandBadge = (b: "lv" | "lvt") => (
    <span className={`badge ${b === "lv" ? "brand-lv" : "brand-lvt"}`}>
      {b === "lv" ? "La Varenne" : "La Varenne Touch"}
    </span>
  );

  const filteredDevis = devis.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.client.toLowerCase().includes(q) ||
      (d.commercial && d.commercial.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page active">
      <div className="toolbar">
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un devis, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn-create-white" onClick={onCreateNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau devis
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>CLIENT</th>
              <th>MARQUE</th>
              <th>STATUT</th>
              <th className="align-r">MONTANT</th>
              {canManage && <th className="align-r">ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {filteredDevis.length > 0 ? (
              filteredDevis.map((d) => {
                const status = DEVIS_STATUS[d.statut] || { label: d.statut, cls: "st-muted" };
                return (
                  <tr key={d.id}>
                    <td className="cell-main">{d.id}</td>
                    <td>
                      {d.client}
                      {d.date_label && <div className="cell-sub">{d.date_label}</div>}
                    </td>
                    <td>{brandBadge(d.brand)}</td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="align-r amount">{formatMoney(d.montant)}</td>
                    {canManage && (
                      <td className="align-r">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="action-btn-pill"
                            title="Aperçu & Impression PDF"
                            onClick={() => setPreviewDevisId(d.id)}
                            aria-label={`Aperçu et impression du devis ${d.id}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="action-btn-pill"
                            title="Modifier"
                            onClick={() => onEdit("devis", d.id)}
                            aria-label={`Modifier le devis ${d.id}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {(isAdmin || d.statut === "brouillon") && (
                            <button
                              type="button"
                              className="action-btn-pill danger"
                              title="Supprimer"
                              onClick={() => onDelete("devis", d.id)}
                              aria-label={`Supprimer le devis ${d.id}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={canManage ? 6 : 5}>
                  <div className="empty-state">
                    {search ? "Aucun devis trouvé." : "Aucun devis."}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Interactive In-App PDF Preview Modal */}
      {previewDevisId && (
        <DocumentPreviewModal
          type="devis"
          id={previewDevisId}
          onClose={() => setPreviewDevisId(null)}
        />
      )}
    </div>
  );
};

