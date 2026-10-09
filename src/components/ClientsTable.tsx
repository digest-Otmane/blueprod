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
      <div className="toolbar" style={{ marginBottom: "20px" }}>
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
        <button type="button" className="btn-create-white" onClick={onCreateNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
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
              <th>CLIENT</th>
              <th>SECTEUR</th>
              <th>MARQUE (S)</th>
              <th>CONTACT</th>
              <th>COMMERCIAL</th>
              {isAdmin && <th className="align-r">ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {filteredClients.length > 0 ? (
              filteredClients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-main">{c.nom}</div>
                    {c.ville && <div className="cell-sub">{c.ville}</div>}
                  </td>
                  <td className="cell-secteur">{c.secteur || "—"}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                      {(Array.isArray(c.brands)
                        ? c.brands
                        : typeof c.brands === "string"
                        ? c.brands.split(",")
                        : []
                      )
                        .filter(Boolean)
                        .map(brandBadge)}
                    </div>
                  </td>
                  <td>
                    <div className="cell-contact-name">{c.contact || "—"}</div>
                    {c.tel && <div className="cell-sub">{c.tel}</div>}
                  </td>
                  <td className="cell-commercial">{c.commercial || "—"}</td>
                  {isAdmin && (
                    <td className="align-r">
                      <div className="row-actions" style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="action-btn-pill"
                          title="Modifier"
                          onClick={() => onEdit("client", c.id)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: 14, height: 14 }}
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="action-btn-pill"
                          title="Supprimer"
                          onClick={() => onDelete("client", c.id)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: 14, height: 14 }}
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
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
