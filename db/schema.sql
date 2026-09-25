-- ==============================================================================
-- Schema PostgreSQL / Supabase du CRM La Varenne / La Varenne Touch (Alea Food)
-- Version Production-Ready avec clés étrangères, index et rate-limiting.
-- ==============================================================================

-- 1. Table: users
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30)  NOT NULL CHECK (role IN ('admin', 'centre_appel', 'commercial')),
  brand         VARCHAR(20)  NOT NULL CHECK (brand IN ('all', 'lv', 'lvt')),
  initials      VARCHAR(10)  NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_brand ON users(brand);

-- 2. Table: user_credentials
CREATE TABLE IF NOT EXISTS user_credentials (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);

-- 3. Table: clients
CREATE TABLE IF NOT EXISTS clients (
  id            VARCHAR(20)  PRIMARY KEY,
  nom           VARCHAR(190) NOT NULL,
  ville         VARCHAR(120),
  secteur       VARCHAR(120),
  brands        VARCHAR(20)  NOT NULL, -- "lv", "lvt" ou "lv,lvt"
  contact       VARCHAR(150),
  tel           VARCHAR(40),
  commercial    VARCHAR(150),
  commercial_id VARCHAR(64)  REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(nom);
CREATE INDEX IF NOT EXISTS idx_clients_commercial ON clients(commercial);
CREATE INDEX IF NOT EXISTS idx_clients_commercial_id ON clients(commercial_id);

-- 4. Table: leads
CREATE TABLE IF NOT EXISTS leads (
  id                 VARCHAR(30)  PRIMARY KEY,
  client             VARCHAR(190) NOT NULL,
  client_id          VARCHAR(20)  REFERENCES clients(id) ON DELETE SET NULL,
  brand              VARCHAR(20)  NOT NULL CHECK (brand IN ('lv', 'lvt')),
  stage              VARCHAR(30)  NOT NULL DEFAULT 'a_qualifier' CHECK (stage IN ('a_qualifier', 'nouveau', 'contacte', 'qualifie', 'converti', 'perdu')),
  commercial         VARCHAR(150),
  commercial_id      VARCHAR(64)  REFERENCES users(id) ON DELETE SET NULL,
  valeur             INT          DEFAULT 0,
  tel                VARCHAR(40),
  date_label         VARCHAR(40),
  source             VARCHAR(30)  NOT NULL DEFAULT 'manuel' CHECK (source IN ('manuel', 'facebook', 'instagram')),
  meta_note          VARCHAR(255),
  fiche_besoin       VARCHAR(255),
  fiche_budget       VARCHAR(100),
  fiche_dispo        VARCHAR(60),
  fiche_notes        TEXT,
  fiche_interet      VARCHAR(20)  CHECK (fiche_interet IN ('chaud', 'tiede', 'froid')),
  fiche_qualifie_par VARCHAR(150),
  created_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_brand ON leads(brand);
CREATE INDEX IF NOT EXISTS idx_leads_commercial ON leads(commercial);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_commercial_id ON leads(commercial_id);

-- 5. Table: lead_messages
CREATE TABLE IF NOT EXISTS lead_messages (
  id         SERIAL PRIMARY KEY,
  lead_id    VARCHAR(30) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_side  VARCHAR(10) NOT NULL CHECK (from_side IN ('moi', 'eux')),
  text       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON lead_messages(lead_id);

-- 6. Table: commandes
CREATE TABLE IF NOT EXISTS commandes (
  id            VARCHAR(20)  PRIMARY KEY,
  client        VARCHAR(190) NOT NULL,
  client_id     VARCHAR(20)  REFERENCES clients(id) ON DELETE SET NULL,
  brand         VARCHAR(20)  NOT NULL CHECK (brand IN ('lv', 'lvt')),
  produits      VARCHAR(255),
  montant       INT          DEFAULT 0,
  statut        VARCHAR(30)  NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'livree', 'annulee')),
  commercial    VARCHAR(150),
  commercial_id VARCHAR(64)  REFERENCES users(id) ON DELETE SET NULL,
  date_label    VARCHAR(40),
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes(statut);
CREATE INDEX IF NOT EXISTS idx_commandes_brand ON commandes(brand);
CREATE INDEX IF NOT EXISTS idx_commandes_client_id ON commandes(client_id);
CREATE INDEX IF NOT EXISTS idx_commandes_commercial_id ON commandes(commercial_id);

-- 7. Table: devis
CREATE TABLE IF NOT EXISTS devis (
  id            VARCHAR(20)  PRIMARY KEY,
  client        VARCHAR(190) NOT NULL,
  client_id     VARCHAR(20)  REFERENCES clients(id) ON DELETE SET NULL,
  brand         VARCHAR(20)  NOT NULL CHECK (brand IN ('lv', 'lvt')),
  montant       INT          DEFAULT 0,
  statut        VARCHAR(30)  NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse')),
  commercial    VARCHAR(150),
  commercial_id VARCHAR(64)  REFERENCES users(id) ON DELETE SET NULL,
  date_label    VARCHAR(40),
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_devis_brand ON devis(brand);
CREATE INDEX IF NOT EXISTS idx_devis_client_id ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_commercial_id ON devis(commercial_id);

-- 8. Table: factures
CREATE TABLE IF NOT EXISTS factures (
  id            VARCHAR(20)  PRIMARY KEY,
  client        VARCHAR(190) NOT NULL,
  client_id     VARCHAR(20)  REFERENCES clients(id) ON DELETE SET NULL,
  brand         VARCHAR(20)  NOT NULL CHECK (brand IN ('lv', 'lvt')),
  montant       INT          DEFAULT 0,
  statut        VARCHAR(30)  NOT NULL DEFAULT 'emise' CHECK (statut IN ('emise', 'payee', 'retard')),
  commercial    VARCHAR(150),
  commercial_id VARCHAR(64)  REFERENCES users(id) ON DELETE SET NULL,
  date_label    VARCHAR(40),
  echeance      VARCHAR(40),
  created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_brand ON factures(brand);
CREATE INDEX IF NOT EXISTS idx_factures_client_id ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_commercial_id ON factures(commercial_id);

-- 9. Table: login_rate_limits
CREATE TABLE IF NOT EXISTS login_rate_limits (
  ip               VARCHAR(64) PRIMARY KEY,
  attempts         INT         NOT NULL DEFAULT 1,
  first_attempt_at BIGINT      NOT NULL,
  last_attempt_at  BIGINT      NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_first ON login_rate_limits(first_attempt_at);

-- 10. Trigger pour mise à jour automatique de updated_at sur leads
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
