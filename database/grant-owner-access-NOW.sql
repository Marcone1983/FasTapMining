-- GRANT LIFETIME ACCESS TO OWNER - EXECUTE NOW IN SUPABASE SQL EDITOR

-- Update owner wallet to have lifetime access
UPDATE users
SET
  has_lifetime_access = TRUE,
  lifetime_access_granted_at = NOW()
WHERE
  UPPER(REPLACE(wallet_address, ' ', '')) = 'UQARBHBVEIKN4XSWIS30YIRNNGDMOTBBIMBDUGENTEQRPBVIYR'
  OR telegram_id IN (
    SELECT telegram_id FROM users
    WHERE UPPER(REPLACE(wallet_address, ' ', '')) = 'UQARBHBVEIKN4XSWIS30YIRNNGDMOTBBIMBDUGENTEQRPBVIYR'
  );

-- Verify owner has access
SELECT
  telegram_id,
  username,
  wallet_address,
  has_lifetime_access,
  lifetime_access_granted_at
FROM users
WHERE UPPER(REPLACE(wallet_address, ' ', '')) = 'UQARBHBVEIKN4XSWIS30YIRNNGDMOTBBIMBDUGENTEQRPBVIYR';

-- If wallet not connected yet, use this (replace YOUR_TELEGRAM_ID):
-- UPDATE users SET has_lifetime_access = TRUE, lifetime_access_granted_at = NOW() WHERE telegram_id = 'YOUR_TELEGRAM_ID';
