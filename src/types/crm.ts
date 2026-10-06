export type UserRole = "admin" | "centre_appel" | "commercial";
export type Brand = "all" | "lv" | "lvt";

export type NeedType = "achat_cafe" | "equipement_cafe" | "mixte" | "autre";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  brand: Brand;
  initials: string;
  password?: string;
  password_hash?: string;
  assigned_commercial_id?: string | null;
  impersonatedBy?: string;
}

export interface Client {
  id: string;
  nom: string;
  ville?: string;
  secteur?: string;
  brands: string[] | string;
  contact?: string;
  tel?: string;
  email?: string;
  commercial?: string;
  commercial_id?: string;
  lead_id?: string;
  need_type?: NeedType;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type LeadStage =
  | "a_qualifier"
  | "nouveau"
  | "contacte"
  | "qualifie"
  | "attribue"
  | "converti"
  | "perdu";

export type LeadSource = "manuel" | "facebook" | "instagram" | "meta" | "whatsapp" | "autre";
export type LeadInterest = "chaud" | "tiede" | "froid";

export interface LeadMessage {
  id?: number;
  lead_id?: string;
  from?: "moi" | "eux";
  from_side?: "moi" | "eux" | "inbound" | "outbound";
  direction?: "inbound" | "outbound";
  wa_message_id?: string;
  phone?: string;
  text: string;
  status?: "received" | "sent" | "delivered" | "read" | "failed";
  raw_payload?: any;
  created_at?: string;
}

export interface WhatsAppMessage extends LeadMessage {}

export interface FicheAppel {
  besoin?: string;
  budget?: string;
  dispo?: string;
  notes?: string;
  interet: LeadInterest;
  qualifiePar?: string;
  commercial?: string;
  commercial_id?: string;
}

export interface Lead {
  id: string;
  client: string;
  client_id?: string | null;
  brand: "lv" | "lvt";
  stage: LeadStage;
  commercial?: string | null;
  commercial_id?: string | null;
  assigned_commercial_id?: string | null;
  valeur: number;
  tel?: string;
  email?: string;
  need_type?: NeedType;
  date?: string;
  date_label?: string;
  source: LeadSource;
  metaNote?: string;
  meta_note?: string;
  meta_lead_id?: string;
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
  lead_id?: string;
  brand: "lv" | "lvt";
  need_type?: NeedType;
  produits?: string;
  montant: number;
  statut: "en_attente" | "confirmee" | "livree" | "annulee";
  commercial?: string;
  commercial_id?: string;
  date_label?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DevisItem {
  id?: number;
  devis_id?: string;
  product_type: NeedType;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at?: string;
}

export interface Devis {
  id: string;
  client: string;
  client_id?: string;
  commande_id?: string;
  brand: "lv" | "lvt";
  montant: number;
  statut: "brouillon" | "envoye" | "accepte" | "refuse";
  commercial?: string;
  commercial_id?: string;
  date_label?: string;
  notes?: string;
  items?: DevisItem[];
  created_at?: string;
  updated_at?: string;
}

export interface FactureItem {
  id?: number;
  facture_id?: string;
  product_type: NeedType;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at?: string;
}

export interface Facture {
  id: string;
  client: string;
  client_id?: string;
  devis_id?: string;
  commande_id?: string;
  brand: "lv" | "lvt";
  montant: number;
  statut: "emise" | "en_attente" | "payee" | "retard" | "en_retard";
  commercial?: string;
  commercial_id?: string;
  date_label?: string;
  echeance?: string;
  due_date?: string;
  paid_at?: string;
  items?: FactureItem[];
  created_at?: string;
  updated_at?: string;
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
