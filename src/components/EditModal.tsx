"use client";

import React, { useState, useEffect } from "react";
import { CommercialUser } from "@/types/crm";

interface EditModalProps {
  target: { type: string; id: string; item: any } | null;
  commerciaux: CommercialUser[];
  onClose: () => void;
  onSave: (type: string, id: string, data: any) => Promise<void>;
}

export const EditModal: React.FC<EditModalProps> = ({
  target,
  commerciaux,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (target?.item) {
      setFormData({ ...target.item });
    }
  }, [target]);

  if (!target || !target.item) return null;

  const { type, id, item } = target;

  const getTitle = () => {
    switch (type) {
      case "client":
        return `Modifier — ${item.nom}`;
      case "lead":
        return `Modifier — ${item.client}`;
      default:
        return `Modifier — ${item.id}`;
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case "client":
        return "Fiche client";
      case "lead":
        return "Lead commercial";
      case "commande":
        return `Commande de ${item.client}`;
      case "devis":
        return `Devis pour ${item.client}`;
      case "facture":
        return `Facture de ${item.client}`;
      default:
        return "";
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(type, id, formData);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="who">{getTitle()}</div>
            <div className="sub2">{getSubtitle()}</div>
          </div>
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

        <div className="fiche-modal-body">
          {type === "client" && (
            <>
              <div className="edit-field">
                <label>Nom du client</label>
                <input
                  type="text"
                  value={formData.nom || ""}
                  onChange={(e) => handleChange("nom", e.target.value)}
                  required
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Ville</label>
                  <input
                    type="text"
                    value={formData.ville || ""}
                    onChange={(e) => handleChange("ville", e.target.value)}
                  />
                </div>
                <div className="edit-field">
                  <label>Secteur d&apos;activité</label>
                  <input
                    type="text"
                    value={formData.secteur || ""}
                    onChange={(e) => handleChange("secteur", e.target.value)}
                  />
                </div>
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Contact</label>
                  <input
                    type="text"
                    value={formData.contact || ""}
                    onChange={(e) => handleChange("contact", e.target.value)}
                  />
                </div>
                <div className="edit-field">
                  <label>Téléphone</label>
                  <input
                    type="text"
                    value={formData.tel || ""}
                    onChange={(e) => handleChange("tel", e.target.value)}
                  />
                </div>
              </div>
              <div className="edit-field">
                <label>Commercial assigné</label>
                <select
                  value={formData.commercial || ""}
                  onChange={(e) => handleChange("commercial", e.target.value)}
                >
                  <option value="">Non assigné</option>
                  {commerciaux.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {type === "lead" && (
            <>
              <div className="edit-field">
                <label>Nom du prospect</label>
                <input
                  type="text"
                  value={formData.client || ""}
                  onChange={(e) => handleChange("client", e.target.value)}
                  required
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Marque</label>
                  <select
                    value={formData.brand || "lv"}
                    onChange={(e) => handleChange("brand", e.target.value)}
                  >
                    <option value="lv">La Varenne</option>
                    <option value="lvt">La Varenne Touch</option>
                  </select>
                </div>
                <div className="edit-field">
                  <label>Valeur estimée (DH)</label>
                  <input
                    type="number"
                    value={formData.valeur ?? 0}
                    onChange={(e) => handleChange("valeur", Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Étape du pipeline</label>
                  <select
                    value={formData.stage || "nouveau"}
                    onChange={(e) => handleChange("stage", e.target.value)}
                  >
                    <option value="a_qualifier">À qualifier</option>
                    <option value="nouveau">Nouveau</option>
                    <option value="contacte">Contacté</option>
                    <option value="qualifie">Qualifié</option>
                    <option value="converti">Converti</option>
                    <option value="perdu">Perdu</option>
                  </select>
                </div>
                <div className="edit-field">
                  <label>Commercial assigné</label>
                  <select
                    value={formData.commercial || ""}
                    onChange={(e) => handleChange("commercial", e.target.value)}
                  >
                    <option value="">Non assigné</option>
                    {commerciaux.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {type === "commande" && (
            <>
              <div className="edit-field">
                <label>Client</label>
                <input
                  type="text"
                  value={formData.client || ""}
                  onChange={(e) => handleChange("client", e.target.value)}
                  required
                />
              </div>
              <div className="edit-field">
                <label>Produits commandés</label>
                <input
                  type="text"
                  value={formData.produits || ""}
                  onChange={(e) => handleChange("produits", e.target.value)}
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Montant (DH)</label>
                  <input
                    type="number"
                    value={formData.montant ?? 0}
                    onChange={(e) => handleChange("montant", Number(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="edit-field">
                  <label>Statut</label>
                  <select
                    value={formData.statut || "en_attente"}
                    onChange={(e) => handleChange("statut", e.target.value)}
                  >
                    <option value="en_attente">En attente</option>
                    <option value="confirmee">Confirmée</option>
                    <option value="livree">Livrée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {type === "devis" && (
            <>
              <div className="edit-field">
                <label>Client</label>
                <input
                  type="text"
                  value={formData.client || ""}
                  onChange={(e) => handleChange("client", e.target.value)}
                  required
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Montant (DH)</label>
                  <input
                    type="number"
                    value={formData.montant ?? 0}
                    onChange={(e) => handleChange("montant", Number(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="edit-field">
                  <label>Statut</label>
                  <select
                    value={formData.statut || "brouillon"}
                    onChange={(e) => handleChange("statut", e.target.value)}
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="envoye">Envoyé</option>
                    <option value="accepte">Accepté</option>
                    <option value="refuse">Refusé</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {type === "facture" && (
            <>
              <div className="edit-field">
                <label>Client</label>
                <input
                  type="text"
                  value={formData.client || ""}
                  onChange={(e) => handleChange("client", e.target.value)}
                  required
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Montant (DH)</label>
                  <input
                    type="number"
                    value={formData.montant ?? 0}
                    onChange={(e) => handleChange("montant", Number(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="edit-field">
                  <label>Statut</label>
                  <select
                    value={formData.statut || "emise"}
                    onChange={(e) => handleChange("statut", e.target.value)}
                  >
                    <option value="emise">Émise</option>
                    <option value="payee">Payée</option>
                    <option value="retard">En retard</option>
                  </select>
                </div>
              </div>
              <div className="edit-field">
                <label>Échéance</label>
                <input
                  type="text"
                  value={formData.echeance || ""}
                  onChange={(e) => handleChange("echeance", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="fiche-modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
};
