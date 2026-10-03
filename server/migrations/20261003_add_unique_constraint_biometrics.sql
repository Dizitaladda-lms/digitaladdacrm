-- Migration: Add UNIQUE constraint on employee_biometrics(employee_id)
-- Resolves PostgreSQL error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

DELETE FROM employee_biometrics a
USING employee_biometrics b
WHERE a.id < b.id AND a.employee_id = b.employee_id;

ALTER TABLE employee_biometrics
ADD CONSTRAINT employee_biometrics_employee_id_key UNIQUE (employee_id);
