-- Script para corregir tipos de pagos que están en mayúsculas a minúsculas
-- Ejecutar este script una sola vez para normalizar los datos existentes

-- Actualizar Efectivo -> efectivo
UPDATE pagos 
SET tipo = 'efectivo' 
WHERE tipo = 'Efectivo';

-- Actualizar Tarjeta -> tarjeta
UPDATE pagos 
SET tipo = 'tarjeta' 
WHERE tipo = 'Tarjeta';

-- Actualizar Transferencia -> transferencia
UPDATE pagos 
SET tipo = 'transferencia' 
WHERE tipo = 'Transferencia';

-- Actualizar Dolares -> dolares
UPDATE pagos 
SET tipo = 'dolares' 
WHERE tipo = 'Dolares';

-- Verificar los tipos existentes después de la actualización
SELECT DISTINCT tipo, COUNT(*) as cantidad
FROM pagos
GROUP BY tipo
ORDER BY tipo;
