import { buildListGET, buildListPOST } from "@/lib/simpleCrud";

export const GET = buildListGET("devis");
export const POST = buildListPOST("devis", ["client", "client_id", "brand", "montant", "statut", "commercial", "commercial_id", "date_label"]);
