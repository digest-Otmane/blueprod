"use client";

import React, { useState } from "react";
import { User, Brand } from "@/types/crm";
import { CreateUserModal } from "./CreateUserModal";
import { EditUserModal } from "./EditUserModal";

interface EquipeListProps {
  team: User[];
  onViewAs: (userId: string) => void;
  onRefresh?: () => void;
}

export const EquipeList: React.FC<EquipeListProps> = ({ team, onViewAs, onRefresh }) => {
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const brandLabel = (b: Brand) =>
    b === "lv" ? "La Varenne" : b === "lvt" ? "La Varenne Touch" : "Toutes marques";

  const handleUserCreated = (newUser: User) => {
    setSuccessBanner(`Le compte de ${newUser.name} (${newUser.email}) a été créé avec succès.`);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  const handleUserUpdated = (updatedUser: User) => {
    setSuccessBanner(`Le profil de ${updatedUser.name} (${updatedUser.email}) a été mis à jour.`);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de supprimer l'utilisateur.");
      }

      setSuccessBanner(`L'utilisateur ${userToDelete.name} a été supprimé avec succès.`);
      setUserToDelete(null);
      if (onRefresh) {
        onRefresh();
      }
      setTimeout(() => {
        setSuccessBanner(null);
      }, 6000);
    } catch (err: any) {
      setDeleteError(err.message || "Erreur lors de la suppression de l'utilisateur.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTeam = team.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q) ||
      (u.brand && u.brand.toLowerCase().includes(q))
    );
  });

  const renderCard = (u: User) => {
    return (
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: "1 1 280px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              flex: "none",
              color: u.role === "admin" ? "var(--gold)" : u.brand === "lvt" ? "var(--accent-touch)" : "var(--accent)",
            }}
          >
            {u.initials || "AF"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span>{u.name}</span>
              {u.role === "admin" && (
                <span className="badge" style={{ background: "rgba(227, 180, 83, 0.15)", color: "var(--gold)", border: "1px solid rgba(227, 180, 83, 0.3)", fontSize: "0.68rem" }}>
                  Admin
                </span>
              )}
            </div>
            <div className="cell-sub" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
              {u.email && <span>{u.email} ·</span>}
              <span>
                {u.role === "admin"
                  ? "Administrateur"
                  : u.role === "centre_appel"
                  ? "Centre d'appel"
                  : `Commercial · ${brandLabel(u.brand)}`}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-ghost"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "9px",
              whiteSpace: "nowrap",
            }}
            onClick={() => onViewAs(u.id)}
            title={`Ouvrir le CRM sous la session de ${u.name}`}
          >
            Voir son espace →
          </button>

          <button
            type="button"
            className="icon-btn"
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "all .15s ease",
            }}
            onClick={() => setUserToEdit(u)}
            title="Modifier ce collaborateur"
            aria-label="Modifier"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          <button
            type="button"
            className="icon-btn danger"
            style={{
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "8px",
              background: "var(--danger-bg)",
              border: "1px solid rgba(221, 123, 94, 0.25)",
              color: "var(--danger)",
              cursor: "pointer",
              transition: "all .15s ease",
            }}
            onClick={() => {
              setDeleteError("");
              setUserToDelete(u);
            }}
            title="Supprimer ce collaborateur"
            aria-label="Supprimer"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const admins = filteredTeam.filter((u) => u.role === "admin");
  const centre = filteredTeam.filter((u) => u.role === "centre_appel");
  const lv = filteredTeam.filter((u) => u.role === "commercial" && u.brand === "lv");
  const lvt = filteredTeam.filter((u) => u.role === "commercial" && u.brand === "lvt");
  const otherCommerciaux = filteredTeam.filter((u) => u.role === "commercial" && u.brand !== "lv" && u.brand !== "lvt");

  return (
    <div className="page active">
      <div className="toolbar" style={{ marginBottom: "16px" }}>
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un collaborateur, email, rôle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau collaborateur
        </button>
      </div>

      {successBanner && (
        <div
          style={{
            background: "var(--success-bg)",
            border: "1px solid var(--success)",
            color: "var(--success)",
            padding: "12px 16px",
            borderRadius: "9px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: "0.88rem" }}>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: "4px",
              opacity: 0.8,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <p className="sub" style={{ marginBottom: "16px" }}>
        Gérez les comptes des collaborateurs Alea Food. Vous pouvez modifier leurs rôles et mots de passe, ou ouvrir le CRM exactement comme cette personne le voit.
      </p>

      {admins.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px", fontSize: "1.15rem" }}>Administrateurs</h2>
          {admins.map(renderCard)}
        </>
      )}

      {centre.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px", fontSize: "1.15rem" }}>Centre d&apos;appel</h2>
          {centre.map(renderCard)}
        </>
      )}

      {lv.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px", fontSize: "1.15rem" }}>Commerciaux — La Varenne</h2>
          {lv.map(renderCard)}
        </>
      )}

      {lvt.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px", fontSize: "1.15rem" }}>Commerciaux — La Varenne Touch</h2>
          {lvt.map(renderCard)}
        </>
      )}

      {otherCommerciaux.length > 0 && (
        <>
          <h2 style={{ margin: "22px 0 10px", fontSize: "1.15rem" }}>Commerciaux — Multi-marques</h2>
          {otherCommerciaux.map(renderCard)}
        </>
      )}

      {!admins.length && !centre.length && !lv.length && !lvt.length && !otherCommerciaux.length && (
        <div className="empty-state">Aucun membre d&apos;équipe trouvé.</div>
      )}

      {/* Modal Création Utilisateur */}
      {isCreateModalOpen && (
        <CreateUserModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleUserCreated}
        />
      )}

      {/* Modal Modification Utilisateur */}
      {userToEdit && (
        <EditUserModal
          user={userToEdit}
          onClose={() => setUserToEdit(null)}
          onSuccess={handleUserUpdated}
        />
      )}

      {/* Modal Confirmation Suppression */}
      {userToDelete && (
        <div className="wa-overlay" onClick={() => setUserToDelete(null)}>
          <div
            className="fiche-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="fiche-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--danger)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div className="who" style={{ color: "var(--danger)" }}>Supprimer ce compte ?</div>
                  <div className="sub2">Cette action est irréversible.</div>
                </div>
              </div>
              <button
                type="button"
                className="fiche-modal-close"
                onClick={() => setUserToDelete(null)}
                aria-label="Fermer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="fiche-modal-body" style={{ padding: "20px 24px" }}>
              {deleteError && (
                <div
                  style={{
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger)",
                    color: "var(--danger)",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    marginBottom: "14px",
                  }}
                >
                  {deleteError}
                </div>
              )}

              <p style={{ margin: "0 0 12px", fontSize: "0.92rem", lineHeight: 1.5, color: "var(--text)" }}>
                Êtes-vous sûr de vouloir supprimer définitivement le compte de <strong>{userToDelete.name}</strong> ({userToDelete.email}) ?
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                L&apos;utilisateur ne pourra plus se connecter et ses identifiants seront supprimés de la base de données.
              </p>
            </div>

            <div className="fiche-modal-foot">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  color: "#fff",
                }}
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Suppression en cours..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
