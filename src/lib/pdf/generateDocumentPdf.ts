import { PdfDoc } from "./pdfDocBuilder";
import { DocumentPdfData, DocumentItem } from "./types";

function formatMoney(amount: number): string {
  const n = Number(amount || 0);
  return (
    n.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " DH"
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  if (dateStr.includes("—") || dateStr.length < 5) return dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  } catch {
    // Keep raw string
  }
  return dateStr;
}

function mapProductType(type?: string): string {
  switch (type) {
    case "achat_cafe":
      return "Café de spécialité";
    case "equipement_cafe":
      return "Équipement Pro";
    case "accessoire":
      return "Accessoire Barista";
    case "mixte":
      return "Café & Matériel";
    default:
      return "Fourniture / Prestation";
  }
}

export function generateDocumentPdf(data: DocumentPdfData): Buffer {
  const isLvt = data.brand === "lvt";
  const docTypeLabel = data.type === "devis" ? "DEVIS" : "FACTURE";
  const docTitle = `${docTypeLabel} ${data.id} - ${data.client || "Client"}`;

  const pdf = new PdfDoc(docTitle, `Document commercial Alea Food`);

  // Brand Palette (Clean Monochrome Design)
  const brandPrimary = "#000000";
  const brandDark = "#000000";
  const brandLightBg = "#F9FAFB";
  const brandBorder = "#E5E7EB";
  const textDark = "#111827";
  const textMuted = "#6B7280";
  const tableHeaderBg = "#000000";

  // 1. HEADER SECTION
  let y = 30;

  // Left: Brand & Company Identity
  // Monogram badge
  pdf.drawRect(38, y, 32, 32, {
    fillColor: brandDark,
    strokeColor: brandPrimary,
    lineWidth: 1,
  });
  pdf.drawText(isLvt ? "LVT" : "LV", 54, y + 21, {
    font: "F2",
    size: 11,
    color: brandPrimary,
    align: "center",
  });

  const brandName = isLvt ? "LA VARENNE TOUCH" : "LA VARENNE";
  pdf.drawText(brandName, 78, y + 15, {
    font: "F2",
    size: 16,
    color: brandDark,
  });

  pdf.drawText("ALEA FOOD S.A.R.L.", 78, y + 28, {
    font: "F2",
    size: 8.5,
    color: brandPrimary,
  });

  pdf.drawText(
    isLvt
      ? "Machines Espresso Professionnelles & Solutions Barista"
      : "Torréfaction Artisanale & Distributeur de Café d'Excellence",
    78,
    y + 40,
    { font: "F1", size: 8, color: textMuted }
  );

  pdf.drawText(
    "Casablanca, Maroc | Tél : +212 5 22 44 12 00 | contact@aleafood.ma",
    78,
    y + 51,
    { font: "F1", size: 7.5, color: textMuted }
  );

  pdf.drawText(
    "ICE : 002345678000045 — IF : 45678901 — RC Casablanca : 123456",
    78,
    y + 61,
    { font: "F1", size: 7, color: textMuted }
  );

  // Right: Document Meta Badge
  const metaBoxX = 390;
  const metaBoxW = 167;
  const metaBoxH = 68;

  pdf.drawRect(metaBoxX, y, metaBoxW, metaBoxH, {
    fillColor: brandLightBg,
    strokeColor: brandBorder,
    lineWidth: 0.75,
  });

  pdf.drawText(docTypeLabel, metaBoxX + metaBoxW / 2, y + 18, {
    font: "F2",
    size: 13,
    color: brandDark,
    align: "center",
  });

  pdf.drawText(`RÉF : ${data.id}`, metaBoxX + metaBoxW / 2, y + 31, {
    font: "F2",
    size: 10,
    color: brandPrimary,
    align: "center",
  });

  const statusLabel = (data.statut || "").toUpperCase();
  const dateEmission = data.date_label || formatDate(data.created_at);
  pdf.drawText(`Date d'émission : ${dateEmission}`, metaBoxX + 10, y + 46, {
    font: "F1",
    size: 7.5,
    color: textMuted,
  });

  if (data.type === "facture") {
    const echeance = data.echeance || formatDate(data.due_date) || "30 jours";
    pdf.drawText(`Échéance : ${echeance}`, metaBoxX + 10, y + 57, {
      font: "F2",
      size: 7.5,
      color: brandDark,
    });
  } else {
    pdf.drawText("Validité de l'offre : 30 jours", metaBoxX + 10, y + 57, {
      font: "F1",
      size: 7.5,
      color: textMuted,
    });
  }

  // Luxury Divider line
  y += 76;
  pdf.drawLine(38, y, 557, y, {
    color: brandBorder,
    lineWidth: 1,
  });

  // 2. CLIENT & COMMERCIAL DETAILS (2 Columns)
  y += 12;
  const colW = 252;
  const cardH = 82;

  // Left Card: Client
  pdf.drawRect(38, y, colW, cardH, {
    fillColor: brandLightBg,
    strokeColor: brandBorder,
    lineWidth: 0.75,
  });

  pdf.drawText("DESTINATAIRE / FACTURÉ À", 48, y + 14, {
    font: "F2",
    size: 7.5,
    color: brandPrimary,
  });

  pdf.drawText(data.client || "Client non spécifié", 48, y + 28, {
    font: "F2",
    size: 10.5,
    color: brandDark,
  });

  let clientInfoY = y + 41;
  if (data.client_details?.contact) {
    pdf.drawText(`Contact : ${data.client_details.contact}`, 48, clientInfoY, {
      font: "F1",
      size: 8,
      color: textDark,
    });
    clientInfoY += 12;
  }

  const location = [data.client_details?.ville, data.client_details?.secteur]
    .filter(Boolean)
    .join(" — ");
  if (location) {
    pdf.drawText(`Adresse : ${location}`, 48, clientInfoY, {
      font: "F1",
      size: 8,
      color: textMuted,
    });
    clientInfoY += 12;
  }

  const contactLine = [data.client_details?.tel, data.client_details?.email]
    .filter(Boolean)
    .join(" | ");
  if (contactLine) {
    pdf.drawText(contactLine, 48, clientInfoY, {
      font: "F1",
      size: 7.5,
      color: textMuted,
    });
  }

  // Right Card: Commercial & References
  const rightCardX = 38 + colW + 15;
  pdf.drawRect(rightCardX, y, colW, cardH, {
    fillColor: brandLightBg,
    strokeColor: brandBorder,
    lineWidth: 0.75,
  });

  pdf.drawText("INFORMATIONS COMMERCIALES", rightCardX + 10, y + 14, {
    font: "F2",
    size: 7.5,
    color: brandPrimary,
  });

  pdf.drawText(
    `Conseiller commercial : ${data.commercial || "Non assigné"}`,
    rightCardX + 10,
    y + 28,
    { font: "F2", size: 8.5, color: brandDark }
  );

  pdf.drawText(
    `Gamme & Univers : ${isLvt ? "La Varenne Touch" : "La Varenne"}`,
    rightCardX + 10,
    y + 40,
    { font: "F1", size: 8, color: textMuted }
  );

  if (data.commande_id) {
    pdf.drawText(`Commande associée : ${data.commande_id}`, rightCardX + 10, y + 51, {
      font: "F1",
      size: 8,
      color: textMuted,
    });
  } else if (data.devis_id) {
    pdf.drawText(`Devis d'origine : ${data.devis_id}`, rightCardX + 10, y + 51, {
      font: "F1",
      size: 8,
      color: textMuted,
    });
  } else {
    pdf.drawText("Paiement : Virement bancaire / Chèque", rightCardX + 10, y + 51, {
      font: "F1",
      size: 8,
      color: textMuted,
    });
  }

  pdf.drawText(`Statut du dossier : ${statusLabel}`, rightCardX + 10, y + 62, {
    font: "F2",
    size: 7.5,
    color: brandPrimary,
  });

  // 3. TABLE OF ARTICLES / ITEMS
  y += cardH + 16;
  const tableX = 38;
  const tableW = 519;
  const headerH = 22;

  // Table header background
  pdf.drawRect(tableX, y, tableW, headerH, {
    fillColor: tableHeaderBg,
  });

  // Column definitions
  // # (24), Description (225), Catégorie (90), Qté (45), P.U. HT (65), Total HT (70)
  const colNumX = tableX + 8;
  const colDescX = tableX + 28;
  const colCatX = tableX + 250;
  const colQtyX = tableX + 375; // Right aligned
  const colPuX = tableX + 440; // Right aligned
  const colTotX = tableX + 510; // Right aligned

  pdf.drawText("#", colNumX, y + 15, { font: "F2", size: 8, color: "#FFFFFF" });
  pdf.drawText("DÉSIGNATION DU PRODUIT / PRESTATION", colDescX, y + 15, {
    font: "F2",
    size: 8,
    color: "#FFFFFF",
  });
  pdf.drawText("CATÉGORIE", colCatX, y + 15, {
    font: "F2",
    size: 8,
    color: "#FFFFFF",
  });
  pdf.drawText("QTÉ", colQtyX, y + 15, {
    font: "F2",
    size: 8,
    color: "#FFFFFF",
    align: "right",
  });
  pdf.drawText("P.U. HT", colPuX, y + 15, {
    font: "F2",
    size: 8,
    color: "#FFFFFF",
    align: "right",
  });
  pdf.drawText("TOTAL HT", colTotX, y + 15, {
    font: "F2",
    size: 8,
    color: "#FFFFFF",
    align: "right",
  });

  y += headerH;

  // Prepare items list (use real items or fallback synthesized item)
  const effectiveItems: DocumentItem[] =
    data.items && data.items.length > 0
      ? data.items
      : [
          {
            product_name:
              data.notes ||
              `Fourniture & prestation café ${isLvt ? "La Varenne Touch" : "La Varenne"}`,
            product_type: "achat_cafe",
            quantity: 1,
            unit_price: Math.round((data.montant || 0) / 1.2),
            total_amount: Math.round((data.montant || 0) / 1.2),
          },
        ];

  const rowH = 21;
  let subtotalHt = 0;

  effectiveItems.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? "#FFFFFF" : brandLightBg;

    pdf.drawRect(tableX, y, tableW, rowH, {
      fillColor: rowBg,
    });

    // Subtle bottom border
    pdf.drawLine(tableX, y + rowH, tableX + tableW, y + rowH, {
      color: brandBorder,
      lineWidth: 0.5,
    });

    const itemTotal =
      Number(item.total_amount) ||
      (Number(item.quantity) || 1) * (Number(item.unit_price) || 0);
    subtotalHt += itemTotal;

    const unitPrice =
      Number(item.unit_price) || (item.quantity ? itemTotal / item.quantity : itemTotal);

    // Row texts
    pdf.drawText(String(index + 1), colNumX, y + 14, {
      font: "F1",
      size: 8,
      color: textMuted,
    });

    // Truncate long descriptions
    let desc = item.product_name || "Produit standard";
    if (desc.length > 42) desc = desc.substring(0, 40) + "...";
    pdf.drawText(desc, colDescX, y + 14, {
      font: "F2",
      size: 8.5,
      color: brandDark,
    });

    pdf.drawText(mapProductType(item.product_type), colCatX, y + 14, {
      font: "F1",
      size: 7.5,
      color: textMuted,
    });

    pdf.drawText(String(item.quantity || 1), colQtyX, y + 14, {
      font: "F1",
      size: 8,
      color: textDark,
      align: "right",
    });

    pdf.drawText(formatMoney(unitPrice), colPuX, y + 14, {
      font: "F1",
      size: 8,
      color: textDark,
      align: "right",
    });

    pdf.drawText(formatMoney(itemTotal), colTotX, y + 14, {
      font: "F2",
      size: 8.5,
      color: brandDark,
      align: "right",
    });

    y += rowH;
  });

  // Calculate taxes and totals
  // In Moroccan business standard: Montant TTC = Total Net à Payer
  const totalTtc = Number(data.montant) || Math.round(subtotalHt * 1.2);
  const totalHt = Math.round(totalTtc / 1.2);
  const tvaAmount = totalTtc - totalHt;

  // 4. FINANCIAL SUMMARY & BANK DETAILS (Side-by-side)
  y += 14;
  const summaryBoxW = 205;
  const summaryBoxX = tableX + tableW - summaryBoxW;

  // Left side: Bank Coordinates & Instructions Box
  const bankBoxW = tableW - summaryBoxW - 16;
  const bankBoxH = 80;

  pdf.drawRect(tableX, y, bankBoxW, bankBoxH, {
    fillColor: brandLightBg,
    strokeColor: brandBorder,
    lineWidth: 0.75,
  });

  pdf.drawText("COORDONNÉES BANCAIRES POUR RÈGLEMENT", tableX + 10, y + 14, {
    font: "F2",
    size: 7.5,
    color: brandPrimary,
  });

  pdf.drawText("Banque : Attijariwafa Bank — Agence Casa Racine", tableX + 10, y + 28, {
    font: "F1",
    size: 7.5,
    color: textDark,
  });

  pdf.drawText("Bénéficiaire : ALEA FOOD S.A.R.L.", tableX + 10, y + 39, {
    font: "F2",
    size: 7.5,
    color: brandDark,
  });

  pdf.drawText("RIB : 007 780 0001234567890123 45", tableX + 10, y + 50, {
    font: "F2",
    size: 8,
    color: brandPrimary,
  });

  const clientRef = (data.client || "Client").substring(0, 16);
  pdf.drawText(
    `Indication du virement : « ${data.id} - ${clientRef} »`,
    tableX + 10,
    y + 61,
    { font: "F1", size: 7.2, color: textMuted }
  );

  // Right side: Financial Totals Box
  pdf.drawRect(summaryBoxX, y, summaryBoxW, bankBoxH, {
    fillColor: brandLightBg,
    strokeColor: brandBorder,
    lineWidth: 0.75,
  });

  pdf.drawText("Total Brut HT :", summaryBoxX + 12, y + 16, {
    font: "F1",
    size: 8,
    color: textMuted,
  });
  pdf.drawText(formatMoney(totalHt), summaryBoxX + summaryBoxW - 12, y + 16, {
    font: "F1",
    size: 8,
    color: textDark,
    align: "right",
  });

  pdf.drawText("TVA (20,00 %) :", summaryBoxX + 12, y + 30, {
    font: "F1",
    size: 8,
    color: textMuted,
  });
  pdf.drawText(formatMoney(tvaAmount), summaryBoxX + summaryBoxW - 12, y + 30, {
    font: "F1",
    size: 8,
    color: textDark,
    align: "right",
  });

  // Total Net TTC Banner inside totals box
  pdf.drawRect(summaryBoxX, y + 44, summaryBoxW, 36, {
    fillColor: brandPrimary,
  });

  pdf.drawText("TOTAL NET TTC", summaryBoxX + 12, y + 66, {
    font: "F2",
    size: 9.5,
    color: "#FFFFFF",
  });
  pdf.drawText(formatMoney(totalTtc), summaryBoxX + summaryBoxW - 12, y + 67, {
    font: "F2",
    size: 12,
    color: "#FFFFFF",
    align: "right",
  });

  // 5. SIGNATURE & LEGAL CONDITIONS BLOCK
  y += bankBoxH + 14;

  const notesH = 68;
  pdf.drawRect(tableX, y, tableW, notesH, {
    fillColor: "#FFFFFF",
    strokeColor: brandBorder,
    lineWidth: 0.75,
  });

  if (data.type === "devis") {
    // Signature block for Devis
    pdf.drawText(
      "CONDITIONS & BON POUR ACCORD (DEVIS VALABLE 30 JOURS)",
      tableX + 12,
      y + 13,
      { font: "F2", size: 7.5, color: brandPrimary }
    );

    pdf.drawText(
      "Pour valider votre commande, merci de retourner ce devis signé et revêtu de la mention manuscrite « Bon pour accord ».",
      tableX + 12,
      y + 24,
      { font: "F1", size: 7, color: textMuted }
    );

    pdf.drawLine(tableX + 260, y + 5, tableX + 260, y + notesH - 5, {
      color: brandBorder,
      lineWidth: 0.5,
      dash: [3, 2],
    });

    pdf.drawText("Pour Alea Food (Cachet & Signature)", tableX + 12, y + 40, {
      font: "F2",
      size: 7.5,
      color: textMuted,
    });

    pdf.drawText(
      "Pour le Client (Mention « Bon pour accord », Date & Signature)",
      tableX + 270,
      y + 40,
      { font: "F2", size: 7.5, color: textMuted }
    );
  } else {
    // Mentions for Facture
    pdf.drawText("CONDITIONS DE RÈGLEMENT & MENTIONS LÉGALES", tableX + 12, y + 14, {
      font: "F2",
      size: 7.5,
      color: brandPrimary,
    });

    pdf.drawText(
      "Règlement exigible à réception ou à la date d'échéance mentionnée. En cas de retard de paiement,",
      tableX + 12,
      y + 26,
      { font: "F1", size: 7.2, color: textMuted }
    );
    pdf.drawText(
      "des pénalités de retard au taux légal en vigueur ainsi qu'une indemnité forfaitaire pour frais de recouvrement seront appliquées.",
      tableX + 12,
      y + 36,
      { font: "F1", size: 7.2, color: textMuted }
    );

    if (data.notes) {
      pdf.drawText(`Note : ${data.notes}`, tableX + 12, y + 50, {
        font: "F3",
        size: 7.2,
        color: brandDark,
      });
    } else {
      pdf.drawText(
        "Marchandises vendues restent la propriété d'Alea Food S.A.R.L. jusqu'au paiement intégral de la facture.",
        tableX + 12,
        y + 50,
        { font: "F1", size: 7, color: textMuted }
      );
    }
  }

  // 6. FOOTER
  const footerY = 810;
  pdf.drawLine(38, footerY, 557, footerY, {
    color: brandBorder,
    lineWidth: 0.75,
  });

  pdf.drawText(
    "Alea Food S.A.R.L. — Siège social : 42 Boulevard d'Anfa, Casablanca, Maroc — Capital : 1 000 000 DH",
    pdf.pageWidth / 2,
    footerY + 11,
    { font: "F1", size: 6.8, color: textMuted, align: "center" }
  );

  pdf.drawText(
    "RC Casablanca : 123456 | Patente : 34567890 | IF : 45678901 | ICE : 002345678000045 | CNSS : 8923412",
    pdf.pageWidth / 2,
    footerY + 20,
    { font: "F1", size: 6.5, color: textMuted, align: "center" }
  );

  return pdf.toBuffer();
}
