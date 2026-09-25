"use client";

import React, { useState } from "react";
import { User, Client } from "@/types/crm";

interface ClientsTableProps {
  user: User;
  clients: Client[];
  onEdit: (type: "client", id: string) => void;
  onDelete: (type: "client", id: string) => void;
  onCreateNew: () => void;
}

export const ClientsTable: React.FC<ClientsTableProps> = ({
  user,
  clients,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  const [search, setSearch] = useState("");
  const isAdmin = user.role === "admin";

  const brandBadge = (b: string) => (
    <span
      key={b}
      className={`badge ${b === "lv" ? "brand-lv" : "brand-lvt"}`}
      style={{ marginRight: "4px" }}
    >
      {b === "lv" ? "La Varenne" : "La Varenne Touch"}
    </span>
  );

  const filteredClients = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.nom.toLowerCase().includes(q) ||
      (c.ville && c.ville.toLowerCase().includes(q)) ||
      (c.secteur && c.secteur.toLowerCase().includes(q)) ||
      (c.contact && c.contact.toLowerCase().includes(q)) ||
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
            placeholder="Rechercher un client, ville, secteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn" onClick={onCreateNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau client
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Secteur</th>
              <th>Marque(s)</th>
              <th>Contact</th>
              <th>Commercial</th>
              {isAdmin && <th className="align-r">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredClients.length > 0 ? (
              filteredClients.map((c) => (
                <tr key={c.id}>
                  <td className="cell-main">
                    {c.nom}
                    {c.ville && <div className="cell-sub">{c.ville}</div>}
                  </td>
                  <td className="cell-sub">{c.secteur || "—"}</td>
                  <td>{(c.brands || []).map(brandBadge)}</td>
                  <td>
                    {c.contact || "—"}
                    {c.tel && <div className="cell-sub">{c.tel}</div>}
                  </td>
                  <td>{c.commercial || "—"}</td>
                  {isAdmin && (
                    <td className="align-r">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Modifier"
                          onClick={() => onEdit("client", c.id)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Supprimer"
                          onClick={() => onDelete("client", c.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 6 : 5}>
                  <div className="empty-state">
                    {search ? "Aucun client ne correspond à votre recherche." : "Aucun client."}
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
