"use client";

import React from "react";
import { User, Brand } from "@/types/crm";

interface EquipeListProps {
  team: User[];
  onViewAs: (userId: string) => void;
}

export const EquipeList: React.FC<EquipeListProps> = ({ team, onViewAs }) => {
  const brandLabel = (b: Brand) =>
    b === "lv" ? "La Varenne" : b === "lvt" ? "La Varenne Touch" : "Toutes marques";

  const renderCard = (u: User) => (
    <div
      key={u.id}
      className="panel"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        marginBottom: "10px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "var(--surface-alt)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            flex: "none",
          }}
        >
          {u.initials}
        </div>
        <div>
          <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600 }}>{u.name}</div>
          <div className="cell-sub">
            {u.role === "centre_appel"
              ? "Centre d'appel"
              : `Commercial · ${brandLabel(u.brand)}`}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn-ghost"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "9px",
          whiteSpace: "nowrap",
        }}
        onClick={() => onViewAs(u.id)}
      >
        Voir son espace →
      </button>
    </div>
  );

  const centre = team.filter((u) => u.role === "centre_appel");
  const lv = team.filter((u) => u.role === "commercial" && u.brand === "lv");
  const lvt = team.filter((u) => u.role === "commercial" && u.brand === "lvt");

  return (
    <div className="page active">
      <p className="sub" style={{ marginBottom: "6px" }}>
        Cliquez sur &quot;Voir son espace&quot; pour ouvrir le CRM exactement comme cette personne le voit — mêmes données, mêmes restrictions, sans connaître son mot de passe.
      </p>

      {centre.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px" }}>Centre d&apos;appel</h2>
          {centre.map(renderCard)}
        </>
      )}

      {lv.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px" }}>Commerciaux — La Varenne</h2>
          {lv.map(renderCard)}
        </>
      )}

      {lvt.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px" }}>Commerciaux — La Varenne Touch</h2>
          {lvt.map(renderCard)}
        </>
      )}

      {!centre.length && !lv.length && !lvt.length && (
        <div className="empty-state">Aucun membre d&apos;équipe trouvé.</div>
      )}
    </div>
  );
};
