import { buildItemHandlers } from "@/lib/simpleCrud";

const handlers = buildItemHandlers("devis", ["commande_id", "date_label", "notes"]);
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
