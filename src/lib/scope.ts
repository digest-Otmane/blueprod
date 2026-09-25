import { User, Brand } from "../types/crm";

export function effectiveBrand(user: User, queryBrand: string | null): Brand | null {
  if (user.role === "admin") {
    return queryBrand && ["lv", "lvt"].includes(queryBrand) ? (queryBrand as Brand) : null;
  }
  if (user.role === "centre_appel") return null;
  return user.brand;
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
  if (user.role === "admin" || user.role === "centre_appel") {
    return { clause: "", params: [] };
  }
  return { clause: `AND ${column} = ?`, params: [user.name] };
}
