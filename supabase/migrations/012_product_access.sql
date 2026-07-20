-- AvatarK Platform — Product Access
-- Real entitlement grants, replacing the static-only productAccess adapter
-- (see lib/account/adapters.ts and lib/products/registry.ts). product_id
-- is free text, matching PlatformProduct.id in lib/products/registry.ts,
-- not a foreign key -- the registry is code-owned config, not a DB table.
CREATE TABLE IF NOT EXISTS product_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS product_access_product_id_idx ON product_access(product_id);
