/**
 * Schéma officiel validé des tables Supabase / PostgreSQL pour le CRM La Varenne / Alea Food.
 * Permet de garantir qu'aucun champ non-existant n'est envoyé à Supabase (PostgREST schema cache mismatch).
 */

export const DB_COLUMNS = {
  users: [
    "id",
    "name",
    "email",
    "password_hash",
    "role",
    "brand",
    "initials",
    "assigned_commercial_id",
    "created_at",
  ] as const,

  clients: [
    "id",
    "nom",
    "ville",
    "secteur",
    "brands",
    "contact",
    "tel",
    "commercial",
    "commercial_id",
    "lead_id",
    "need_type",
    "created_at",
  ] as const,

  leads: [
    "id",
    "client",
    "client_id",
    "brand",
    "stage",
    "commercial",
    "commercial_id",
    "assigned_commercial_id",
    "valeur",
    "tel",
    "email",
    "need_type",
    "date_label",
    "source",
    "meta_note",
    "meta_lead_id",
    "fiche_besoin",
    "fiche_budget",
    "fiche_dispo",
    "fiche_notes",
    "fiche_interet",
    "fiche_qualifie_par",
    "created_at",
    "updated_at",
  ] as const,

  lead_messages: [
    "id",
    "lead_id",
    "from_side",
    "direction",
    "phone",
    "text",
    "message",
    "status",
    "created_at",
  ] as const,

  commandes: [
    "id",
    "client",
    "client_id",
    "lead_id",
    "brand",
    "need_type",
    "produits",
    "montant",
    "statut",
    "commercial",
    "commercial_id",
    "date_label",
    "created_at",
  ] as const,

  devis: [
    "id",
    "client",
    "client_id",
    "brand",
    "montant",
    "statut",
    "commercial",
    "commercial_id",
    "date_label",
    "created_at",
  ] as const,

  devis_items: [
    "id",
    "devis_id",
    "product_type",
    "product_name",
    "quantity",
    "unit_price",
    "total_amount",
  ] as const,

  factures: [
    "id",
    "client",
    "client_id",
    "brand",
    "montant",
    "statut",
    "commercial",
    "commercial_id",
    "date_label",
    "echeance",
    "created_at",
  ] as const,

  facture_items: [
    "id",
    "facture_id",
    "product_name",
    "quantity",
    "unit_price",
    "total_amount",
  ] as const,
};

export type TableName = keyof typeof DB_COLUMNS;

/**
 * Nettoie un objet payload avant insertion ou mise à jour dans une table Supabase
 * en ne conservant STRICTEMENT que les colonnes existantes dans la base de données.
 */
export function sanitizePayload<T extends Record<string, any>>(
  tableName: TableName,
  payload: T
): Partial<T> {
  const allowed = new Set(DB_COLUMNS[tableName] as readonly string[]);
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key) && value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned as Partial<T>;
}

/**
 * Renvoie la chaîne des colonnes autorisées pour un `.select(...)` Supabase
 */
export function getSelectColumns(tableName: TableName): string {
  return (DB_COLUMNS[tableName] as readonly string[]).join(", ");
}
