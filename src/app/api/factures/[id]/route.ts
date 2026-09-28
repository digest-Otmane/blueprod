import { buildItemHandlers } from "@/lib/simpleCrud";

const handlers = buildItemHandlers("factures", [
  "devis_id",
  "commande_id",
  "date_label",
  "echeance",
  "due_date",
  "paid_at",
]);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
