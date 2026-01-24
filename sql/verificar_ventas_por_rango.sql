-- Verificar ventas totales por rango de fechas
-- Ejecuta este SQL en Supabase para verificar los datos reales

-- 1. Ver el total de ventas del 1 de enero al 24 de enero de 2026
SELECT 
    COUNT(*) as total_facturas,
    SUM(total) as total_ventas,
    MIN(fecha_hora) as primera_factura,
    MAX(fecha_hora) as ultima_factura
FROM facturas
WHERE fecha_hora >= '2026-01-01 00:00:00'
  AND fecha_hora <= '2026-01-24 23:59:59';

-- 2. Ver ventas agrupadas por día en ese rango
SELECT 
    DATE(fecha_hora) as fecha,
    COUNT(*) as facturas_del_dia,
    SUM(total) as ventas_del_dia
FROM facturas
WHERE fecha_hora >= '2026-01-01 00:00:00'
  AND fecha_hora <= '2026-01-24 23:59:59'
GROUP BY DATE(fecha_hora)
ORDER BY fecha DESC;

-- 3. Ver todas las facturas del rango (para revisar si hay valores NULL o incorrectos)
SELECT 
    id,
    numero_factura,
    fecha_hora,
    total,
    cajero_id
FROM facturas
WHERE fecha_hora >= '2026-01-01 00:00:00'
  AND fecha_hora <= '2026-01-24 23:59:59'
ORDER BY fecha_hora DESC;

-- 4. Verificar si hay facturas con total NULL o 0
SELECT 
    COUNT(*) as facturas_con_problema,
    'NULL o 0' as tipo_problema
FROM facturas
WHERE fecha_hora >= '2026-01-01 00:00:00'
  AND fecha_hora <= '2026-01-24 23:59:59'
  AND (total IS NULL OR total = 0);

-- 5. Ver el tipo de dato de la columna total
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'facturas' 
  AND column_name = 'total';
