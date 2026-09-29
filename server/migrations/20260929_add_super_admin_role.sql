BEGIN;

-- The operational Admin workspace is now the Manager Admin workspace.
-- Keep one explicitly named account as the only initial Super Admin.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'COUNSELLOR', 'EMPLOYEE', 'admin', 'super_admin', 'manager', 'counsellor', 'employee'));

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_role_check
  CHECK (role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'COUNSELLOR', 'EMPLOYEE'));

UPDATE users
SET role = 'MANAGER', updated_at = CURRENT_TIMESTAMP
WHERE UPPER(role) = 'ADMIN'
  AND LOWER(email) <> 'gulshan@admin';

UPDATE users
SET role = 'SUPER_ADMIN', updated_at = CURRENT_TIMESTAMP
WHERE LOWER(email) = 'gulshan@admin';

UPDATE employees AS employee
SET role = user_account.role, updated_at = CURRENT_TIMESTAMP
FROM users AS user_account
WHERE employee.user_id = user_account.id
  AND user_account.role IN ('MANAGER', 'SUPER_ADMIN');

COMMIT;
