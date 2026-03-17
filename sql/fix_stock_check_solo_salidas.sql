-- ============================================================================
-- FIX: Validación de stock insuficiente solo en movimientos de SALIDA
-- Problema: Al registrar una ENTRADA manual, si el stock ya era negativo y
--   queda negativo (ej: -20 + 2 = -18), la función lanzaba exception
--   "Stock insuficiente" aunque sea un ingreso de stock.
-- Solución: Agregar condición "v_delta < 0" a los checks de stock mínimo,
--   de modo que solo se bloqueen movimientos de SALIDA cuando el resultado
--   sea negativo, nunca entradas.
--
-- EJECUTAR EN: Supabase → SQL Editor
-- ============================================================================

create or replace function public.registrar_movimiento_inventario(
  p_item_tipo        text,
  p_item_id          uuid,
  p_tipo_movimiento  text,
  p_cantidad         numeric,
  p_costo_unitario   numeric  default 0,
  p_referencia_tipo  text     default null,
  p_referencia_id    text     default null,
  p_nota             text     default null,
  p_cajero           text     default null,
  p_cajero_id        text     default null,
  p_modo_estricto    boolean  default true
)
returns uuid
language plpgsql
as $$
declare
  v_delta              numeric(14,4);
  v_saldo              numeric(14,4);
  v_movimiento_id      uuid := gen_random_uuid();
  v_perm_stock_neg     boolean := false;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  if p_item_tipo not in ('insumo', 'producto') then
    raise exception 'item_tipo inválido: %', p_item_tipo;
  end if;

  if p_tipo_movimiento not in (
    'entrada','salida','ajuste_positivo','ajuste_negativo',
    'venta','produccion_entrada','produccion_salida'
  ) then
    raise exception 'tipo_movimiento inválido: %', p_tipo_movimiento;
  end if;

  v_delta := case
    when p_tipo_movimiento in ('entrada','ajuste_positivo','produccion_entrada')
      then p_cantidad
    else p_cantidad * -1
  end;

  -- ----------------------------------------------------------------
  -- INSUMOS
  -- ----------------------------------------------------------------
  if p_item_tipo = 'insumo' then

    update public.insumos
       set stock_actual   = stock_actual + v_delta,
           costo_unitario = case
             when p_costo_unitario > 0 then p_costo_unitario
             else costo_unitario
           end,
           updated_at = now()
     where id = p_item_id
     returning stock_actual into v_saldo;

    if not found then
      raise exception 'El insumo % no existe', p_item_id;
    end if;

    -- FIX: solo bloquear si es modo estricto Y es una SALIDA (v_delta < 0)
    if p_modo_estricto and v_delta < 0 and v_saldo < 0 then
      raise exception 'Stock insuficiente del insumo %. Saldo resultante: %',
            p_item_id, v_saldo;
    end if;

    insert into public.movimientos_inventario (
      id, item_tipo, tipo, referencia_tipo, referencia_id, insumo_id,
      cantidad, saldo_resultante, costo_unitario, nota, cajero, cajero_id
    ) values (
      v_movimiento_id, 'insumo', p_tipo_movimiento,
      p_referencia_tipo, p_referencia_id, p_item_id,
      p_cantidad, v_saldo, coalesce(p_costo_unitario, 0),
      p_nota, p_cajero, p_cajero_id
    );

  -- ----------------------------------------------------------------
  -- PRODUCTOS
  -- ----------------------------------------------------------------
  else
    select coalesce(permite_stock_negativo, false)
      into v_perm_stock_neg
      from public.inventario_config_productos
     where producto_id = p_item_id;

    if exists (select 1 from public.stock_productos where producto_id = p_item_id) then
      update public.stock_productos
         set stock_actual  = stock_actual + v_delta,
             costo_promedio = case
               when p_costo_unitario > 0 then p_costo_unitario
               else costo_promedio
             end,
             updated_at = now()
       where producto_id = p_item_id
       returning stock_actual into v_saldo;
    else
      -- No existe fila en stock_productos todavía
      if v_delta < 0 and not v_perm_stock_neg and p_modo_estricto then
        raise exception 'Stock insuficiente del producto % (sin fila en stock_productos)',
              p_item_id;
      end if;
      insert into public.stock_productos (producto_id, stock_actual, costo_promedio)
      values (p_item_id, greatest(v_delta, 0), coalesce(p_costo_unitario, 0))
      returning stock_actual into v_saldo;
    end if;

    -- FIX: solo bloquear si es modo estricto, no permite neg, es SALIDA (v_delta < 0) y quedó negativo
    if p_modo_estricto and not v_perm_stock_neg and v_delta < 0 and v_saldo < 0 then
      raise exception 'Stock insuficiente del producto %. Saldo: %', p_item_id, v_saldo;
    end if;

    insert into public.movimientos_inventario (
      id, item_tipo, tipo, referencia_tipo, referencia_id, producto_id,
      cantidad, saldo_resultante, costo_unitario, nota, cajero, cajero_id
    ) values (
      v_movimiento_id, 'producto', p_tipo_movimiento,
      p_referencia_tipo, p_referencia_id, p_item_id,
      p_cantidad, v_saldo, coalesce(p_costo_unitario, 0),
      p_nota, p_cajero, p_cajero_id
    );
  end if;

  return v_movimiento_id;
end;
$$;
