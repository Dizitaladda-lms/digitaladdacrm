-- Migration: Add father_name, domain to admissions and create admission_payments table
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS domain VARCHAR(100) DEFAULT 'DizitalAdda';

CREATE TABLE IF NOT EXISTS admission_payments (
    id BIGSERIAL PRIMARY KEY,
    admission_id BIGINT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    receipt_no VARCHAR(100) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'ONLINE',
    transaction_id VARCHAR(150),
    proof_image_url TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fee_month VARCHAR(100),
    remarks TEXT,
    recorded_by BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_payments_admission_id ON admission_payments(admission_id);
CREATE INDEX IF NOT EXISTS idx_admission_payments_receipt_no ON admission_payments(receipt_no);
