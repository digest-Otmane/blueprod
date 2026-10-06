import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase";
import { getUserFromRequest, unauthorized, forbidden } from "./auth";
import { effectiveBrand } from "./scope";
import { isDevisEditable, validateDevisTransition, validateFactureTransition } from "./rbac";
import { sanitizePayload, TableName } from "./db-schema";

const FINANCIAL_TABLES = ["commandes", "devis", "factures"];

export function buildListGET(table: string) {
  return async function GET(request: NextRequest) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();

    // Règle RBAC : Centre d'Appel interdit d'accès aux modules financiers
    if (user.role === "centre_appel" && FINANCIAL_TABLES.includes(table)) {
      return forbidden("Accès interdit : Le Centre d'Appel n'a pas accès aux données financières.");
    }

    const { searchParams } = new URL(request.url);
    const queryBrand = searchParams.get("brand");
    const brand = effectiveBrand(user, queryBrand);

    const supabase = getSupabaseAdmin();
    let query = supabase.from(table).select("*");

    if (brand) {
      query = query.eq("brand", brand);
    }

    if (user.role === "commercial") {
      // Filtrage strict sur le portefeuille du commercial
      query = query.or(`commercial.eq.${user.name},commercial_id.eq.${user.id}`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error(`Error querying ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pour les devis et factures, joindre les articles détaillés si disponibles
    let resultData = data || [];
    if (table === "devis" && resultData.length > 0) {
      const devisIds = resultData.map((d: any) => d.id);
      const { data: itemRows } = await supabase
        .from("devis_items")
        .select("*")
        .in("devis_id", devisIds)
        .order("id", { ascending: true });

      const itemsByDevis: Record<string, any[]> = {};
      if (itemRows) {
        itemRows.forEach((item: any) => {
          if (!itemsByDevis[item.devis_id]) itemsByDevis[item.devis_id] = [];
          itemsByDevis[item.devis_id].push(item);
        });
      }
      resultData = resultData.map((d: any) => ({
        ...d,
        items: itemsByDevis[d.id] || [],
      }));
    } else if (table === "factures" && resultData.length > 0) {
      const factureIds = resultData.map((f: any) => f.id);
      const { data: itemRows } = await supabase
        .from("facture_items")
        .select("*")
        .in("facture_id", factureIds)
        .order("id", { ascending: true });

      const itemsByFacture: Record<string, any[]> = {};
      if (itemRows) {
        itemRows.forEach((item: any) => {
          if (!itemsByFacture[item.facture_id]) itemsByFacture[item.facture_id] = [];
          itemsByFacture[item.facture_id].push(item);
        });
      }
      resultData = resultData.map((f: any) => ({
        ...f,
        items: itemsByFacture[f.id] || [],
      }));
    }

    return NextResponse.json({ [table]: resultData });
  };
}

export function buildListPOST(table: string, allowedFields: string[]) {
  return async function POST(request: NextRequest) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();

    // Règle RBAC : Seuls Admin et Commercial peuvent créer des enregistrements dans ces tables
    if (user.role === "centre_appel" && FINANCIAL_TABLES.includes(table)) {
      return forbidden("Accès interdit : Le Centre d'Appel ne peut pas créer de commandes, devis ou factures.");
    }
    if (user.role !== "admin" && user.role !== "commercial") {
      return forbidden("Non autorisé.");
    }

    const body = await request.json().catch(() => ({}));
    const prefix = table.slice(0, 3).toUpperCase();
    const id = body.id || `${prefix}-${Date.now().toString(36).toUpperCase()}`;

    const recordToInsert: Record<string, any> = { id };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        recordToInsert[field] = body[field];
      }
    }

    // Enforcement automatique du commercial et de la marque pour les commerciaux
    if (user.role === "commercial") {
      recordToInsert.commercial = user.name;
      recordToInsert.commercial_id = user.id;
      recordToInsert.brand = user.brand !== "all" ? user.brand : recordToInsert.brand || "lv";
    } else {
      if (!recordToInsert.brand) {
        recordToInsert.brand = "lv";
      }
    }

    // Valeur par défaut pour le statut d'un devis : 'brouillon'
    if (table === "devis" && !recordToInsert.statut) {
      recordToInsert.statut = "brouillon";
    }

    // Gestion des articles détaillés s'ils sont fournis (items)
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length > 0) {
      const calculatedTotal = items.reduce(
        (sum: number, it: any) => sum + (Number(it.total_amount) || (Number(it.quantity) || 1) * (Number(it.unit_price) || 0)),
        0
      );
      if (!recordToInsert.montant || recordToInsert.montant === 0) {
        recordToInsert.montant = Math.round(calculatedTotal);
      }
    }

    const supabase = getSupabaseAdmin();
    const sanitizedInsert = sanitizePayload(table as TableName, recordToInsert);
    const { error } = await supabase.from(table).insert(sanitizedInsert);

    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insérer les articles détaillés si présents
    if (items.length > 0) {
      const itemsTable = table === "devis" ? "devis_items" : table === "factures" ? "facture_items" : null;
      if (itemsTable) {
        const foreignKey = table === "devis" ? "devis_id" : "facture_id";
        const rowsToInsert = items.map((it: any) =>
          sanitizePayload(itemsTable as TableName, {
            [foreignKey]: id,
            product_type: it.product_type || "achat_cafe",
            product_name: it.product_name || "Produit standard",
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            total_amount: Number(it.total_amount) || (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
          })
        );

        const { error: itemsErr } = await supabase.from(itemsTable).insert(rowsToInsert);
        if (itemsErr) {
          console.error(`Error inserting items into ${itemsTable}:`, itemsErr);
        }
      }
    }

    // Si un devis est créé directement au statut 'accepte', générer la facture correspondante
    if (table === "devis" && recordToInsert.statut === "accepte") {
      const factureId = `FAC-${Date.now().toString(36).toUpperCase()}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dateStr = dueDate.toISOString().split("T")[0];

      const facturePayload = sanitizePayload("factures", {
        id: factureId,
        client: recordToInsert.client,
        client_id: recordToInsert.client_id || null,
        brand: recordToInsert.brand,
        montant: recordToInsert.montant,
        statut: "emise",
        commercial: recordToInsert.commercial,
        commercial_id: recordToInsert.commercial_id,
        date_label: "Aujourd'hui",
        echeance: dateStr,
      });

      await supabase.from("factures").insert(facturePayload);

      if (items.length > 0) {
        const rowsToInsert = items.map((it: any) =>
          sanitizePayload("facture_items", {
            facture_id: factureId,
            product_name: it.product_name || "Produit standard",
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            total_amount: Number(it.total_amount) || (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
          })
        );
        await supabase.from("facture_items").insert(rowsToInsert);
      }
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  };
}

export function buildItemHandlers(table: string, extraFields: string[] = []) {
  const baseFields = [
    "client",
    "client_id",
    "brand",
    "montant",
    "statut",
    "commercial",
    "commercial_id",
    "need_type",
  ];
  const fields = [...baseFields, ...extraFields];

  async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();

    if (user.role === "centre_appel" && FINANCIAL_TABLES.includes(table)) {
      return forbidden("Accès interdit : Le Centre d'Appel n'a pas accès aux données financières.");
    }

    const supabase = getSupabaseAdmin();
    const { data: item, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !item) {
      return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
    }

    // Commercial : vérification stricte de marque et d'assignation
    if (user.role === "commercial") {
      if (item.brand && item.brand !== user.brand) {
        return forbidden("Accès non autorisé : Marque différente de votre affectation.");
      }
      const isAssigned = item.commercial_id === user.id || item.commercial === user.name;
      if (!isAssigned) {
        return forbidden("Accès non autorisé à cet élément.");
      }
    }

    // Récupérer les articles associés
    let detailedItem = { ...item };
    if (table === "devis") {
      const { data: items } = await supabase
        .from("devis_items")
        .select("*")
        .eq("devis_id", params.id)
        .order("id", { ascending: true });
      detailedItem.items = items || [];
    } else if (table === "factures") {
      const { data: items } = await supabase
        .from("facture_items")
        .select("*")
        .eq("facture_id", params.id)
        .order("id", { ascending: true });
      detailedItem.items = items || [];
    }

    return NextResponse.json({ item: detailedItem });
  }

  async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();

    if (user.role === "centre_appel" && FINANCIAL_TABLES.includes(table)) {
      return forbidden("Accès interdit : Le Centre d'Appel ne peut pas modifier de commandes, devis ou factures.");
    }

    const supabase = getSupabaseAdmin();
    const { data: current, error: fetchErr } = await supabase
      .from(table)
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchErr || !current) {
      return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
    }

    // Vérification d'accès pour le commercial
    if (user.role === "commercial") {
      if (current.brand && current.brand !== user.brand) {
        return forbidden("Accès interdit : Cet enregistrement ne concerne pas votre marque.");
      }
      const isAssigned = current.commercial_id === user.id || current.commercial === user.name;
      if (!isAssigned) {
        return forbidden("Accès interdit : Cet enregistrement ne fait pas partie de votre portefeuille.");
      }
    }

    const body = await request.json().catch(() => ({}));

    // =========================================================================
    // RÈGLES MÉTIER DEVIS & FACTURES
    // =========================================================================
    if (table === "devis") {
      const currentStatut = current.statut || "brouillon";
      const newStatut = body.statut || currentStatut;

      // Si le devis n'est plus en brouillon, interdiction de modifier les montants ou les détails
      if (!isDevisEditable(currentStatut)) {
        const isTryingToChangeData =
          (body.montant !== undefined && Number(body.montant) !== Number(current.montant)) ||
          (body.client !== undefined && body.client !== current.client) ||
          body.items !== undefined;

        if (isTryingToChangeData) {
          return NextResponse.json(
            {
              error:
                `Impossible de modifier ce devis : il est au statut '${currentStatut}'. Seuls les devis en statut 'brouillon' sont éditables.`,
            },
            { status: 400 }
          );
        }
      }

      // Valider la transition de statut
      if (newStatut !== currentStatut) {
        const transition = validateDevisTransition(currentStatut, newStatut);
        if (!transition.valid) {
          return NextResponse.json({ error: transition.reason }, { status: 400 });
        }

        // Si le devis passe à 'accepte', générer automatiquement une facture associée
        if (newStatut === "accepte" && currentStatut !== "accepte") {
          const factureId = `FAC-${Date.now().toString(36).toUpperCase()}`;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30); // Échéance standard à 30 jours
          const dateStr = dueDate.toISOString().split("T")[0];

          const facturePayload = sanitizePayload("factures", {
            id: factureId,
            client: current.client,
            client_id: current.client_id || null,
            brand: current.brand,
            montant: current.montant,
            statut: "emise",
            commercial: current.commercial,
            commercial_id: current.commercial_id,
            date_label: "Aujourd'hui",
            echeance: dateStr,
          });

          await supabase.from("factures").insert(facturePayload);

          // Copier également les devis_items vers facture_items pour intégrité financière
          const { data: devisItems } = await supabase
            .from("devis_items")
            .select("*")
            .eq("devis_id", current.id);

          if (devisItems && devisItems.length > 0) {
            const factureItems = devisItems.map((it: any) =>
              sanitizePayload("facture_items", {
                facture_id: factureId,
                product_name: it.product_name || "Produit standard",
                quantity: Number(it.quantity) || 1,
                unit_price: Number(it.unit_price) || 0,
                total_amount: Number(it.total_amount) || (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
              })
            );
            await supabase.from("facture_items").insert(factureItems);
          }
        }
      }
    }

    if (table === "factures") {
      const currentStatut = current.statut || "emise";
      const newStatut = body.statut || currentStatut;

      if (newStatut !== currentStatut) {
        const transition = validateFactureTransition(currentStatut, newStatut);
        if (!transition.valid) {
          return NextResponse.json({ error: transition.reason }, { status: 400 });
        }

        if (newStatut === "payee") {
          body.paid_at = new Date().toISOString();
        }
      }
    }

    const updates: Record<string, any> = {};
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates[f] = body[f];
      }
    }

    const sanitizedUpdates = sanitizePayload(table as TableName, updates);

    if (!Object.keys(sanitizedUpdates).length) {
      return NextResponse.json({ error: "Aucun champ à modifier." }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from(table)
      .update(sanitizedUpdates)
      .eq("id", params.id);

    if (updateErr) {
      console.error(`Error updating ${table}:`, updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Mise à jour éventuelle des articles du devis si en statut 'brouillon'
    if (table === "devis" && isDevisEditable(current.statut) && Array.isArray(body.items)) {
      await supabase.from("devis_items").delete().eq("devis_id", params.id);
      if (body.items.length > 0) {
        const rows = body.items.map((it: any) =>
          sanitizePayload("devis_items", {
            devis_id: params.id,
            product_type: it.product_type || "achat_cafe",
            product_name: it.product_name || "Produit standard",
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            total_amount: Number(it.total_amount) || (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
          })
        );
        await supabase.from("devis_items").insert(rows);
      }
    }

    return NextResponse.json({ ok: true });
  }

  async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const user = getUserFromRequest(request);
    if (!user) return unauthorized();

    if (user.role === "centre_appel" && FINANCIAL_TABLES.includes(table)) {
      return forbidden("Accès interdit : Le Centre d'Appel ne peut pas supprimer d'enregistrements financiers.");
    }

    const supabase = getSupabaseAdmin();
    const { data: current, error: fetchErr } = await supabase
      .from(table)
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (fetchErr || !current) {
      return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
    }

    if (user.role === "commercial") {
      const isAssigned = current.commercial_id === user.id || current.commercial === user.name;
      if (!isAssigned || current.brand !== user.brand) {
        return forbidden("Accès refusé : Vous ne pouvez pas supprimer cet élément.");
      }
      // Un commercial ne peut supprimer un devis que s'il est encore en brouillon
      if (table === "devis" && current.statut !== "brouillon") {
        return forbidden("Impossible de supprimer un devis déjà envoyé ou accepté.");
      }
    } else if (user.role !== "admin") {
      return forbidden("Réservé à l'administrateur.");
    }

    const { error } = await supabase.from(table).delete().eq("id", params.id);

    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return { GET, PUT, DELETE };
}
