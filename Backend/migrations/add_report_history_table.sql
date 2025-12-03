-- Migration: Add report_history table
-- Run this SQL in your PostgreSQL database

CREATE TABLE IF NOT EXISTS report_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    date_range VARCHAR(20) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    report_data TEXT,
    CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_history_company_id ON report_history(company_id);
CREATE INDEX IF NOT EXISTS idx_report_history_generated_at ON report_history(generated_at DESC);
