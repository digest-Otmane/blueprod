import { buildListGET, buildListPOST } from "@/lib/simpleCrud";

export const GET = buildListGET("commandes");
export const POST = buildListPOST("commandes", [
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
]);
