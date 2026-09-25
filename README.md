# CRM La Varenne / La Varenne Touch — Alea Food (version Next.js)

Version **Next.js (App Router)** du CRM, avec une API entièrement réécrite en routes natives Next.js (`src/app/api/**`) au-dessus de **MySQL**, prête à être déployée sur **Hostinger**. L'interface (écran de connexion, tableau de bord, kanban leads, clients, commandes/devis/factures, Équipe, messagerie) est celle déjà construite et testée pour la version précédente (Express) — reprise à l'identique ici pour ne prendre aucun risque de régression sur un logiciel déjà validé, uniquement chargée différemment (voir "Comment ce projet est organisé" plus bas).

Toutes les dépendances (`next`, `react`, `bcryptjs`, `mysql2`, `jsonwebtoken`, `dotenv`) sont en JavaScript pur — **aucune compilation native n'est nécessaire**.

---

## 1. Créer la base de données MySQL sur Hostinger

1. Dans **hPanel**, allez dans **Bases de données → MySQL**.
2. Créez une nouvelle base de données (son nom commencera probablement par un préfixe imposé par Hostinger, ex. `u123456789_crm`).
3. Créez un utilisateur MySQL, donnez-lui **tous les privilèges** sur cette base.
4. Notez : nom de la base, nom d'utilisateur, mot de passe, hôte (souvent `localhost`), port (souvent `3306`).

## 2. Créer l'application Node.js sur Hostinger

1. Dans **hPanel**, allez dans **Avancé → Node.js** (ou **Sites web → Node.js** selon votre plan).
2. Créez une nouvelle application Node.js :
   - Version de Node : **18 ou plus récente** (20 recommandé).
   - Dossier de l'application : par exemple `crm-nextjs`.
   - Fichier/commande de démarrage : `npm start` (qui exécute `next start`, voir `package.json`).
3. Uploadez le contenu de ce projet dans ce dossier (gestionnaire de fichiers hPanel, ou FTP/SSH) — **sauf** `node_modules/`, `.next/` et `.env` (ces éléments seront (re)générés, voir étapes 3 et 4).

## 3. Configurer les variables d'environnement

Reportez-vous à `.env.example` fourni dans ce projet et renseignez, avec vos vraies valeurs, soit dans l'écran de configuration Node.js d'hPanel, soit dans un fichier `.env` à la racine (copie de `.env.example`) :

- `NODE_ENV=production`
- `PORT` — laissez la valeur que Hostinger assigne automatiquement.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — les informations de la base créée à l'étape 1.
- `JWT_SECRET` — une longue chaîne aléatoire secrète servant à signer les connexions. Générez-en une avec :
  ```
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `APP_URL` — l'adresse complète de votre site une fois en ligne, ex. `https://crm.aleafood.ma` (nécessaire pour que les cookies de connexion sécurisés fonctionnent correctement).

Un seul fichier `.env` suffit : Next.js le charge automatiquement au démarrage, et le script `npm run seed` (étape 4) le lit également.

## 4. Installer les dépendances, construire et initialiser la base

Depuis le terminal SSH de Hostinger (ou l'interface "Exécuter une commande" du panneau Node.js), dans le dossier de l'application :

```bash
npm install
npm run build
npm run seed
```

- `npm run build` compile l'application Next.js pour la production (obligatoire avant `npm start` — contrairement à la version Express précédente, qui n'avait pas d'étape de build).
- `npm run seed` crée toutes les tables nécessaires et insère les comptes utilisateurs de départ (avec mots de passe déjà chiffrés en base). Elle affiche à la fin la liste des emails/mots de passe créés — **gardez cette liste en lieu sûr**, ne la republiez pas ailleurs.

⚠️ **Ne lancez `npm run seed` qu'une seule fois** (au premier déploiement). La relancer réinsère des données de démonstration et peut dupliquer des lignes.

⚠️ **Relancez `npm run build`** à chaque fois que vous mettez à jour le code de l'application (avant de redémarrer), sinon Hostinger continuera à servir l'ancienne version compilée.

## 5. Démarrer l'application

Dans hPanel, démarrez (ou redémarrez) l'application Node.js — elle exécutera `npm start` (soit `next start`) automatiquement à chaque redémarrage du serveur.

Vérifiez que ça fonctionne en visitant `https://votre-domaine.ma/api/health` : la réponse doit être `{"ok":true}`.

## 6. Activer le SSL (HTTPS)

Dans **hPanel → SSL**, activez le certificat SSL gratuit (Let's Encrypt) pour votre domaine. Indispensable : sans HTTPS, les cookies de connexion sécurisés ne fonctionneront pas correctement en production.

---

## ⚠️ Avant d'ouvrir l'accès à toute l'équipe

**Changez tous les mots de passe créés par `npm run seed`.** Ils suivent un modèle prévisible (`Prenom2026`) pratique pour les tests, mais pas assez solide pour une utilisation réelle avec des données clients.

Le compte personnel `hakeem@gmail.com` (mot de passe `123456`) est un accès administrateur supplémentaire ajouté à votre demande — changez-le en priorité.

---

## Comment ce projet est organisé (différence avec la version Express)

- **API** (`src/app/api/**`) : entièrement réécrite en routes natives **Next.js App Router** (`route.js`, une fonction `GET`/`POST`/`PUT`/`PATCH`/`DELETE` exportée par fichier) — c'est le vrai travail de portage. Chaque route reproduit exactement la même logique métier et les mêmes vérifications de sécurité que la version Express (`crm-app/server/routes/*.js`) : authentification par cookie JWT, limiteur anti-brute-force, restriction des données par rôle/marque, droits d'administration, visualisation "voir comme".
- **Base de données** (`db/schema.sql`, `db/seed.js`) : identique à la version Express, sans aucune modification (scripts Node autonomes, indépendants du framework web).
- **Interface** (`src/app/page.js`, `src/app/globals.css`, `public/app.js`) : reprend à l'identique l'interface déjà testée de la version Express (mêmes pages, mêmes styles, même logique d'affichage), servie ici via Next.js. `public/app.js` est le même fichier que dans la version précédente, sans aucune modification — il communique avec l'API via `fetch("/api/...")`, qui pointe maintenant vers les nouvelles routes Next.js.

Ce choix (interface reprise à l'identique plutôt que réécrite composant par composant en React) a été fait volontairement : il élimine tout risque de régression visuelle ou fonctionnelle sur un logiciel déjà validé, tout en livrant une vraie application Next.js — routage, serveur et API entièrement Next.js.

## Ce qui a été simplifié par rapport à la démo (claude.ai)

- **Page "Rapport mensuel"** : non incluse (hors périmètre de cette étape).
- **Tableau de bord** : version simplifiée (4 indicateurs clés + entonnoir des étapes), sans le graphique mensuel par barres ni les cartes de chiffre d'affaires par marque de la démo.
- **Messagerie type WhatsApp** : fonctionne (envoi/réception liés à chaque lead), mais sans le suivi "lu/non lu" ni les horodatages fins de la démo.
- **Leads Facebook/Instagram** : l'arrivée de leads est **simulée** (bouton "Simuler un lead Facebook/Instagram"). Une vraie connexion à l'API Meta Lead Ads nécessite une validation d'application par Meta, un nom de domaine avec HTTPS déjà en place, et un webhook sécurisé côté serveur — une étape technique à part, à faire une fois le site en ligne.

Tout le reste (connexion par compte réel, gestion des leads en kanban, fiche de qualification, clients, commandes, devis, factures, séparation des accès par rôle) est pleinement fonctionnel et a été testé — build de production, base de données locale et parcours complet (connexion, chaque rôle, Équipe/"voir comme", édition admin, kanban, qualification d'appel) vérifiés avant livraison.

## Accès par rôle et supervision admin

- **Administration** (`administration@aleafood.ma`, ou le compte personnel `hakeem@gmail.com`) : accès complet aux deux marques (La Varenne et La Varenne Touch), plus un onglet **"Équipe"** listant le centre d'appel et tous les commerciaux des deux marques. Un bouton **"Voir son espace →"** sur chaque fiche ouvre le CRM exactement comme cette personne le voit (mêmes données, mêmes restrictions), sans connaître son mot de passe. Un bandeau **"Retour Administration"** permet de revenir en un clic à la session admin.
- **Centre d'appel** (Meryem Sqalli) : voit les leads des deux marques pour les qualifier, sans accès aux clients/commandes/devis/factures ni à l'onglet Équipe.
- **Chaque commercial** : ne voit que sa propre marque et son propre portefeuille (clients/leads qui lui sont assignés) — vérifié côté serveur à chaque requête, pas seulement caché dans l'interface. Aucun commercial ni le centre d'appel ne peut accéder à l'onglet Équipe ni à la fonction "voir comme", même en modifiant l'affichage dans le navigateur.

## Sécurité mise en place

- Mots de passe chiffrés en base (bcrypt), jamais stockés en clair.
- Connexion par cookie sécurisé (httpOnly), signé (JWT), expire après 12h.
- Chaque rôle ne voit et ne modifie que ce qui lui est autorisé, **vérifié côté serveur** (pas seulement côté affichage).
- Protection anti-force-brute sur la connexion : après 8 tentatives échouées depuis la même adresse IP en 10 minutes, les connexions sont bloquées temporairement.

Pour les obligations légales (déclaration CNDP, mentions légales, politique de confidentialité...), reportez-vous au document "Feuille de route mise en production" déjà partagé séparément.

## Développement local

```bash
npm install
cp .env.example .env   # puis renseignez vos identifiants MySQL locaux
npm run seed            # une seule fois
npm run dev              # démarre sur http://localhost:3000
```
