BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN (
    'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'COUNSELLOR', 'EMPLOYEE',
    'HR', 'TL', 'TRAINER', 'INTERN',
    'admin', 'super_admin', 'manager', 'counsellor', 'employee',
    'hr', 'tl', 'trainer', 'intern'
  ));

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_role_check CHECK (role IN (
    'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'COUNSELLOR', 'EMPLOYEE',
    'HR', 'TL', 'TRAINER', 'INTERN'
  ));

COMMIT;