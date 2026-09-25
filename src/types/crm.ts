export type UserRole = "admin" | "centre_appel" | "commercial";
export type Brand = "all" | "lv" | "lvt";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  brand: Brand;
  initials: string;
  impersonatedBy?: string;
}

export interface Client {
  id: string;
  nom: string;
  ville?: string;
  secteur?: string;
  brands: string[];
  contact?: string;
  tel?: string;
  commercial?: string;
  commercial_id?: string;
  created_at?: string;
}

export type LeadStage =
  | "a_qualifier"
  | "nouveau"
  | "contacte"
  | "qualifie"
  | "converti"
  | "perdu";

export type LeadSource = "manuel" | "facebook" | "instagram";
export type LeadInterest = "chaud" | "tiede" | "froid";

export interface LeadMessage {
  id?: number;
  lead_id?: string;
  from: "moi" | "eux";
  from_side?: "moi" | "eux";
  text: string;
  created_at?: string;
}

export interface FicheAppel {
  besoin?: string;
  budget?: string;
  dispo?: string;
  notes?: string;
  interet: LeadInterest;
  qualifiePar?: string;
}

export interface Lead {
  id: string;
  client: string;
  client_id?: string;
  brand: "lv" | "lvt";
  stage: LeadStage;
  commercial?: string | null;
  commercial_id?: string | null;
  valeur: number;
  tel?: string;
  date?: string;
  date_label?: string;
  source: LeadSource;
  metaNote?: string;
  meta_note?: string;
  fiche?: FicheAppel | null;
  fiche_besoin?: string;
  fiche_budget?: string;
  fiche_dispo?: string;
  fiche_notes?: string;
  fiche_interet?: LeadInterest;
  fiche_qualifie_par?: string;
  messages?: LeadMessage[];
  created_at?: string;
  updated_at?: string;
}

export interface Commande {
  id: string;
  client: string;
  client_id?: string;
  brand: "lv" | "lvt";
  produits?: string;
  montant: number;
  statut: "en_attente" | "confirmee" | "livree" | "annulee";
  commercial?: string;
  commercial_id?: string;
  date_label?: string;
  created_at?: string;
}

export interface Devis {
  id: string;
  client: string;
  client_id?: string;
  brand: "lv" | "lvt";
  montant: number;
  statut: "brouillon" | "envoye" | "accepte" | "refuse";
  commercial?: string;
  commercial_id?: string;
  date_label?: string;
  created_at?: string;
}

export interface Facture {
  id: string;
  client: string;
  client_id?: string;
  brand: "lv" | "lvt";
  montant: number;
  statut: "emise" | "payee" | "retard";
  commercial?: string;
  commercial_id?: string;
  date_label?: string;
  echeance?: string;
  created_at?: string;
}

export type PageKey =
  | "dashboard"
  | "clients"
  | "leads"
  | "commandes"
  | "devis"
  | "factures"
  | "equipe";

export interface CommercialUser {
  id: string;
  name: string;
  brand: "lv" | "lvt";
}
