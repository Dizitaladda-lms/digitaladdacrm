BEGIN;

INSERT INTO departments (department_name, description, status)
VALUES
    ('Sales', 'Sales, lead follow-up, counselling and admissions conversion', TRUE),
    ('Operations', 'Daily business operations, coordination and service delivery', TRUE)
ON CONFLICT (department_name) DO NOTHING;

COMMIT;