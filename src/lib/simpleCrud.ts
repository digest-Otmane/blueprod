import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase";
import { getUserFromRequest, unauthorized, forbidden } from "./auth";
import { effectiveBrand } from "./scope";

export function buildListGET(table: string) {
  return async function GET(request: NextRequest) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const queryBrand = searchParams.get("brand");
    const brand = effectiveBrand(user, queryBrand);

    const supabase = getSupabaseAdmin();
    let query = supabase.from(table).select("*");

    if (brand) {
      query = query.eq("brand", brand);
    }

    if (user.role === "commercial") {
      query = query.or(`commercial.eq.${user.name},commercial_id.eq.${user.id}`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error(`Error querying ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ [table]: data || [] });
  };
}

export function buildListPOST(table: string, allowedFields: string[]) {
  return async function POST(request: NextRequest) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();
    if (user.role !== "admin" && user.role !== "commercial") {
      return forbidden("Non autorisé.");
    }

    const body = await request.json().catch(() => ({}));
    const id = body.id || (table.slice(0, 3).toUpperCase() + "-" + Date.now().toString(36).toUpperCase());

    const recordToInsert: Record<string, any> = { id };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        recordToInsert[field] = body[field];
      }
    }

    if (user.role === "commercial") {
      if (!recordToInsert.commercial) recordToInsert.commercial = user.name;
      if (!recordToInsert.commercial_id) recordToInsert.commercial_id = user.id;
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from(table).insert(recordToInsert);

    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  };
}

export function buildItemHandlers(table: string, extraFields: string[] = []) {
  const baseFields = ["client", "client_id", "montant", "statut", "commercial", "commercial_id"];
  const fields = [...baseFields, ...extraFields];

  async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();

    const supabase = getSupabaseAdmin();
    const { data: item, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !item) {
      return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
    }

    if (user.role === "commercial" && item.commercial !== user.name && item.commercial_id !== user.id) {
      return forbidden("Accès non autorisé à cet élément.");
    }

    return NextResponse.json({ item });
  }

  async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden("Réservé à l'administrateur.");

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, any> = {};

    fields.forEach((f) => {
      if (body[f] !== undefined) {
        updates[f] = body[f];
      }
    });

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "Aucun champ à modifier." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq("id", params.id);

    if (error) {
      console.error(`Error updating ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();
    if (user.role !== "admin") return forbidden("Réservé à l'administrateur.");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return { GET, PUT, DELETE };
}
