"use client";

import React, { useState } from "react";
import { User, Commande } from "@/types/crm";

interface CommandesTableProps {
  user: User;
  commandes: Commande[];
  onEdit: (type: "commande", id: string) => void;
  onDelete: (type: "commande", id: string) => void;
  onCreateNew: () => void;
}

const CMD_STATUS: Record<string, { label: string; cls: string }> = {
  en_attente: { label: "En attente", cls: "st-warning" },
  confirmee: { label: "Confirmée", cls: "st-muted" },
  livree: { label: "Livrée", cls: "st-success" },
  annulee: { label: "Annulée", cls: "st-danger" },
};

export const CommandesTable: React.FC<CommandesTableProps> = ({
  user,
  commandes,
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

  const filteredCommandes = commandes.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.client.toLowerCase().includes(q) ||
      (c.produits && c.produits.toLowerCase().includes(q)) ||
      (c.commercial && c.commercial.toLowerCase().includes(q))
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
            placeholder="Rechercher une commande, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn" onClick={onCreateNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle commande
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Client</th>
              <th>Marque</th>
              <th>Produits</th>
              <th>Statut</th>
              <th className="align-r">Montant</th>
              {isAdmin && <th className="align-r">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredCommandes.length > 0 ? (
              filteredCommandes.map((c) => {
                const status = CMD_STATUS[c.statut] || { label: c.statut, cls: "st-muted" };
                return (
                  <tr key={c.id}>
                    <td className="cell-main">{c.id}</td>
                    <td>
                      {c.client}
                      {c.date_label && <div className="cell-sub">{c.date_label}</div>}
                    </td>
                    <td>{brandBadge(c.brand)}</td>
                    <td className="cell-sub">{c.produits || "—"}</td>
                    <td>
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="align-r amount">{formatMoney(c.montant)}</td>
                    {isAdmin && (
                      <td className="align-r">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Modifier"
                            onClick={() => onEdit("commande", c.id)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Supprimer"
                            onClick={() => onDelete("commande", c.id)}
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
                    {search ? "Aucune commande trouvée." : "Aucune commande."}
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
