-- Agregar columna fecha_hora a la tabla gastos para filtrar por timestamp exacto
-- Esto permite filtrar gastos desde el momento exacto de apertura de caja

ALTER TABLE gastos 
ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMPTZ;

-- Llenar fecha_hora con valores por defecto basados en la fecha existente (medianoche)
UPDATE gastos 
SET fecha_hora = (fecha || ' 00:00:00')::TIMESTAMPTZ 
WHERE fecha_hora IS NULL;

-- Hacer la columna NOT NULL después de llenar los valores
ALTER TABLE gastos 
ALTER COLUMN fecha_hora SET NOT NULL;

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_gastos_fecha_hora ON gastos(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_gastos_cajero_caja ON gastos(cajero_id, caja);
