-- Agregar columnas de dólares a la tabla cierres
-- dolares_registrado: valor en USD ingresado por el cajero (conteo físico de billetes)
-- dolares_dia: valor del sistema (suma de usd_monto de pagos tipo dolares del día)

ALTER TABLE public.cierres 
ADD COLUMN IF NOT EXISTS dolares_registrado NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.cierres 
ADD COLUMN IF NOT EXISTS dolares_dia NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN cierres.dolares_registrado IS 'Valor en USD ingresado directamente por el cajero al contar billetes';
COMMENT ON COLUMN cierres.dolares_dia IS 'Suma de usd_monto de pagos tipo dolares del día para este cajero';
