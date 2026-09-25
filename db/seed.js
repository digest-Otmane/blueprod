/* Insère les données initiales et de démonstration dans Supabase PostgreSQL :
 * - 11 Utilisateurs (Admin, Centre d'Appel, Commerciaux LV & LVT)
 * - 12 Clients réalistes (Casablanca, Rabat, Marrakech, Tanger, Fès, Agadir)
 * - 18 Leads répartis sur les étapes Kanban (a_qualifier, nouveau, contacte, qualifie, converti, perdu)
 * - 12 Commandes avec montants et statuts variés
 * - 7 Devis
 * - 7 Factures
 * - Messages d'échanges WhatsApp
 *
 * Usage : npm run seed
 */
const path = require("path");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

// Charger les variables d'environnement (.env.local puis .env)
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Erreur : SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définis dans .env.local ou .env"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log("🚀 Connexion à Supabase :", supabaseUrl);

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // 1. UTILISATEURS & IDENTIFIANTS
  const users = [
    {
      id: "admin",
      name: "Alea Food",
      email: "administration@aleafood.ma",
      password: "AleaFood2026",
      role: "admin",
      brand: "all",
      initials: "AF",
      altEmail: "hakeem@gmail.com",
      altPassword: "123456",
    },
    {
      id: "meryem-sqalli",
      name: "Meryem Sqalli",
      email: "meryem.sqalli@aleafood.ma",
      password: "Meryem2026",
      role: "centre_appel",
      brand: "all",
      initials: "MS",
    },
    {
      id: "yassine-el-amrani",
      name: "Yassine El Amrani",
      email: "yassine.el.amrani@lavarenne.ma",
      password: "Yassine2026",
      role: "commercial",
      brand: "lv",
      initials: "YE",
    },
    {
      id: "sara-idrissi",
      name: "Sara Idrissi",
      email: "sara.idrissi@lavarenne.ma",
      password: "Sara2026",
      role: "commercial",
      brand: "lv",
      initials: "SI",
    },
    {
      id: "karim-benjelloun",
      name: "Karim Benjelloun",
      email: "karim.benjelloun@lavarenne.ma",
      password: "Karim2026",
      role: "commercial",
      brand: "lv",
      initials: "KB",
    },
    {
      id: "omar-zerouali",
      name: "Omar Zerouali",
      email: "omar.zerouali@lavarenne.ma",
      password: "Omar2026",
      role: "commercial",
      brand: "lv",
      initials: "OZ",
    },
    {
      id: "hicham-tazi",
      name: "Hicham Tazi",
      email: "hicham.tazi@lavarennetouch.ma",
      password: "Hicham2026",
      role: "commercial",
      brand: "lvt",
      initials: "HT",
    },
    {
      id: "meryem-alaoui",
      name: "Meryem Alaoui",
      email: "meryem.alaoui@lavarennetouch.ma",
      password: "Meryem2026a",
      role: "commercial",
      brand: "lvt",
      initials: "MA",
    },
    {
      id: "hanan-fassi",
      name: "Hanan Fassi",
      email: "hanan.fassi@lavarennetouch.ma",
      password: "Hanan2026",
      role: "commercial",
      brand: "lvt",
      initials: "HF",
    },
    {
      id: "mohamed-rami",
      name: "Mohamed Rami",
      email: "mohamed.rami@lavarennetouch.ma",
      password: "Mohamed2026",
      role: "commercial",
      brand: "lvt",
      initials: "MR",
    },
    {
      id: "ayoub-sabri",
      name: "Ayoub Sabri",
      email: "ayoub.sabri@lavarennetouch.ma",
      password: "Ayoub2026",
      role: "commercial",
      brand: "lvt",
      initials: "AS",
    },
  ];

  console.log(`👤 Insertion de ${users.length} utilisateurs...`);
  for (const u of users) {
    const password_hash = hash(u.password);

    const { error: userErr } = await supabase.from("users").upsert(
      {
        id: u.id,
        name: u.name,
        email: u.email,
        password_hash,
        role: u.role,
        brand: u.brand,
        initials: u.initials,
      },
      { onConflict: "id" }
    );
    if (userErr) throw userErr;

    const { error: credErr } = await supabase.from("user_credentials").upsert(
      {
        user_id: u.id,
        email: u.email,
        password_hash,
      },
      { onConflict: "email" }
    );
    if (credErr) throw credErr;

    if (u.altEmail) {
      const alt_hash = hash(u.altPassword);
      const { error: altCredErr } = await supabase.from("user_credentials").upsert(
        {
          user_id: u.id,
          email: u.altEmail,
          password_hash: alt_hash,
        },
        { onConflict: "email" }
      );
      if (altCredErr) throw altCredErr;
    }
  }

  // 2. CLIENTS RÉALISTES
  console.log("🏢 Insertion des clients...");
  const clients = [
    {
      id: "c1",
      nom: "Café Prestige",
      ville: "Casablanca",
      secteur: "Café / Salon de thé",
      brands: "lv,lvt",
      contact: "Anas Berrada",
      tel: "+212 5 22 44 12 09",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
    },
    {
      id: "c2",
      nom: "Restaurant Le Marrakchi",
      ville: "Marrakech",
      secteur: "Restauration",
      brands: "lv",
      contact: "Fatima Zahra Sqalli",
      tel: "+212 5 24 38 21 77",
      commercial: "Sara Idrissi",
      commercial_id: "sara-idrissi",
    },
    {
      id: "c3",
      nom: "Hôtel Atlas Rabat",
      ville: "Rabat",
      secteur: "Hôtellerie",
      brands: "lv,lvt",
      contact: "Mehdi Cherkaoui",
      tel: "+212 5 37 70 05 44",
      commercial: "Karim Benjelloun",
      commercial_id: "karim-benjelloun",
    },
    {
      id: "c4",
      nom: "Boulangerie Dar Chaabi",
      ville: "Fès",
      secteur: "Boulangerie / Pâtisserie",
      brands: "lv",
      contact: "Rachid Amrani",
      tel: "+212 5 35 62 90 18",
      commercial: "Omar Zerouali",
      commercial_id: "omar-zerouali",
    },
    {
      id: "c5",
      nom: "Coffee Shop Nomad",
      ville: "Tanger",
      secteur: "Café / Salon de thé",
      brands: "lvt",
      contact: "Salma Ouazzani",
      tel: "+212 5 39 33 47 21",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
    },
    {
      id: "c6",
      nom: "Palais Bahia Traiteur",
      ville: "Marrakech",
      secteur: "Traiteur",
      brands: "lv,lvt",
      contact: "Amine Alami",
      tel: "+212 5 24 45 88 12",
      commercial: "Meryem Alaoui",
      commercial_id: "meryem-alaoui",
    },
    {
      id: "c7",
      nom: "L'Avenue Coffee Lounge",
      ville: "Casablanca",
      secteur: "Café / Salon de thé",
      brands: "lvt",
      contact: "Kenza Bennani",
      tel: "+212 5 22 98 76 54",
      commercial: "Ayoub Sabri",
      commercial_id: "ayoub-sabri",
    },
    {
      id: "c8",
      nom: "Hôtel Marina Bay",
      ville: "Tanger",
      secteur: "Hôtellerie",
      brands: "lv",
      contact: "Tariq Mansouri",
      tel: "+212 5 39 94 11 22",
      commercial: "Mohamed Rami",
      commercial_id: "mohamed-rami",
    },
    {
      id: "c9",
      nom: "Pâtisserie Gourmet Agadir",
      ville: "Agadir",
      secteur: "Boulangerie / Pâtisserie",
      brands: "lv,lvt",
      contact: "Nadia Chraibi",
      tel: "+212 5 28 82 34 56",
      commercial: "Hanan Fassi",
      commercial_id: "hanan-fassi",
    },
    {
      id: "c10",
      nom: "Villa Blanca Restaurant",
      ville: "Casablanca",
      secteur: "Restauration",
      brands: "lv",
      contact: "Reda Filali",
      tel: "+212 5 22 36 77 88",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
    },
    {
      id: "c11",
      nom: "Café de Paris",
      ville: "Tanger",
      secteur: "Café / Salon de thé",
      brands: "lvt",
      contact: "Ghita Senhaji",
      tel: "+212 5 39 93 45 67",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
    },
    {
      id: "c12",
      nom: "Riad Fès Relais",
      ville: "Fès",
      secteur: "Hôtellerie",
      brands: "lv",
      contact: "Jalil El Fassi",
      tel: "+212 5 35 74 12 00",
      commercial: "Omar Zerouali",
      commercial_id: "omar-zerouali",
    },
  ];

  const { error: clientsErr } = await supabase
    .from("clients")
    .upsert(clients, { onConflict: "id" });
  if (clientsErr) throw clientsErr;

  // 3. LEADS KANBAN (18 leads)
  console.log("🎯 Insertion des leads...");
  const leads = [
    // a_qualifier
    {
      id: "l1",
      client: "Café Panorama Corniche",
      client_id: null,
      brand: "lv",
      stage: "a_qualifier",
      commercial: null,
      commercial_id: null,
      valeur: 0,
      tel: "+212 6 61 33 44 55",
      date_label: "24 sept.",
      source: "facebook",
      meta_note: "Intéressé par approvisionnement mensuel en grains",
    },
    {
      id: "l2",
      client: "Boulangerie La Parisienne",
      client_id: null,
      brand: "lv",
      stage: "a_qualifier",
      commercial: null,
      commercial_id: null,
      valeur: 0,
      tel: "+212 6 62 11 88 99",
      date_label: "23 sept.",
      source: "instagram",
      meta_note: "Demande de catalogue sirops et purées de fruits",
    },
    {
      id: "l3",
      client: "The Coffee Lab Rabat",
      client_id: null,
      brand: "lvt",
      stage: "a_qualifier",
      commercial: null,
      commercial_id: null,
      valeur: 0,
      tel: "+212 6 63 77 22 11",
      date_label: "25 sept.",
      source: "manuel",
      meta_note: "Appel entrant standard — nouveau concept",
    },
    // nouveau
    {
      id: "l4",
      client: "Villa Kenzi Traiteur",
      client_id: null,
      brand: "lv",
      stage: "nouveau",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
      valeur: 18500,
      tel: "+212 6 61 22 34 09",
      date_label: "21 sept.",
      source: "manuel",
      fiche_besoin: "Café grains régulier + machine 2 groupes",
      fiche_budget: "15 000 - 20 000 DH",
      fiche_dispo: "Matinée",
      fiche_interet: "chaud",
      fiche_qualifie_par: "Meryem Sqalli",
      fiche_notes: "Projet d'ouverture prévu pour mi-octobre",
    },
    {
      id: "l5",
      client: "Artisan Café Guéliz",
      client_id: null,
      brand: "lvt",
      stage: "nouveau",
      commercial: "Meryem Alaoui",
      commercial_id: "meryem-alaoui",
      valeur: 24000,
      tel: "+212 6 64 55 12 34",
      date_label: "22 sept.",
      source: "instagram",
      fiche_besoin: "Machine Touch Pro + carte cocktails chauds",
      fiche_budget: "25 000 DH",
      fiche_interet: "chaud",
      fiche_qualifie_par: "Meryem Sqalli",
    },
    {
      id: "l6",
      client: "Café des Arts Marrakech",
      client_id: null,
      brand: "lv",
      stage: "nouveau",
      commercial: "Sara Idrissi",
      commercial_id: "sara-idrissi",
      valeur: 8200,
      tel: "+212 6 54 09 17 62",
      date_label: "20 sept.",
      source: "facebook",
      fiche_besoin: "Grains torréfiés et sirops aromatisés",
      fiche_interet: "tiede",
    },
    // contacte
    {
      id: "l7",
      client: "Riad Sultana Lounge",
      client_id: null,
      brand: "lvt",
      stage: "contacte",
      commercial: "Meryem Alaoui",
      commercial_id: "meryem-alaoui",
      valeur: 42000,
      tel: "+212 6 48 71 20 33",
      date_label: "19 sept.",
      source: "manuel",
      fiche_besoin: "Équipement complet bar lounge & formation barista",
      fiche_budget: "40 000 DH",
      fiche_interet: "chaud",
      fiche_notes: "Premier contact très positif, rdv dégustation fixé au 28 sept.",
    },
    {
      id: "l8",
      client: "Bistrot Palmier",
      client_id: null,
      brand: "lv",
      stage: "contacte",
      commercial: "Karim Benjelloun",
      commercial_id: "karim-benjelloun",
      valeur: 12500,
      tel: "+212 6 66 44 33 22",
      date_label: "18 sept.",
      source: "facebook",
      fiche_interet: "tiede",
    },
    {
      id: "l9",
      client: "Skyline Rooftop Tanger",
      client_id: null,
      brand: "lvt",
      stage: "contacte",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
      valeur: 35000,
      tel: "+212 6 67 89 01 23",
      date_label: "17 sept.",
      source: "manuel",
      fiche_besoin: "Solutions boissons signature & thés bio",
      fiche_interet: "chaud",
    },
    // qualifie
    {
      id: "l10",
      client: "Le Grand Café Anfa",
      client_id: "c1",
      brand: "lv",
      stage: "qualifie",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
      valeur: 28000,
      tel: "+212 6 12 45 67 89",
      date_label: "15 sept.",
      source: "manuel",
      fiche_besoin: "Renouvellement contrat annuel café Arabica",
      fiche_budget: "30 000 DH",
      fiche_interet: "chaud",
      fiche_notes: "Devis DV-318 transmis, en attente de signature.",
    },
    {
      id: "l11",
      client: "Hôtel Marina Bay",
      client_id: "c8",
      brand: "lv",
      stage: "qualifie",
      commercial: "Mohamed Rami",
      commercial_id: "mohamed-rami",
      valeur: 55000,
      tel: "+212 6 68 12 34 56",
      date_label: "14 sept.",
      source: "manuel",
      fiche_besoin: "Parc machines petit déjeuner + bar plage",
      fiche_budget: "60 000 DH",
      fiche_interet: "chaud",
    },
    {
      id: "l12",
      client: "L'Avenue Coffee Lounge",
      client_id: "c7",
      brand: "lvt",
      stage: "qualifie",
      commercial: "Ayoub Sabri",
      commercial_id: "ayoub-sabri",
      valeur: 31000,
      tel: "+212 6 69 98 76 54",
      date_label: "12 sept.",
      source: "instagram",
      fiche_besoin: "Machine Touch Pro 3 groupes & sirops premium",
      fiche_interet: "chaud",
    },
    {
      id: "l13",
      client: "Dar Batha Fès",
      client_id: null,
      brand: "lv",
      stage: "qualifie",
      commercial: "Omar Zerouali",
      commercial_id: "omar-zerouali",
      valeur: 16000,
      tel: "+212 6 70 11 22 33",
      date_label: "11 sept.",
      source: "manuel",
      fiche_interet: "tiede",
    },
    // converti
    {
      id: "l14",
      client: "Café Prestige",
      client_id: "c1",
      brand: "lv",
      stage: "converti",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
      valeur: 42000,
      tel: "+212 5 22 44 12 09",
      date_label: "04 sept.",
      source: "manuel",
      fiche_besoin: "Contrat d'approvisionnement initial validé",
      fiche_interet: "chaud",
      fiche_notes: "Client actif converti avec succès. Première commande CMD-1042 livrée.",
    },
    {
      id: "l15",
      client: "Hôtel Atlas Rabat",
      client_id: "c3",
      brand: "lvt",
      stage: "converti",
      commercial: "Karim Benjelloun",
      commercial_id: "karim-benjelloun",
      valeur: 37000,
      tel: "+212 5 37 70 05 44",
      date_label: "03 sept.",
      source: "manuel",
      fiche_besoin: "2 Machines Espresso Pro X200",
      fiche_interet: "chaud",
    },
    {
      id: "l16",
      client: "Coffee Shop Nomad",
      client_id: "c5",
      brand: "lvt",
      stage: "converti",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
      valeur: 29500,
      tel: "+212 5 39 33 47 21",
      date_label: "01 sept.",
      source: "instagram",
      fiche_interet: "chaud",
    },
    // perdu
    {
      id: "l17",
      client: "Snack Al Hana",
      client_id: null,
      brand: "lv",
      stage: "perdu",
      commercial: "Sara Idrissi",
      commercial_id: "sara-idrissi",
      valeur: 5000,
      tel: "+212 6 71 88 99 00",
      date_label: "28 août",
      source: "facebook",
      fiche_notes: "Budget insuffisant pour gamme premium La Varenne.",
    },
    {
      id: "l18",
      client: "Fast Food Express Rabat",
      client_id: null,
      brand: "lvt",
      stage: "perdu",
      commercial: "Karim Benjelloun",
      commercial_id: "karim-benjelloun",
      valeur: 11000,
      tel: "+212 6 72 33 44 55",
      date_label: "25 août",
      source: "manuel",
      fiche_notes: "A opté pour une machine automatique grand public.",
    },
  ];

  const { error: leadsErr } = await supabase
    .from("leads")
    .upsert(leads, { onConflict: "id" });
  if (leadsErr) throw leadsErr;

  // 4. COMMANDES (12 commandes)
  console.log("📦 Insertion des commandes...");
  const commandes = [
    {
      id: "CMD-1042",
      client: "Café Prestige",
      client_id: "c1",
      brand: "lv",
      produits: "Café Arabica Grains 20kg, Sirop Vanille x6",
      montant: 4200,
      statut: "livree",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
      date_label: "04 sept.",
    },
    {
      id: "CMD-1041",
      client: "Hôtel Atlas Rabat",
      client_id: "c3",
      brand: "lvt",
      produits: "Machine Espresso Pro X200 x2, Formation",
      montant: 37000,
      statut: "confirmee",
      commercial: "Karim Benjelloun",
      commercial_id: "karim-benjelloun",
      date_label: "03 sept.",
    },
    {
      id: "CMD-1040",
      client: "Restaurant Le Marrakchi",
      client_id: "c2",
      brand: "lv",
      produits: "Café Espresso Crema 30kg, Chocolat Poudre x12",
      montant: 6800,
      statut: "livree",
      commercial: "Sara Idrissi",
      commercial_id: "sara-idrissi",
      date_label: "08 sept.",
    },
    {
      id: "CMD-1039",
      client: "Coffee Shop Nomad",
      client_id: "c5",
      brand: "lvt",
      produits: "Moulin Automatique Touch M50 + Pack Barista",
      montant: 14500,
      statut: "livree",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
      date_label: "10 sept.",
    },
    {
      id: "CMD-1038",
      client: "Palais Bahia Traiteur",
      client_id: "c6",
      brand: "lvt",
      produits: "Gamme Sirop Cocktails x24, Purées Fruits x12",
      montant: 9200,
      statut: "confirmee",
      commercial: "Meryem Alaoui",
      commercial_id: "meryem-alaoui",
      date_label: "12 sept.",
    },
    {
      id: "CMD-1037",
      client: "L'Avenue Coffee Lounge",
      client_id: "c7",
      brand: "lvt",
      produits: "Machine Espresso Touch 3G + Filtres Brita",
      montant: 48000,
      statut: "en_attente",
      commercial: "Ayoub Sabri",
      commercial_id: "ayoub-sabri",
      date_label: "18 sept.",
    },
    {
      id: "CMD-1036",
      client: "Boulangerie Dar Chaabi",
      client_id: "c4",
      brand: "lv",
      produits: "Café Sélection Colombie 15kg, Thé Menthe x10",
      montant: 3800,
      statut: "livree",
      commercial: "Omar Zerouali",
      commercial_id: "omar-zerouali",
      date_label: "19 sept.",
    },
    {
      id: "CMD-1035",
      client: "Pâtisserie Gourmet Agadir",
      client_id: "c9",
      brand: "lv",
      produits: "Café Décaféiné Bio 10kg, Sirop Caramel x12",
      montant: 4900,
      statut: "en_attente",
      commercial: "Hanan Fassi",
      commercial_id: "hanan-fassi",
      date_label: "21 sept.",
    },
    {
      id: "CMD-1034",
      client: "Villa Blanca Restaurant",
      client_id: "c10",
      brand: "lv",
      produits: "Café Arabica Bio 40kg, Tasses Porcelaine x100",
      montant: 11200,
      statut: "confirmee",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
      date_label: "22 sept.",
    },
    {
      id: "CMD-1033",
      client: "Café de Paris",
      client_id: "c11",
      brand: "lvt",
      produits: "Accessoires Barista, Verres Double Paroi x60",
      montant: 5400,
      statut: "livree",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
      date_label: "23 sept.",
    },
    {
      id: "CMD-1032",
      client: "Riad Fès Relais",
      client_id: "c12",
      brand: "lv",
      produits: "Pack Hôtellerie Luxe: Café + Thés + Infuseurs",
      montant: 16500,
      statut: "en_attente",
      commercial: "Omar Zerouali",
      commercial_id: "omar-zerouali",
      date_label: "24 sept.",
    },
    {
      id: "CMD-1031",
      client: "Hôtel Marina Bay",
      client_id: "c8",
      brand: "lv",
      produits: "Maintenance Annuelle Machines + Pièces",
      montant: 7800,
      statut: "annulee",
      commercial: "Mohamed Rami",
      commercial_id: "mohamed-rami",
      date_label: "15 sept.",
    },
  ];

  const { error: cmdErr } = await supabase
    .from("commandes")
    .upsert(commandes, { onConflict: "id" });
  if (cmdErr) throw cmdErr;

  // 5. DEVIS (7 devis)
  console.log("📝 Insertion des devis...");
  const devis = [
    {
      id: "DV-318",
      client: "Villa Kenzi Traiteur",
      client_id: null,
      brand: "lv",
      montant: 18500,
      statut: "envoye",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
      date_label: "21 sept.",
    },
    {
      id: "DV-317",
      client: "Riad Sultana Lounge",
      client_id: null,
      brand: "lvt",
      montant: 42000,
      statut: "envoye",
      commercial: "Meryem Alaoui",
      commercial_id: "meryem-alaoui",
      date_label: "19 sept.",
    },
    {
      id: "DV-316",
      client: "Skyline Rooftop Tanger",
      client_id: null,
      brand: "lvt",
      montant: 35000,
      statut: "brouillon",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
      date_label: "17 sept.",
    },
    {
      id: "DV-315",
      client: "Hôtel Atlas Rabat",
      client_id: "c3",
      brand: "lvt",
      montant: 37000,
      statut: "accepte",
      commercial: "Karim Benjelloun",
      commercial_id: "karim-benjelloun",
      date_label: "02 sept.",
    },
    {
      id: "DV-314",
      client: "L'Avenue Coffee Lounge",
      client_id: "c7",
      brand: "lvt",
      montant: 48000,
      statut: "accepte",
      commercial: "Ayoub Sabri",
      commercial_id: "ayoub-sabri",
      date_label: "16 sept.",
    },
    {
      id: "DV-313",
      client: "Snack Al Hana",
      client_id: null,
      brand: "lv",
      montant: 9500,
      statut: "refuse",
      commercial: "Sara Idrissi",
      commercial_id: "sara-idrissi",
      date_label: "26 août",
    },
    {
      id: "DV-312",
      client: "Hôtel Marina Bay",
      client_id: "c8",
      brand: "lv",
      montant: 55000,
      statut: "envoye",
      commercial: "Mohamed Rami",
      commercial_id: "mohamed-rami",
      date_label: "14 sept.",
    },
  ];

  const { error: devisErr } = await supabase
    .from("devis")
    .upsert(devis, { onConflict: "id" });
  if (devisErr) throw devisErr;

  // 6. FACTURES (7 factures)
  console.log("💳 Insertion des factures...");
  const factures = [
    {
      id: "FA-2211",
      client: "Café Prestige",
      client_id: "c1",
      brand: "lv",
      montant: 4200,
      statut: "payee",
      commercial: "Yassine El Amrani",
      commercial_id: "yassine-el-amrani",
      date_label: "04 sept.",
      echeance: "—",
    },
    {
      id: "FA-2210",
      client: "Restaurant Le Marrakchi",
      client_id: "c2",
      brand: "lv",
      montant: 6800,
      statut: "payee",
      commercial: "Sara Idrissi",
      commercial_id: "sara-idrissi",
      date_label: "08 sept.",
      echeance: "—",
    },
    {
      id: "FA-2209",
      client: "Hôtel Atlas Rabat",
      client_id: "c3",
      brand: "lvt",
      montant: 37000,
      statut: "emise",
      commercial: "Karim Benjelloun",
      commercial_id: "karim-benjelloun",
      date_label: "03 sept.",
      echeance: "03 oct.",
    },
    {
      id: "FA-2208",
      client: "Coffee Shop Nomad",
      client_id: "c5",
      brand: "lvt",
      montant: 14500,
      statut: "payee",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
      date_label: "10 sept.",
      echeance: "—",
    },
    {
      id: "FA-2207",
      client: "Palais Bahia Traiteur",
      client_id: "c6",
      brand: "lvt",
      montant: 9200,
      statut: "emise",
      commercial: "Meryem Alaoui",
      commercial_id: "meryem-alaoui",
      date_label: "12 sept.",
      echeance: "12 oct.",
    },
    {
      id: "FA-2206",
      client: "Boulangerie Dar Chaabi",
      client_id: "c4",
      brand: "lv",
      montant: 3800,
      statut: "retard",
      commercial: "Omar Zerouali",
      commercial_id: "omar-zerouali",
      date_label: "15 août",
      echeance: "15 sept.",
    },
    {
      id: "FA-2205",
      client: "Café de Paris",
      client_id: "c11",
      brand: "lvt",
      montant: 5400,
      statut: "payee",
      commercial: "Hicham Tazi",
      commercial_id: "hicham-tazi",
      date_label: "23 sept.",
      echeance: "—",
    },
  ];

  const { error: facturesErr } = await supabase
    .from("factures")
    .upsert(factures, { onConflict: "id" });
  if (facturesErr) throw facturesErr;

  // 7. MESSAGES WHATSAPP DÉMO
  console.log("💬 Insertion des messages WhatsApp démo...");
  const sampleMessages = [
    { lead_id: "l4", from_side: "eux", text: "Bonjour, nous ouvrons un espace traiteur à Rabat et cherchons un partenaire café." },
    { lead_id: "l4", from_side: "moi", text: "Bonjour ! Félicitations pour ce projet. Quel volume mensuel estimez-vous ?" },
    { lead_id: "l4", from_side: "eux", text: "Environ 35 à 50 kg par mois avec une machine 2 groupes." },
    { lead_id: "l7", from_side: "eux", text: "Salam, pouvez-vous nous envoyer la grille tarifaire pour les thés et sirops Touch ?" },
    { lead_id: "l7", from_side: "moi", text: "Salam ! Bien sûr, je vous transmets notre catalogue complet dès aujourd'hui." },
  ];

  for (const m of sampleMessages) {
    // Vérifier si le message existe déjà pour éviter les doublons lors des re-seeds
    const { data: existing } = await supabase
      .from("lead_messages")
      .select("id")
      .eq("lead_id", m.lead_id)
      .eq("text", m.text)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("lead_messages").insert(m);
    }
  }

  console.log("\n✨ Base de données Supabase enrichie avec succès !");
  console.log(`- ${users.length} utilisateurs insérés`);
  console.log(`- ${clients.length} clients réalistes`);
  console.log(`- ${leads.length} leads Kanban (toutes étapes)`);
  console.log(`- ${commandes.length} commandes`);
  console.log(`- ${devis.length} devis`);
  console.log(`- ${factures.length} factures`);
}

main().catch((err) => {
  console.error("❌ Erreur pendant le seed :", err);
  process.exit(1);
});
