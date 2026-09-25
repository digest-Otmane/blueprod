import { buildItemHandlers } from "@/lib/simpleCrud";

const handlers = buildItemHandlers("commandes", ["produits", "date_label"]);
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
