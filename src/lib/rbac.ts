import { User, UserRole, Brand } from "@/types/crm";

/**
 * Normalise les rôles acceptés (format snake_case interne ou format affichage)
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return "commercial";
  const r = role.toLowerCase().trim();
  if (r === "admin" || r === "administration") return "admin";
  if (r === "centre_appel" || r === "centre d'appel" || r === "call_center") return "centre_appel";
  return "commercial";
}

/**
 * Normalise les marques acceptées
 */
export function normalizeBrand(brand?: string | null): Brand {
  if (!brand) return "all";
  const b = brand.toLowerCase().trim();
  if (b === "lv" || b === "la varenne") return "lv";
  if (b === "lvt" || b === "la varenne touch") return "lvt";
  return "all";
}

/**
 * Vérifie si l'utilisateur a accès aux modules financiers (commandes, devis, factures).
 * - Admin: OUI (accès total)
 * - Commercial: OUI (limité à son portefeuille et sa marque)
 * - Centre d'Appel: NON (strictement interdit)
 */
export function canAccessFinancials(user: User): boolean {
  const role = normalizeRole(user.role);
  if (role === "admin" || role === "commercial") return true;
  return false;
}

/**
 * Vérifie si l'utilisateur a accès à une marque spécifique.
 * - Admin et Centre d'Appel: ont accès aux deux marques (lv et lvt).
 * - Commercial: a uniquement accès à sa marque attribuée.
 */
export function canAccessBrand(user: User, brand?: string | null): boolean {
  const role = normalizeRole(user.role);
  if (role === "admin" || role === "centre_appel") return true;
  if (!brand || brand === "all") return true;

  const userBrand = normalizeBrand(user.brand);
  const targetBrand = normalizeBrand(brand);
  return userBrand === targetBrand;
}

/**
 * Vérifie si l'utilisateur a le droit d'accéder à un lead spécifique.
 * - Admin: accès total.
 * - Centre d'Appel: accès total aux leads des deux marques (pour qualification & WhatsApp).
 * - Commercial: UNIQUEMENT s'il s'agit de sa marque ET qu'il lui est attribué (ou non encore assigné dans sa marque).
 */
export function canAccessLead(
  user: User,
  lead: {
    brand?: string | null;
    commercial?: string | null;
    commercial_id?: string | null;
    assigned_commercial_id?: string | null;
  }
): boolean {
  const role = normalizeRole(user.role);
  if (role === "admin" || role === "centre_appel") return true;

  // Commercial
  if (!canAccessBrand(user, lead.brand)) return false;

  const isAssigned =
    lead.commercial_id === user.id ||
    lead.assigned_commercial_id === user.id ||
    (lead.commercial && lead.commercial.trim().toLowerCase() === user.name.trim().toLowerCase());

  return Boolean(isAssigned);
}

/**
 * Vérifie si l'utilisateur a le droit d'accéder/modifier un enregistrement commercial
 * (client, commande, devis, facture).
 * - Admin: accès total.
 * - Centre d'Appel: aucun accès aux commandes/devis/factures.
 * - Commercial: uniquement si assigné à lui et correspondant à sa marque.
 */
export function canAccessCommercialRecord(
  user: User,
  record: {
    brand?: string | null;
    commercial?: string | null;
    commercial_id?: string | null;
  }
): boolean {
  const role = normalizeRole(user.role);
  if (role === "admin") return true;
  if (role === "centre_appel") return false;

  // Commercial
  if (record.brand && !canAccessBrand(user, record.brand)) return false;

  const isAssigned =
    record.commercial_id === user.id ||
    (record.commercial && record.commercial.trim().toLowerCase() === user.name.trim().toLowerCase());

  return Boolean(isAssigned);
}

/**
 * RÈGLE MÉTIER CRITIQUE : Devis modifiable UNIQUEMENT en statut 'brouillon'.
 * Une fois 'envoye', 'accepte' ou 'refuse', les lignes et montants sont verrouillés.
 */
export function isDevisEditable(statut?: string | null): boolean {
  if (!statut) return true;
  const s = statut.toLowerCase().trim();
  return s === "brouillon";
}

/**
 * Validation des transitions d'états pour le module Devis :
 * 'brouillon' -> 'envoye' -> 'accepte' (ou 'refuse')
 */
export function validateDevisTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; reason?: string } {
  const curr = currentStatus.toLowerCase().trim();
  const next = newStatus.toLowerCase().trim();

  if (curr === next) return { valid: true };

  if (curr === "brouillon") {
    if (["envoye", "accepte", "refuse"].includes(next)) {
      return { valid: true };
    }
    return { valid: false, reason: "De brouillon, un devis peut passer à 'envoyé', 'accepté' ou 'refusé'." };
  }

  if (curr === "envoye") {
    if (["accepte", "refuse", "brouillon"].includes(next)) {
      return { valid: true };
    }
    return { valid: false, reason: "D'envoyé, un devis peut passer à 'accepté', 'refusé' ou revenir en 'brouillon'." };
  }

  if (curr === "accepte") {
    return {
      valid: false,
      reason: "Un devis déjà accepté est verrouillé et ne peut pas changer d'état sans intervention de la direction.",
    };
  }

  if (curr === "refuse") {
    if (next === "brouillon") return { valid: true };
    return { valid: false, reason: "Un devis refusé peut uniquement être réactivé en 'brouillon'." };
  }

  return { valid: true };
}

/**
 * Validation des transitions d'états pour le module Factures :
 * 'emise' / 'en_attente' -> 'payee' -> 'en_retard' / 'retard'
 */
export function validateFactureTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; reason?: string } {
  const curr = currentStatus.toLowerCase().trim();
  const next = newStatus.toLowerCase().trim();

  if (curr === next) return { valid: true };

  const validStatuses = ["emise", "en_attente", "payee", "retard", "en_retard"];
  if (!validStatuses.includes(next)) {
    return { valid: false, reason: `Statut '${newStatus}' non reconnu.` };
  }

  return { valid: true };
}

/**
 * Analyse une date d'échéance et retourne si la facture est en retard.
 */
export function isFactureOverdue(echeance?: string | null, statut?: string | null): boolean {
  if (!echeance || !statut) return false;
  const s = statut.toLowerCase().trim();
  if (s === "payee") return false;

  const parsed = Date.parse(echeance);
  if (isNaN(parsed)) return false;

  return Date.now() > parsed;
}
