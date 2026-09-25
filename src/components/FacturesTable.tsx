"use client";

import React, { useState } from "react";
import { User, Facture } from "@/types/crm";

interface FacturesTableProps {
  user: User;
  factures: Facture[];
  onEdit: (type: "facture", id: string) => void;
  onDelete: (type: "facture", id: string) => void;
  onCreateNew: () => void;
}

const FACT_STATUS: Record<string, { label: string; cls: string }> = {
  emise: { label: "Émise", cls: "st-muted" },
  payee: { label: "Payée", cls: "st-success" },
  retard: { label: "En retard", cls: "st-danger" },
};

export const FacturesTable: React.FC<FacturesTableProps> = ({
  user,
  factures,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  const [search, setSearch] = useState("");
  const isAdmin = user.role === "admin";

  const formatMoney = (n: number) =>
    Number(n || 0).toLocaleString("fr-FR") + " DH";

  const brandBadge = (b: "lv" | "lvt") => (
    <span className={`badge ${b === "lv" ? "brand-lv" : "brand-lvt"}`}>
      {b === "lv" ? "La Varenne" : "La Varenne Touch"}
    </span>
  );

  const filteredFactures = factures.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.id.toLowerCase().includes(q) ||
      f.client.toLowerCase().includes(q) ||
      (f.commercial && f.commercial.toLowerCase().includes(q))
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
            placeholder="Rechercher une facture, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn" onClick={onCreateNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle facture
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Client</th>
              <th>Marque</th>
              <th>Statut</th>
              <th>Échéance</th>
              <th className="align-r">Montant</th>
              {isAdmin && <th className="align-r">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredFactures.length > 0 ? (
              filteredFactures.map((f) => {
                const status = FACT_STATUS[f.statut] || { label: f.statut, cls: "st-muted" };
                return (
                  <tr key={f.id}>
                    <td className="cell-main">{f.id}</td>
                    <td>
                      {f.client}
                      {f.date_label && <div className="cell-sub">{f.date_label}</div>}
                    </td>
                    <td>{brandBadge(f.brand)}</td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="cell-sub">{f.echeance || "—"}</td>
                    <td className="align-r amount">{formatMoney(f.montant)}</td>
                    {isAdmin && (
                      <td className="align-r">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Modifier"
                            onClick={() => onEdit("facture", f.id)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Supprimer"
                            onClick={() => onDelete("facture", f.id)}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isAdmin ? 7 : 6}>
                  <div className="empty-state">
                    {search ? "Aucune facture trouvée." : "Aucune facture."}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
