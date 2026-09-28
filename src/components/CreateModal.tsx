"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, CommercialUser, Client } from "@/types/crm";

interface CreateModalProps {
  type: "client" | "lead" | "commande" | "devis" | "facture" | null;
  user: User;
  commerciaux: CommercialUser[];
  clients: Client[];
  onClose: () => void;
  onCreate: (type: string, data: any) => Promise<void>;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  type,
  user,
  commerciaux,
  clients,
  onClose,
  onCreate,
}) => {
  const initialFormData: Record<string, any> = {
    brand: user.brand !== "all" ? user.brand : "lv",
    commercial: user.role === "commercial" ? user.name : "",
    stage: user.role === "centre_appel" ? "a_qualifier" : "nouveau",
    statut: type === "commande" ? "en_attente" : type === "devis" ? "brouillon" : "emise",
  };

  const [formData, setFormData] = useState<Record<string, any>>(initialFormData);
  const [loading, setLoading] = useState(false);

  // Marque active sélectionnée dans le formulaire
  const activeBrand =
    type === "client"
      ? (formData.brands === "lvt" ? "lvt" : formData.brands === "lv" ? "lv" : null)
      : (formData.brand || (user.brand !== "all" ? user.brand : null));

  const filteredCommerciaux = useMemo(() => {
    if (activeBrand && activeBrand !== "all") {
      return commerciaux.filter((c) => c.brand === activeBrand);
    }
    return commerciaux;
  }, [commerciaux, activeBrand]);

  // Réinitialiser le commercial si non compatible avec la nouvelle marque choisie
  useEffect(() => {
    if (formData.commercial && filteredCommerciaux.length > 0) {
      const exists = filteredCommerciaux.some((c) => c.name === formData.commercial);
      if (!exists && user.role === "admin") {
        setFormData((prev) => ({ ...prev, commercial: "" }));
      }
    }
  }, [filteredCommerciaux, formData.commercial, user.role]);

  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case "client":
        return "Nouveau client";
      case "lead":
        return "Nouveau lead";
      case "commande":
        return "Nouvelle commande";
      case "devis":
        return "Nouveau devis";
      case "facture":
        return "Nouvelle facture";
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData };
      if (formData.commercial) {
        const rep = commerciaux.find((c) => c.name === formData.commercial);
        if (rep) payload.commercial_id = rep.id;
      }
      if (formData.client && ["commande", "devis", "facture"].includes(type)) {
        const clientObj = clients.find((c) => c.nom === formData.client);
        if (clientObj) payload.client_id = clientObj.id;
      }
      await onCreate(type, payload);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création.");
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
            <div className="sub2">Formulaire de création rapide</div>
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
                <label>Nom du client / Établissement *</label>
                <input
                  type="text"
                  placeholder="Ex: Café Prestige"
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
                    placeholder="Ex: Casablanca"
                    value={formData.ville || ""}
                    onChange={(e) => handleChange("ville", e.target.value)}
                  />
                </div>
                <div className="edit-field">
                  <label>Secteur d&apos;activité</label>
                  <input
                    type="text"
                    placeholder="Ex: Café / Restauration"
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
                    placeholder="Ex: Anas Berrada"
                    value={formData.contact || ""}
                    onChange={(e) => handleChange("contact", e.target.value)}
                  />
                </div>
                <div className="edit-field">
                  <label>Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex: 0522 44 12 09"
                    value={formData.tel || ""}
                    onChange={(e) => handleChange("tel", e.target.value)}
                  />
                </div>
              </div>
              <div className="edit-field">
                <label>Marque(s)</label>
                <select
                  value={formData.brands || (user.brand !== "all" ? user.brand : "lv,lvt")}
                  onChange={(e) => handleChange("brands", e.target.value)}
                >
                  <option value="lv">La Varenne</option>
                  <option value="lvt">La Varenne Touch</option>
                  <option value="lv,lvt">Les deux marques (LV &amp; Touch)</option>
                </select>
              </div>
              <div className="edit-field">
                <label>Type de besoin principal</label>
                <select
                  value={formData.need_type || "achat_cafe"}
                  onChange={(e) => handleChange("need_type", e.target.value)}
                >
                  <option value="achat_cafe">Achat de café (Grains, moulu, capsules)</option>
                  <option value="equipement_cafe">Équipement café (Machines espresso, moulins)</option>
                  <option value="mixte">Mixte (Café + Équipement)</option>
                </select>
              </div>
              {user.role === "admin" && (
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
              )}
            </>
          )}

          {type === "lead" && (
            <>
              <div className="edit-field">
                <label>Nom du prospect / Contact *</label>
                <input
                  type="text"
                  placeholder="Ex: Hôtel Atlas Rabat"
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
                  <label>Téléphone</label>
                  <input
                    type="text"
                    placeholder="Ex: +212 6 61 00 00 00"
                    value={formData.tel || ""}
                    onChange={(e) => handleChange("tel", e.target.value)}
                  />
                </div>
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Valeur estimée (DH)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.valeur || ""}
                    onChange={(e) => handleChange("valeur", Number(e.target.value) || 0)}
                  />
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
                <label>Nom du client *</label>
                <input
                  type="text"
                  placeholder="Nom du client"
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
                    value={formData.brand || (user.brand !== "all" ? user.brand : "lv")}
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
                  placeholder="Ex: Café Arabica Grains, Sirop Vanille"
                  value={formData.produits || ""}
                  onChange={(e) => handleChange("produits", e.target.value)}
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Montant (DH) *</label>
                  <input
                    type="number"
                    value={formData.montant || ""}
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
                <label>Nom du client *</label>
                <input
                  type="text"
                  placeholder="Nom du client"
                  value={formData.client || ""}
                  onChange={(e) => handleChange("client", e.target.value)}
                  required
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Montant (DH) *</label>
                  <input
                    type="number"
                    value={formData.montant || ""}
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
                    <option value="accepte">Accepté (Génère la facture)</option>
                    <option value="refuse">Refusé</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {type === "facture" && (
            <>
              <div className="edit-field">
                <label>Nom du client *</label>
                <input
                  type="text"
                  placeholder="Nom du client"
                  value={formData.client || ""}
                  onChange={(e) => handleChange("client", e.target.value)}
                  required
                />
              </div>
              <div className="edit-row2">
                <div className="edit-field">
                  <label>Montant (DH) *</label>
                  <input
                    type="number"
                    value={formData.montant || ""}
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
                  placeholder="Ex: 27 sept."
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
            {loading ? "Création..." : "Créer l'élément"}
          </button>
        </div>
      </form>
    </div>
  );
};
