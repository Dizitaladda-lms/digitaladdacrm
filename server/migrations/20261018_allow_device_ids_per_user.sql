BEGIN;

ALTER TABLE user_devices
  DROP CONSTRAINT IF EXISTS user_devices_device_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_devices'::regclass
      AND conname = 'user_devices_user_id_device_id_key'
  ) THEN
    ALTER TABLE user_devices
      ADD CONSTRAINT user_devices_user_id_device_id_key
      UNIQUE (user_id, device_id);
  END IF;
END;
$$;

COMMIT;
