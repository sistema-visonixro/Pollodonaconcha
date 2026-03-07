-- =====================================================================
-- SISTEMA COMPLETO DE INVENTARIO Y PRODUCCIÓN
-- Ejecutar en Supabase SQL Editor (en este orden exacto)
-- =====================================================================

-- =====================================================================
-- 1. TABLA: insumos (materias primas / ingredientes)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.insumos (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      text        NOT NULL,
    unidad      text        NOT NULL DEFAULT 'unidad',  -- kg, litros, unidades, docena...
    stock_actual   numeric(12,3) NOT NULL DEFAULT 0,
    stock_minimo   numeric(12,3) NOT NULL DEFAULT 0,    -- nivel de alerta de stock bajo
    costo_unitario numeric(12,2) NOT NULL DEFAULT 0,    -- costo por unidad
    categoria   text        NOT NULL DEFAULT 'general', -- carnes, condimentos, bebidas, empaques...
    proveedor   text,
    activo      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.insumos                  IS 'Materias primas e ingredientes del inventario';
COMMENT ON COLUMN public.insumos.unidad           IS 'Unidad de medida: kg, g, litros, ml, unidades, docena, etc.';
COMMENT ON COLUMN public.insumos.stock_actual     IS 'Cantidad actual en almacén';
COMMENT ON COLUMN public.insumos.stock_minimo     IS 'Cantidad mínima antes de lanzar alerta';
COMMENT ON COLUMN public.insumos.costo_unitario   IS 'Costo de compra por unidad';

-- =====================================================================
-- 2. TABLA: recetas (vincula productos del POS con insumos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.recetas (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id uuid        NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    nombre      text        NOT NULL,
    descripcion text,
    porciones   integer     NOT NULL DEFAULT 1,  -- cuántas unidades produce esta receta
    activo      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(producto_id)
);

COMMENT ON TABLE  public.recetas          IS 'Recetas que vinculan productos vendibles con sus insumos';
COMMENT ON COLUMN public.recetas.porciones IS 'Número de porciones/unidades que rinde esta receta';

-- =====================================================================
-- 3. TABLA: recetas_detalle (ingredientes de cada receta)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.recetas_detalle (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id   uuid        NOT NULL REFERENCES public.recetas(id)  ON DELETE CASCADE,
    insumo_id   uuid        NOT NULL REFERENCES public.insumos(id),
    cantidad    numeric(12,4) NOT NULL,  -- cantidad por porción
    unidad      text        NOT NULL     -- refleja unidad del insumo
);

COMMENT ON TABLE  public.recetas_detalle         IS 'Ingredientes (insumos) que componen cada receta';
COMMENT ON COLUMN public.recetas_detalle.cantidad IS 'Cantidad de insumo por porción producida';

-- =====================================================================
-- 4. TABLA: stock_productos (stock de productos terminados listos para vender)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.stock_productos (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id uuid        NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    stock_actual   numeric(12,3) NOT NULL DEFAULT 0,
    stock_minimo   numeric(12,3) NOT NULL DEFAULT 0,
    activo      boolean     NOT NULL DEFAULT true,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(producto_id)
);

COMMENT ON TABLE  public.stock_productos              IS 'Stock de productos terminados listos para la venta';
COMMENT ON COLUMN public.stock_productos.stock_actual  IS 'Unidades disponibles para vender';
COMMENT ON COLUMN public.stock_productos.stock_minimo  IS 'Alerta cuando cae por debajo de este valor';

-- =====================================================================
-- 5. TABLA: ordenes_produccion (lotes de producción)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ordenes_produccion (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_orden  serial       NOT NULL,
    fecha         date         NOT NULL DEFAULT CURRENT_DATE,
    estado        text         NOT NULL DEFAULT 'borrador',
    -- estado: borrador | en_proceso | completada | cancelada
    notas         text,
    cajero_id     text,
    cajero        text,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.ordenes_produccion        IS 'Órdenes de producción que consumen insumos y generan stock de productos';
COMMENT ON COLUMN public.ordenes_produccion.estado IS 'borrador, en_proceso, completada, cancelada';

-- =====================================================================
-- 6. TABLA: ordenes_produccion_detalle
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ordenes_produccion_detalle (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id     uuid          NOT NULL REFERENCES public.ordenes_produccion(id) ON DELETE CASCADE,
    tipo         text          NOT NULL,  -- 'producido' (producto final) | 'consumido' (insumo)
    producto_id  uuid          REFERENCES public.productos(id),
    insumo_id    uuid          REFERENCES public.insumos(id),
    cantidad     numeric(12,4) NOT NULL,
    costo_unitario numeric(12,2) DEFAULT 0,
    costo_total    numeric(12,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED
);

COMMENT ON COLUMN public.ordenes_produccion_detalle.tipo IS 'producido=producto terminado generado, consumido=insumo usado';

-- =====================================================================
-- 7. TABLA: movimientos_inventario (auditoría completa de entradas/salidas)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo             text          NOT NULL,
    -- TIPOS: entrada | salida | ajuste_positivo | ajuste_negativo
    --        produccion_entrada | produccion_salida | venta
    referencia_tipo  text,
    -- compra | produccion | venta | desperdicio | devolucion | ajuste_inicial
    referencia_id    text,          -- ID factura, orden producción, etc.
    insumo_id        uuid          REFERENCES public.insumos(id),
    producto_id      uuid          REFERENCES public.productos(id),
    cantidad         numeric(12,4) NOT NULL,
    costo_unitario   numeric(12,2) NOT NULL DEFAULT 0,
    costo_total      numeric(12,2) GENERATED ALWAYS AS (ABS(cantidad) * costo_unitario) STORED,
    nota             text,
    cajero_id        text,
    cajero           text,
    created_at       timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.movimientos_inventario           IS 'Registro auditado de todos los movimientos de inventario';
COMMENT ON COLUMN public.movimientos_inventario.tipo       IS 'Tipo de movimiento: entrada, salida, ajuste_positivo, ajuste_negativo, produccion_entrada, produccion_salida, venta';
COMMENT ON COLUMN public.movimientos_inventario.referencia_id IS 'ID del documento generador (factura, orden, etc.)';

-- =====================================================================
-- 8. ÍNDICES para rendimiento
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_insumos_categoria        ON public.insumos(categoria);
CREATE INDEX IF NOT EXISTS idx_insumos_activo           ON public.insumos(activo);
CREATE INDEX IF NOT EXISTS idx_stock_productos_pid      ON public.stock_productos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo         ON public.movimientos_inventario(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha        ON public.movimientos_inventario(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_insumo       ON public.movimientos_inventario(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto     ON public.movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado           ON public.ordenes_produccion(estado);
CREATE INDEX IF NOT EXISTS idx_recetas_producto         ON public.recetas(producto_id);

-- =====================================================================
-- 9. FUNCIÓN: Actualizar updated_at automáticamente
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_insumos_updated_at
  BEFORE UPDATE ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_stock_productos_updated_at
  BEFORE UPDATE ON public.stock_productos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ordenes_updated_at
  BEFORE UPDATE ON public.ordenes_produccion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 10. FUNCIÓN: Completar orden de producción
--     Al marcar 'completada': descuenta insumos + suma stock_productos
-- =====================================================================
CREATE OR REPLACE FUNCTION public.completar_orden_produccion(p_orden_id uuid, p_cajero text, p_cajero_id text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  det RECORD;
BEGIN
  -- Procesar líneas de la orden
  FOR det IN
    SELECT * FROM public.ordenes_produccion_detalle WHERE orden_id = p_orden_id
  LOOP
    IF det.tipo = 'consumido' AND det.insumo_id IS NOT NULL THEN
      -- Descontar del stock de insumos
      UPDATE public.insumos
        SET stock_actual = stock_actual - det.cantidad
        WHERE id = det.insumo_id;

      -- Registrar movimiento de salida de insumo
      INSERT INTO public.movimientos_inventario
        (tipo, referencia_tipo, referencia_id, insumo_id, cantidad, costo_unitario, nota, cajero, cajero_id)
      VALUES
        ('produccion_salida', 'produccion', p_orden_id::text,
         det.insumo_id, det.cantidad, det.costo_unitario,
         'Consumido en orden de producción', p_cajero, p_cajero_id);

    ELSIF det.tipo = 'producido' AND det.producto_id IS NOT NULL THEN
      -- Sumar al stock de producto terminado
      INSERT INTO public.stock_productos (producto_id, stock_actual)
        VALUES (det.producto_id, det.cantidad)
        ON CONFLICT (producto_id)
        DO UPDATE SET stock_actual = public.stock_productos.stock_actual + EXCLUDED.stock_actual,
                      updated_at = now();

      -- Registrar movimiento de entrada de producto
      INSERT INTO public.movimientos_inventario
        (tipo, referencia_tipo, referencia_id, producto_id, cantidad, costo_unitario, nota, cajero, cajero_id)
      VALUES
        ('produccion_entrada', 'produccion', p_orden_id::text,
         det.producto_id, det.cantidad, det.costo_unitario,
         'Producido en orden de producción', p_cajero, p_cajero_id);
    END IF;
  END LOOP;

  -- Marcar orden como completada
  UPDATE public.ordenes_produccion
    SET estado = 'completada', updated_at = now()
    WHERE id = p_orden_id;
END;
$$;

-- =====================================================================
-- 11. FUNCIÓN + TRIGGER: Descontar stock_productos al registrar una venta
--     Dispara al insertar en public.facturas
--     Los productos vienen en la columna "productos" (JSON array)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.descontar_stock_por_venta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  items     jsonb;
  item      jsonb;
  p_id      text;
  p_qty     numeric;
  p_nombre  text;
BEGIN
  -- Intentar parsear el campo productos como JSON
  BEGIN
    items := NEW.productos::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- si no es JSON válido, ignorar
  END;

  IF jsonb_typeof(items) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    -- Intentar obtener id del producto (puede venir como 'id' o 'producto_id')
    p_id    := COALESCE(item->>'id', item->>'producto_id', NULL);
    p_qty   := COALESCE((item->>'cantidad')::numeric, 1);
    p_nombre := COALESCE(item->>'nombre', '');

    IF p_id IS NOT NULL THEN
      -- Descontar del stock de productos terminados
      UPDATE public.stock_productos
        SET stock_actual = GREATEST(0, stock_actual - p_qty),
            updated_at   = now()
        WHERE producto_id = p_id::uuid;

      -- Registrar movimiento de venta
      INSERT INTO public.movimientos_inventario
        (tipo, referencia_tipo, referencia_id, producto_id, cantidad, costo_unitario, nota, cajero, cajero_id)
      VALUES
        ('venta', 'venta', NEW.id::text,
         p_id::uuid, p_qty, 0,
         'Descuento automático por venta — ' || p_nombre,
         NEW.cajero, NEW.cajero_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Crear trigger (deshabilitado por defecto; activar cuando el JSON de productos esté listo)
CREATE TRIGGER trg_descontar_stock_venta
  AFTER INSERT ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.descontar_stock_por_venta();

-- Si aún no tienes la estructura JSON correcta en facturas.productos,
-- puedes deshabilitar el trigger temporalmente con:
--   ALTER TABLE public.facturas DISABLE TRIGGER trg_descontar_stock_venta;
-- Y habilitarlo cuando esté listo:
--   ALTER TABLE public.facturas ENABLE  TRIGGER trg_descontar_stock_venta;

-- =====================================================================
-- 12. RLS (Row Level Security) — permitir acceso anónimo/autenticado
-- =====================================================================
ALTER TABLE public.insumos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas_detalle          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_productos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_produccion       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_produccion_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario   ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas (igual que el resto del sistema)
DO $$ DECLARE t text; BEGIN
  FOR t IN VALUES
    ('insumos'), ('recetas'), ('recetas_detalle'), ('stock_productos'),
    ('ordenes_produccion'), ('ordenes_produccion_detalle'), ('movimientos_inventario')
  LOOP
    EXECUTE format(
      'CREATE POLICY "full_access_%s" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;

-- =====================================================================
-- 13. VISTA RESUMIDA: stock con alertas
-- =====================================================================
CREATE OR REPLACE VIEW public.v_stock_alertas AS
  SELECT
    i.id,
    'insumo'         AS tipo_item,
    i.nombre,
    i.categoria,
    i.unidad,
    i.stock_actual,
    i.stock_minimo,
    i.costo_unitario,
    ROUND(i.stock_actual * i.costo_unitario, 2) AS valor_total,
    CASE WHEN i.stock_actual <= i.stock_minimo THEN true ELSE false END AS alerta_stock_bajo
  FROM public.insumos i
  WHERE i.activo = true
UNION ALL
  SELECT
    sp.id,
    'producto'       AS tipo_item,
    p.nombre,
    p.tipo           AS categoria,
    'unidades'       AS unidad,
    sp.stock_actual,
    sp.stock_minimo,
    p.precio         AS costo_unitario,
    ROUND(sp.stock_actual * p.precio, 2) AS valor_total,
    CASE WHEN sp.stock_actual <= sp.stock_minimo THEN true ELSE false END AS alerta_stock_bajo
  FROM public.stock_productos sp
  JOIN public.productos p ON p.id = sp.producto_id
  WHERE sp.activo = true;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
