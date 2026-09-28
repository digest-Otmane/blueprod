import { User, Brand } from "../types/crm";

/**
 * Calcule la marque effective en fonction du rôle et du filtre demandé.
 * - Admin : Peut filtrer par lv, lvt ou voir tout (null).
 * - Centre d'Appel : A accès aux deux marques, peut filtrer pour sa vue.
 * - Commercial : STRICTEMENT FORCÉ à sa marque propre (ignorer tout query param tentant d'outrepasser).
 */
export function effectiveBrand(user: User, queryBrand: string | null): Brand | null {
  const role = user.role.toLowerCase();

  if (role === "admin") {
    return queryBrand && ["lv", "lvt"].includes(queryBrand) ? (queryBrand as Brand) : null;
  }

  if (role === "centre_appel") {
    return queryBrand && ["lv", "lvt"].includes(queryBrand) ? (queryBrand as Brand) : null;
  }

  // Pour un commercial : retourne impérativement sa marque
  if (["lv", "lvt"].includes(user.brand)) {
    return user.brand as Brand;
  }

  return null;
}

/**
 * Applique le filtre de marque et de portefeuille commercial sur une requête Supabase.
 */
export function applyScopeToQuery(
  query: any,
  user: User,
  options?: {
    queryBrand?: string | null;
    commercialColumn?: string;
    commercialIdColumn?: string;
    brandColumn?: string;
  }
) {
  const brandCol = options?.brandColumn || "brand";
  const commCol = options?.commercialColumn || "commercial";
  const commIdCol = options?.commercialIdColumn || "commercial_id";

  const brand = effectiveBrand(user, options?.queryBrand || null);
  if (brand) {
    query = query.eq(brandCol, brand);
  }

  const role = user.role.toLowerCase();
  if (role === "commercial") {
    // Le commercial ne voit que ses enregistrements assignés
    query = query.or(`${commCol}.eq.${user.name},${commIdCol}.eq.${user.id}`);
  }

  return query;
}

export function brandFilterSql(
  user: User,
  queryBrand: string | null,
  column = "brand"
): { clause: string; params: any[] } {
  const brand = effectiveBrand(user, queryBrand);
  if (!brand) return { clause: "", params: [] };
  return { clause: `AND ${column} = ?`, params: [brand] };
}

export function commercialFilterSql(
  user: User,
  column = "commercial"
): { clause: string; params: any[] } {
  const role = user.role.toLowerCase();
  if (role === "admin" || role === "centre_appel") {
    return { clause: "", params: [] };
  }
  return { clause: `AND ${column} = ?`, params: [user.name] };
}
