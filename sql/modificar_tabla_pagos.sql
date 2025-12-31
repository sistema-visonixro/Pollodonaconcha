-- Script para modificar la tabla de pagos y que funcione con el nuevo PagoModal
-- Ejecutar este script en orden

-- 1. Agregar columnas nuevas necesarias
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS banco VARCHAR(100);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS autorizador VARCHAR(100);
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS usd_monto NUMERIC(12,2);

-- 2. Modificar tipo para incluir 'dolares' si es necesario
-- Nota: Si 'tipo' es ENUM, necesitarás recrear el tipo o usar CHECK constraint
-- Si es VARCHAR, asegúrate de que tenga espacio suficiente
ALTER TABLE pagos ALTER COLUMN tipo TYPE VARCHAR(20);

-- 3. Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pagos_tipo ON pagos(tipo);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_hora ON pagos(fecha_hora);

-- 4. Agregar comentarios a las columnas para documentación
COMMENT ON COLUMN pagos.tipo IS 'Tipo de pago: efectivo, tarjeta, transferencia, dolares';
COMMENT ON COLUMN pagos.monto IS 'Monto del pago en Lempiras (HNL)';
COMMENT ON COLUMN pagos.usd_monto IS 'Monto en dólares si tipo=dolares';
COMMENT ON COLUMN pagos.banco IS 'Nombre del banco para tarjeta o transferencia';
COMMENT ON COLUMN pagos.tarjeta IS 'Últimos 4 dígitos de la tarjeta';
COMMENT ON COLUMN pagos.factura IS 'Número de factura para pagos con tarjeta';
COMMENT ON COLUMN pagos.autorizador IS 'Código de autorizador para pagos con tarjeta';
COMMENT ON COLUMN pagos.referencia IS 'Número de referencia para transferencias';
COMMENT ON COLUMN pagos.fecha_hora IS 'Fecha y hora del registro del pago';

-- 5. Verificar la estructura final
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pagos'
ORDER BY ordinal_position;
