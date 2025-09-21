CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE user_role AS ENUM ('customer', 'venue', 'admin');
CREATE TYPE voucher_status AS ENUM ('active', 'redeemed', 'expired', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE deal_status AS ENUM ('draft', 'active', 'paused', 'ended');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) UNIQUE NOT NULL,
  phone varchar(20),
  password_hash varchar(255) NOT NULL,
  first_name varchar(100),
  last_name varchar(100),
  date_of_birth date,
  role user_role DEFAULT 'customer',
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  description text,
  address text,
  city varchar(100),
  postal_code varchar(10),
  latitude decimal(10,8),
  longitude decimal(11,8),
  phone varchar(20),
  email varchar(255),
  website varchar(255),
  logo_url varchar(500),
  cover_image_url varchar(500),
  opening_hours jsonb,
  is_active boolean DEFAULT true,
  requires_age_verification boolean DEFAULT false,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venue_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  permissions jsonb DEFAULT '["manage_deals", "view_analytics", "redeem_vouchers"]',
  is_primary_contact boolean DEFAULT false,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, venue_id)
);

CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  description text,
  terms_and_conditions text,
  original_price decimal(10,2) NOT NULL,
  deal_price decimal(10,2) NOT NULL,
  savings_amount decimal(10,2) GENERATED ALWAYS AS (original_price - deal_price) STORED,
  savings_percentage integer GENERATED ALWAYS AS (
    CASE 
      WHEN original_price > 0 THEN ROUND((original_price - deal_price) * 100 / original_price)
      ELSE 0
    END
  ) STORED,
  max_vouchers integer DEFAULT 1000,
  max_per_customer integer DEFAULT 10,
  deal_image_url varchar(500),
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  status deal_status DEFAULT 'draft',
  requires_age_verification boolean DEFAULT false,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  voucher_code varchar(50) UNIQUE NOT NULL,
  qr_code_data text NOT NULL,
  status voucher_status DEFAULT 'active',
  quantity integer DEFAULT 1,
  purchase_price decimal(10,2) NOT NULL,
  redeemed_at timestamp,
  redeemed_by uuid REFERENCES users(id),
  expires_at timestamp,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  payment_method varchar(50) DEFAULT 'payfast',
  amount decimal(10,2) NOT NULL,
  currency char(3) DEFAULT 'ZAR',
  status payment_status DEFAULT 'pending',
  external_payment_id varchar(255),
  payment_data jsonb,
  voucher_ids uuid[],
  processed_at timestamp,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL,
  expires_at timestamp NOT NULL,
  is_revoked boolean DEFAULT false,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_active ON venues(is_active);
CREATE INDEX idx_venues_location ON venues USING GIST(point(longitude, latitude));

CREATE INDEX idx_venue_profiles_user ON venue_profiles(user_id);
CREATE INDEX idx_venue_profiles_venue ON venue_profiles(venue_id);

CREATE INDEX idx_deals_venue ON deals(venue_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_dates ON deals(start_date, end_date);
CREATE INDEX idx_deals_active ON deals(status, start_date, end_date) WHERE status = 'active';

CREATE INDEX idx_vouchers_user ON vouchers(user_id);
CREATE INDEX idx_vouchers_deal ON vouchers(deal_id);
CREATE INDEX idx_vouchers_venue ON vouchers(venue_id);
CREATE INDEX idx_vouchers_code ON vouchers(voucher_code);
CREATE INDEX idx_vouchers_status ON vouchers(status);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_deal ON payments(deal_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_external ON payments(external_payment_id);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_venue_profiles_updated_at BEFORE UPDATE ON venue_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();