"use client";

import React, { useState, useEffect } from "react";
import { CommercialUser } from "@/types/crm";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

interface EditModalProps {
  target: { type: string; id: string; item: any } | null;
  commerciaux: CommercialUser[];
  onClose: () => void;
  onSave: (type: string, id: string, data: any) => Promise<void>;
  onOpenWa?: (leadId: string) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  target,
  commerciaux,
  onClose,
  onSave,
  onOpenWa,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);

  // Marque active de l'élément en cours de modification
  const activeBrand =
    formData.brand ||
    (formData.brands === "lvt" ? "lvt" : formData.brands === "lv" ? "lv" : null) ||
    target?.item?.brand ||
    null;

  const filteredCommerciaux = React.useMemo(() => {
    if (activeBrand && activeBrand !== "all") {
      return commerciaux.filter((c) => c.brand === activeBrand);
    }
    return commerciaux;
  }, [commerciaux, activeBrand]);

  useEffect(() => {
    if (target?.item) {
      setFormData({ ...target.item });
    }
  }, [target]);

  // Réinitialiser le commercial si la marque change et qu'il n'appartient plus à cette marque
  useEffect(() => {
    if (formData.commercial && filteredCommerciaux.length > 0) {
      const exists = filteredCommerciaux.some((c) => c.name === formData.commercial);
      if (!exists && target?.type !== "lead") {
        setFormData((prev) => ({ ...prev, commercial: "" }));
      }
    }
  }, [filteredCommerciaux, formData.commercial, target?.type]);

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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            {type === "lead" && onOpenWa && (
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
                onClick={() => onOpenWa(id)}
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
                <label>Type de besoin principal</label>
                <select
                  value={formData.need_type || "achat_cafe"}
                  onChange={(e) => handleChange("need_type", e.target.value)}
                >
                  <option value="achat_cafe">Achat de café (Grains, moulu, capsules)</option>
                  <option value="equipement_cafe">Équipement café (Machines, moulins)</option>
                  <option value="mixte">Mixte (Café + Équipement)</option>
                </select>
              </div>
              <div className="edit-field">
                <label>Commercial assigné</label>
                <select
                  value={formData.commercial || ""}
                  onChange={(e) => handleChange("commercial", e.target.value)}
                >
                  <option value="">Non assigné</option>
                  {filteredCommerciaux.map((c) => (
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
                    {filteredCommerciaux.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="edit-field">
                <label>Besoin du prospect</label>
                <select
                  value={formData.need_type || "achat_cafe"}
                  onChange={(e) => handleChange("need_type", e.target.value)}
                >
                  <option value="achat_cafe">Achat de café (Grains, moulu, capsules)</option>
                  <option value="equipement_cafe">Équipement café (Machine, moulin)</option>
                  <option value="mixte">Mixte (Café + Machine)</option>
                </select>
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
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Type de commande</label>
                  <select
                    value={formData.need_type || "achat_cafe"}
                    onChange={(e) => handleChange("need_type", e.target.value)}
                  >
                    <option value="achat_cafe">Achat de café (Consommables)</option>
                    <option value="equipement_cafe">Équipement café (Matériel)</option>
                    <option value="mixte">Commande mixte</option>
                  </select>
                </div>
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

          {type === "devis" && (() => {
            const currentStatut = target.item.statut || "brouillon";
            const isBrouillon = currentStatut === "brouillon";
            const isAccepte = currentStatut === "accepte";
            const isRefuse = currentStatut === "refuse";

            return (
              <>
                {!isBrouillon && !isAccepte && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#D4D4D8",
                      fontSize: "0.82rem",
                      marginBottom: 12,
                    }}
                  >
                    Ce devis est au statut &laquo; {currentStatut} &raquo;. Seuls les devis en brouillon permettent de modifier les montants et le client.
                  </div>
                )}
                {isAccepte && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "var(--success)",
                      fontSize: "0.82rem",
                      marginBottom: 12,
                    }}
                  >
                    ✓ Devis accepté et verrouillé. La facture correspondante a été générée automatiquement.
                  </div>
                )}
                <div className="edit-field">
                  <label>Client {!isBrouillon && "(Verrouillé)"}</label>
                  <input
                    type="text"
                    value={formData.client || ""}
                    onChange={(e) => handleChange("client", e.target.value)}
                    disabled={!isBrouillon}
                    required
                  />
                </div>
                <div className="edit-row2">
                  <div className="edit-field">
                    <label>Montant (DH) {!isBrouillon && "(Verrouillé)"}</label>
                    <input
                      type="number"
                      value={formData.montant ?? 0}
                      onChange={(e) => handleChange("montant", Number(e.target.value) || 0)}
                      disabled={!isBrouillon}
                      required
                    />
                  </div>
                  <div className="edit-field">
                    <label>Statut</label>
                    <select
                      value={formData.statut || currentStatut}
                      onChange={(e) => handleChange("statut", e.target.value)}
                      disabled={isAccepte}
                    >
                      {isBrouillon && (
                        <>
                          <option value="brouillon">Brouillon</option>
                          <option value="envoye">Envoyé</option>
                          <option value="accepte">Accepté (Génère la facture)</option>
                          <option value="refuse">Refusé</option>
                        </>
                      )}
                      {currentStatut === "envoye" && (
                        <>
                          <option value="envoye">Envoyé</option>
                          <option value="accepte">Accepté (Génère la facture)</option>
                          <option value="refuse">Refusé</option>
                          <option value="brouillon">Revenir en brouillon</option>
                        </>
                      )}
                      {isAccepte && (
                        <option value="accepte">Accepté (Facture générée)</option>
                      )}
                      {isRefuse && (
                        <>
                          <option value="refuse">Refusé</option>
                          <option value="brouillon">Réactiver en brouillon</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </>
            );
          })()}

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
          {(type === "devis" || type === "facture") && (
            <button
              type="button"
              className="btn-secondary"
              style={{
                marginRight: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                fontSize: "0.85rem",
              }}
              onClick={() => setShowDocPreview(true)}
              title="Aperçu & Impression PDF"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Aperçu / PDF
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>

      {/* Interactive Document Preview Modal */}
      {showDocPreview && (type === "devis" || type === "facture") && (
        <DocumentPreviewModal
          type={type as "devis" | "facture"}
          id={id}
          onClose={() => setShowDocPreview(false)}
        />
      )}
    </div>
  );
};

