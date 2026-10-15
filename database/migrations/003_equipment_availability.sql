-- Migration 003: Equipment availability windows and owner blocked periods

CREATE TABLE IF NOT EXISTS equipment_availability_windows (
    id VARCHAR(64) PRIMARY KEY,
    equipment_id VARCHAR(64) NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT equipment_availability_valid_period CHECK (end_date > start_date),
    CONSTRAINT equipment_availability_unique_period UNIQUE (equipment_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_equipment_availability_equipment_period
    ON equipment_availability_windows (equipment_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS equipment_blocked_periods (
    id VARCHAR(64) PRIMARY KEY,
    equipment_id VARCHAR(64) NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT equipment_blocked_valid_period CHECK (end_date > start_date),
    CONSTRAINT equipment_blocked_unique_period UNIQUE (equipment_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_equipment_blocked_equipment_period
    ON equipment_blocked_periods (equipment_id, start_date, end_date);
