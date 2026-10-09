import fs from "fs";
import path from "path";
import { DocumentPdfData } from "./types";

function formatStatus(statut?: string): string {
  const map: Record<string, string> = {
    en_attente: "EN ATTENTE",
    valide: "VALIDÉ",
    validee: "VALIDÉE",
    accepte: "ACCEPTÉ",
    refuse: "REFUSÉ",
    refusee: "REFUSÉE",
    annule: "ANNULÉ",
    annulee: "ANNULÉE",
    livree: "LIVRÉE",
    payee: "PAYÉE",
    brouillon: "BROUILLON",
  };
  return map[statut?.toLowerCase() || ""] || (statut || "EN ATTENTE").toUpperCase();
}

function formatCategory(type?: string): string {
  if (!type) return "Café de spécialité";
  if (type === "achat_cafe") return "Café de spécialité";
  if (type === "equipement_cafe") return "Équipement Pro";
  if (type === "mixte") return "Mixte";
  if (type === "autre") return "Autre prestation";
  return type;
}

function formatDateLabel(data: DocumentPdfData): string {
  if (data.date_label) return data.date_label;
  if (data.created_at) {
    try {
      const d = new Date(data.created_at);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
        });
      }
    } catch {
      // fallback
    }
  }
  return "Aujourd'hui";
}

export function generateHtmlDocument(data: DocumentPdfData): string {
  const docTypeLabel = data.type === "devis" ? "DEVIS" : "FACTURE";
  const brandName = data.brand === "lvt" ? "La Varenne Touch" : "La Varenne";

  let logoSrc = "/images/LA VARENNE LOGO VR black.png";
  try {
    const fullPath = path.join(process.cwd(), "public", "images", "LA VARENNE LOGO VR black.png");
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString("base64");
      logoSrc = `data:image/png;base64,${b64}`;
    }
  } catch {
    logoSrc = "/images/LA VARENNE LOGO VR black.png";
  }

  const formatMoney = (amount: number) =>
    Number(amount || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " DH";

  const totalTtc = Number(data.montant) || 0;
  const totalHt = Math.round(totalTtc / 1.2);
  const tva = totalTtc - totalHt;

  const items =
    data.items && data.items.length > 0
      ? data.items
      : [
          {
            product_name:
              data.notes ||
              `Fourniture & prestation café ${brandName}`,
            product_type: "achat_cafe",
            quantity: 1,
            unit_price: totalHt,
            total_amount: totalHt,
          },
        ];

  const dateIssued = formatDateLabel(data);
  const statusLabel = formatStatus(data.statut);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${docTypeLabel} ${data.id} — ${brandName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111827;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.45;
      padding: 34px 38px;
      max-width: 860px;
      margin: 0 auto;
      -webkit-font-smoothing: antialiased;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-left {
      max-width: 440px;
    }

    .logo-img {
      height: 38px;
      width: auto;
      max-width: 220px;
      object-fit: contain;
      display: block;
    }

    .company-details {
      margin-top: 14px;
    }

    .company-name {
      font-weight: 800;
      font-size: 13px;
      color: #000000;
      letter-spacing: -0.2px;
    }

    .company-tagline {
      color: #6B7280;
      font-size: 11px;
      margin-top: 2px;
    }

    .company-meta-line {
      color: #374151;
      font-size: 11.5px;
      margin-top: 3px;
    }

    .company-fisc {
      color: #9CA3AF;
      font-size: 10px;
      margin-top: 5px;
      letter-spacing: 0.02em;
    }

    .header-right {
      text-align: right;
      min-width: 230px;
    }

    .doc-main-title {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #000000;
      text-align: right;
      line-height: 1;
      margin-bottom: 8px;
    }

    .doc-meta-info {
      font-size: 11.5px;
      color: #4B5563;
      line-height: 1.55;
      text-align: right;
    }

    .status-card {
      margin-top: 14px;
      margin-left: auto;
      width: 195px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 8px 14px;
      text-align: left;
    }

    .status-card-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #6B7280;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .status-card-value {
      font-size: 13px;
      font-weight: 800;
      color: #111827;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      background: #F9FAFB;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .card-left {
      padding: 16px 20px;
      border-right: 1px solid #E5E7EB;
    }

    .card-right {
      padding: 16px 20px;
    }

    .card-head-title {
      font-size: 10px;
      font-weight: 700;
      color: #6B7280;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .card-client-name {
      font-size: 15px;
      font-weight: 800;
      color: #000000;
      margin-top: 2px;
    }

    .card-info-line {
      font-size: 11.5px;
      color: #374151;
      line-height: 1.55;
      margin-top: 3px;
    }

    /* Section Titles */
    .section-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #111827;
      margin-bottom: 8px;
    }

    /* Items Table */
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
    }

    table.items-table thead th {
      background: #000000;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 10px 12px;
    }

    table.items-table tbody td {
      padding: 10px 12px;
      font-size: 11.5px;
      border-bottom: 1px solid #E5E7EB;
      vertical-align: middle;
      background: #FFFFFF;
    }

    table.items-table tbody tr:nth-child(even) td {
      background: #FAFAFA;
    }

    table.items-table tbody tr:last-child td {
      border-bottom: none;
    }

    /* Settlement & Totals Grid */
    .settlement-totals-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      align-items: start;
      margin-bottom: 26px;
    }

    .settlement-block {
      font-size: 11.5px;
      color: #374151;
      line-height: 1.6;
    }

    .settlement-line {
      margin-top: 2px;
    }

    .totals-block {
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
      background: #FAFAFA;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 14px;
      border-bottom: 1px solid #E5E7EB;
    }

    .totals-label {
      font-size: 11.5px;
      font-weight: 600;
      color: #374151;
    }

    .totals-val {
      font-size: 12.5px;
      font-weight: 800;
      color: #000000;
    }

    .totals-box-ttc {
      background: #000000;
      color: #FFFFFF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
    }

    .ttc-label {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .ttc-val {
      font-size: 17px;
      font-weight: 900;
      letter-spacing: -0.01em;
      text-align: right;
      line-height: 1.1;
    }

    /* Terms & Signature */
    .terms-section {
      margin-bottom: 26px;
    }

    .terms-disclaimer {
      font-size: 11px;
      color: #4B5563;
      line-height: 1.5;
      margin-top: 4px;
      margin-bottom: 12px;
    }

    .signature-boxes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
    }

    .sig-box:first-child {
      border-right: 1px solid #E5E7EB;
    }

    .sig-box-head {
      background: #F9FAFB;
      padding: 8px 14px;
      border-bottom: 1px solid #E5E7EB;
    }

    .sig-title {
      font-size: 11px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
    }

    .sig-sub {
      font-size: 9.5px;
      color: #6B7280;
      margin-top: 2px;
    }

    .sig-box-body {
      height: 72px;
      background: #FFFFFF;
    }

    /* Footer */
    .legal-footer {
      text-align: center;
      font-size: 9.5px;
      color: #6B7280;
      line-height: 1.6;
      margin-top: 18px;
    }

    @media print {
      body {
        padding: 0 !important;
        margin: 0 !important;
        background: #FFFFFF !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      @page {
        size: A4 portrait;
        margin: 12mm 14mm 12mm 14mm;
      }
    }
  </style>
  <script>
    if (window.self === window.top) {
      window.addEventListener('load', function() {
        window.focus();
        setTimeout(function() {
          window.print();
        }, 250);
      });
    }
  </script>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" alt="${brandName}" class="logo-img" />
      <div class="company-details">
        <div class="company-name">ALEA FOOD S.A.R.L.</div>
        <div class="company-tagline">Torréfaction artisanale & distributeur de café d’excellence</div>
        <div class="company-meta-line">Casablanca, Maroc · +212 5 22 44 12 00</div>
        <div class="company-meta-line">contact@aleafood.ma</div>
        <div class="company-fisc">ICE : 002345678000045 · IF : 45678901 · RC Casablanca : 123456</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-main-title">${docTypeLabel}</div>
      <div class="doc-meta-info">
        <div>RÉFÉRENCE <strong style="color: #111827;">${data.id}</strong></div>
        <div>Émis le : <strong>${dateIssued}</strong></div>
        <div>${data.type === "facture" ? `Échéance : <strong>${data.echeance || "+30 jours"}</strong>` : "Validité : <strong>30 jours</strong>"}</div>
      </div>
      <div class="status-card">
        <div class="status-card-label">STATUT DU DOSSIER</div>
        <div class="status-card-value">${statusLabel}</div>
      </div>
    </div>
  </div>

  <!-- Information Cards -->
  <div class="cards-grid">
    <div class="card-left">
      <div class="card-head-title">DESTINATAIRE / FACTURÉ À</div>
      <div class="card-client-name">${data.client}</div>
      ${data.client_details?.contact ? `<div class="card-info-line">Contact : ${data.client_details.contact}</div>` : ""}
      ${data.client_details?.ville ? `<div class="card-info-line">Ville : ${data.client_details.ville}${data.client_details.secteur ? ` (${data.client_details.secteur})` : ""}</div>` : ""}
      ${data.client_details?.tel ? `<div class="card-info-line">Tél : ${data.client_details.tel}</div>` : ""}
    </div>
    <div class="card-right">
      <div class="card-head-title">INFORMATIONS COMMERCIALES</div>
      <div class="card-info-line" style="margin-top: 6px;">
        Conseiller commercial : <strong style="color: #111827;">${data.commercial || "Sara Idrissi"}</strong>
      </div>
      <div class="card-info-line">
        Gamme & univers : <strong style="color: #111827;">${brandName}</strong>
      </div>
      <div class="card-info-line">
        Paiement : <strong style="color: #111827;">Virement bancaire / Chèque</strong>
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <div class="section-title">${docTypeLabel === "DEVIS" ? "DÉTAIL DU DEVIS" : "DÉTAIL DE LA FACTURE"}</div>
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 38px; text-align: left;">#</th>
        <th style="text-align: left;">DÉSIGNATION DU PRODUIT / PRESTATION</th>
        <th style="text-align: left;">CATÉGORIE</th>
        <th style="width: 50px; text-align: center;">QTÉ</th>
        <th style="width: 105px; text-align: right;">P.U. HT</th>
        <th style="width: 115px; text-align: right;">TOTAL HT</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, idx) => `
        <tr>
          <td style="color: #6B7280; font-weight: 500;">${String(idx + 1).padStart(2, "0")}</td>
          <td><strong style="color: #111827;">${it.product_name}</strong></td>
          <td style="color: #4B5563;">${formatCategory(it.product_type)}</td>
          <td style="text-align: center; color: #111827; font-weight: 500;">${it.quantity || 1}</td>
          <td style="text-align: right; color: #111827;">${formatMoney(it.unit_price)}</td>
          <td style="text-align: right;"><strong style="color: #000000;">${formatMoney(it.total_amount)}</strong></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <!-- Settlement & Totals Block -->
  <div class="settlement-totals-grid">
    <div class="settlement-block">
      <div class="section-title" style="margin-bottom: 8px;">COORDONNÉES BANCAIRES POUR RÈGLEMENT</div>
      <div class="settlement-line">Banque : <strong style="color: #111827;">Attijariwafa Bank – Agence Casa Racine</strong></div>
      <div class="settlement-line">Bénéficiaire : <strong style="color: #111827;">ALEA FOOD S.A.R.L.</strong></div>
      <div class="settlement-line">RIB : <strong style="color: #000000; font-family: monospace, sans-serif; letter-spacing: 0.03em;">007 780 0001234567890123 45</strong></div>
      <div style="margin-top: 5px; font-size: 10.5px; color: #6B7280;">Indication du virement : « ${data.id} - ${data.client} »</div>
    </div>

    <div class="totals-block">
      <div class="totals-row">
        <span class="totals-label">Total brut HT</span>
        <span class="totals-val">${formatMoney(totalHt)}</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">TVA (20,00 %)</span>
        <span class="totals-val">${formatMoney(tva)}</span>
      </div>
      <div class="totals-box-ttc">
        <span class="ttc-label">TOTAL NET TTC</span>
        <span class="ttc-val">${formatMoney(totalTtc)}</span>
      </div>
    </div>
  </div>

  <!-- Signature & Terms -->
  <div class="terms-section">
    <div class="section-title">CONDITIONS & BON POUR ACCORD</div>
    <div class="terms-disclaimer">
      ${data.type === "devis"
        ? "Devis valable 30 jours. Pour valider votre commande, merci de retourner ce devis signé et revêtu de la mention manuscrite « Bon pour accord »."
        : "Paiement par virement bancaire ou chèque à l'ordre d'ALEA FOOD S.A.R.L. à l'échéance convenue."}
    </div>
    <div class="signature-boxes-grid">
      <div class="sig-box">
        <div class="sig-box-head">
          <div class="sig-title">POUR ALEA FOOD</div>
          <div class="sig-sub">Cachet & signature</div>
        </div>
        <div class="sig-box-body"></div>
      </div>
      <div class="sig-box">
        <div class="sig-box-head">
          <div class="sig-title">POUR LE CLIENT</div>
          <div class="sig-sub">Mention « Bon pour accord », date & signature</div>
        </div>
        <div class="sig-box-body"></div>
      </div>
    </div>
  </div>

  <!-- Legal Footer -->
  <div class="legal-footer">
    ALEA FOOD S.A.R.L. · Siège social : 42 Boulevard d’Anfa, Casablanca, Maroc · Capital : 1 000 000 DH<br>
    RC Casablanca : 123456 | Patente : 34567890 | IF : 45678901 | ICE : 002345678000045 | CNSS : 8923412
  </div>
</body>
</html>`;
}
