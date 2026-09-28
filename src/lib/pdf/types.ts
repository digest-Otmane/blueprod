import { Brand, NeedType } from "@/types/crm";

export interface DocumentItem {
  id?: number | string;
  product_name: string;
  product_type?: NeedType | string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

export interface ClientDetails {
  id?: string;
  nom?: string;
  ville?: string;
  secteur?: string;
  contact?: string;
  tel?: string;
  email?: string;
  commercial?: string;
}

export interface DocumentPdfData {
  type: "devis" | "facture";
  id: string; // e.g. "DV-318" or "FA-2211"
  client: string;
  client_id?: string | null;
  brand: Brand | "lv" | "lvt";
  montant: number;
  statut: string;
  commercial?: string | null;
  commercial_id?: string | null;
  date_label?: string;
  created_at?: string;
  echeance?: string;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  commande_id?: string | null;
  devis_id?: string | null;
  client_details?: ClientDetails | null;
  items: DocumentItem[];
}
