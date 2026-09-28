import { buildListGET, buildListPOST } from "@/lib/simpleCrud";

export const GET = buildListGET("factures");
export const POST = buildListPOST("factures", [
  "client",
  "client_id",
  "devis_id",
  "commande_id",
  "brand",
  "montant",
  "statut",
  "commercial",
  "commercial_id",
  "date_label",
  "echeance",
  "due_date",
  "paid_at",
]);
