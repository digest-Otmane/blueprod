import { DocumentPdfData } from "./types";

export function generateHtmlDocument(data: DocumentPdfData): string {
  const isLvt = data.brand === "lvt";
  const docTypeLabel = data.type === "devis" ? "DEVIS" : "FACTURE";
  const brandName = isLvt ? "La Varenne Touch" : "La Varenne";
  const brandAccent = isLvt ? "#627B55" : "#A67C38";
  const brandLight = isLvt ? "#F4F7F3" : "#FAF7F2";
  const brandBorder = isLvt ? "#D3DDD1" : "#E2D8C9";

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

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${docTypeLabel} ${data.id} — ${brandName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #1C1917;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.45;
      padding: 30px;
      max-width: 860px;
      margin: 0 auto;
    }

    .top-accent {
      height: 6px;
      background: ${brandAccent};
      margin: -30px -30px 24px -30px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1.5px solid ${brandBorder};
    }

    .brand-title {
      font-family: 'Fraunces', serif;
      font-size: 24px;
      font-weight: 700;
      color: #161310;
      letter-spacing: -0.5px;
    }

    .company-sub {
      color: ${brandAccent};
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    .company-desc {
      color: #6B655B;
      font-size: 11.5px;
      margin-top: 4px;
    }

    .company-fisc {
      color: #8C806B;
      font-size: 10.5px;
      margin-top: 6px;
    }

    .doc-meta {
      background: ${brandLight};
      border: 1px solid ${brandBorder};
      border-radius: 8px;
      padding: 14px 18px;
      text-align: right;
      min-width: 220px;
    }

    .doc-type {
      font-family: 'Fraunces', serif;
      font-size: 18px;
      font-weight: 700;
      color: #161310;
    }

    .doc-ref {
      font-size: 13px;
      font-weight: 700;
      color: ${brandAccent};
      margin-top: 2px;
    }

    .doc-dates {
      font-size: 11px;
      color: #6B655B;
      margin-top: 6px;
    }

    .cards-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
    }

    .card {
      background: ${brandLight};
      border: 1px solid ${brandBorder};
      border-radius: 8px;
      padding: 14px 16px;
    }

    .card-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${brandAccent};
      margin-bottom: 6px;
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: #161310;
      margin-bottom: 4px;
    }

    .card-line {
      font-size: 11.5px;
      color: #4A443C;
      margin-top: 3px;
    }

    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    table.items-table th {
      background: #2A231C;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    table.items-table td {
      padding: 10px 12px;
      font-size: 12px;
      border-bottom: 1px solid ${brandBorder};
    }

    table.items-table tr:nth-child(even) {
      background: ${brandLight};
    }

    .align-r { text-align: right; }

    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 20px;
      margin-bottom: 24px;
    }

    .bank-box {
      background: ${brandLight};
      border: 1px solid ${brandBorder};
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 11.5px;
    }

    .totals-box {
      background: ${brandLight};
      border: 1px solid ${brandBorder};
      border-radius: 8px;
      overflow: hidden;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      font-size: 12px;
      color: #4A443C;
    }

    .totals-banner {
      background: ${brandAccent};
      color: #FFFFFF;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      font-weight: 700;
      font-size: 14px;
    }

    .conditions-box {
      border: 1px solid ${brandBorder};
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 11px;
      color: #6B655B;
      margin-bottom: 24px;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed ${brandBorder};
    }

    .footer {
      border-top: 1px solid ${brandBorder};
      padding-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #8C806B;
      line-height: 1.6;
    }

    @media print {
      body { padding: 0; }
      .top-accent { margin: 0 0 20px 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="top-accent"></div>

  <div class="header">
    <div>
      <div class="brand-title">${brandName.toUpperCase()}</div>
      <div class="company-sub">Alea Food S.A.R.L.</div>
      <div class="company-desc">Torréfaction Artisanale & Distributeur de Café d'Excellence</div>
      <div class="company-fisc">
        Casablanca, Maroc | Tél: +212 5 22 44 12 00 | contact@aleafood.ma<br>
        ICE: 002345678000045 — IF: 45678901 — RC: 123456
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">${docTypeLabel}</div>
      <div class="doc-ref">N° ${data.id}</div>
      <div class="doc-dates">
        Date d'émission : <strong>${data.date_label || "Aujourd'hui"}</strong><br>
        ${
          data.type === "facture"
            ? `Échéance : <strong>${data.echeance || "+30 jours"}</strong>`
            : "Validité de l'offre : <strong>30 jours</strong>"
        }
      </div>
    </div>
  </div>

  <div class="cards-row">
    <div class="card">
      <div class="card-label">Destinataire / Client</div>
      <div class="card-title">${data.client}</div>
      ${
        data.client_details?.contact
          ? `<div class="card-line">Contact : ${data.client_details.contact}</div>`
          : ""
      }
      ${
        data.client_details?.ville
          ? `<div class="card-line">Ville : ${data.client_details.ville} ${
              data.client_details.secteur ? `(${data.client_details.secteur})` : ""
            }</div>`
          : ""
      }
      ${
        data.client_details?.tel
          ? `<div class="card-line">Tél : ${data.client_details.tel}</div>`
          : ""
      }
    </div>
    <div class="card">
      <div class="card-label">Dossier Commercial</div>
      <div class="card-title">${data.commercial || "Commercial Alea Food"}</div>
      <div class="card-line">Marque : ${brandName}</div>
      ${
        data.commande_id
          ? `<div class="card-line">Commande liée : ${data.commande_id}</div>`
          : ""
      }
      ${
        data.devis_id
          ? `<div class="card-line">Devis d'origine : ${data.devis_id}</div>`
          : ""
      }
      <div class="card-line">Statut : <strong>${(data.statut || "").toUpperCase()}</strong></div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Désignation</th>
        <th>Catégorie</th>
        <th class="align-r" style="width: 50px;">Qté</th>
        <th class="align-r" style="width: 100px;">P.U. HT</th>
        <th class="align-r" style="width: 110px;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${it.product_name}</strong></td>
          <td>${it.product_type || "Café de spécialité"}</td>
          <td class="align-r">${it.quantity || 1}</td>
          <td class="align-r">${formatMoney(it.unit_price)}</td>
          <td class="align-r"><strong>${formatMoney(it.total_amount)}</strong></td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="bottom-row">
    <div class="bank-box">
      <div class="card-label">Coordonnées bancaires pour règlement</div>
      <div>Banque : <strong>Attijariwafa Bank</strong> — Agence Casablanca Racine</div>
      <div>Bénéficiaire : <strong>ALEA FOOD S.A.R.L.</strong></div>
      <div>RIB : <strong style="color: ${brandAccent};">007 780 0001234567890123 45</strong></div>
      <div style="margin-top: 6px; font-size: 10.5px; color: #6B655B;">
        Merci d'indiquer la référence <strong>${data.id}</strong> sur l'ordre de virement.
      </div>
    </div>

    <div class="totals-box">
      <div class="totals-row">
        <span>Total Brut HT</span>
        <span>${formatMoney(totalHt)}</span>
      </div>
      <div class="totals-row">
        <span>TVA (20,00 %)</span>
        <span>${formatMoney(tva)}</span>
      </div>
      <div class="totals-banner">
        <span>TOTAL NET TTC</span>
        <span>${formatMoney(totalTtc)}</span>
      </div>
    </div>
  </div>

  <div class="conditions-box">
    <strong>CONDITIONS DE VENTE & MENTIONS LÉGALES</strong>
    <p style="margin-top: 4px;">
      ${
        data.type === "devis"
          ? "Offre valable 30 jours à compter de la date d'émission. Pour validation définitive, merci de nous retourner le présent devis revêtu de la mention manuscrite « Bon pour accord » ainsi que du cachet et signature de l'acheteur."
          : "Paiement par virement bancaire ou chèque à l'ordre d'Alea Food S.A.R.L. à échéance. Tout retard de paiement donnera lieu de plein droit à une pénalité légale ainsi qu'à une indemnité forfaitaire pour frais de recouvrement."
      }
    </p>
    ${
      data.type === "devis"
        ? `
      <div class="signature-grid">
        <div>Pour Alea Food (Cachet & Signature) :</div>
        <div>Pour le Client (« Bon pour accord », Date & Signature) :</div>
      </div>
    `
        : ""
    }
  </div>

  <div class="footer">
    Alea Food S.A.R.L. — Société au capital de 1 000 000 DH — 42 Boulevard d'Anfa, 20000 Casablanca, Maroc<br>
    RC Casablanca : 123456 | Patente : 34567890 | IF : 45678901 | ICE : 002345678000045 | CNSS : 8923412
  </div>
</body>
</html>`;
}
