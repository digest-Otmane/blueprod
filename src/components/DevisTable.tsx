"use client";

import React, { useState } from "react";
import { User, Devis } from "@/types/crm";

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
  const isAdmin = user.role === "admin";

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
        <button type="button" className="btn" onClick={onCreateNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <th>Client</th>
              <th>Marque</th>
              <th>Statut</th>
              <th className="align-r">Montant</th>
              {isAdmin && <th className="align-r">Actions</th>}
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
                    {isAdmin && (
                      <td className="align-r">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Modifier"
                            onClick={() => onEdit("devis", d.id)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Supprimer"
                            onClick={() => onDelete("devis", d.id)}
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
                <td colSpan={isAdmin ? 6 : 5}>
                  <div className="empty-state">
                    {search ? "Aucun devis trouvé." : "Aucun devis."}
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
