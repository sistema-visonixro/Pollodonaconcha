-- ============================================================================
-- PATCH: Trigger seguro — salida de inventario por venta
-- Proyecto: Pollodonaconcha
--
-- PROBLEMA CORREGIDO:
--   La versión anterior lanzaba RAISE EXCEPTION dentro del trigger cuando
--   el stock era insuficiente, haciendo rollback del propio INSERT en facturas
--   (la venta fallaba). Este patch hace que los errores de inventario se
--   registren como RAISE NOTICE sin afectar jamás la venta.
--
-- EJECUTAR EN: Supabase → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1) FUNCIÓN CENTRAL MEJORADA: permite llamadas "soft" desde el trigger
--    Agrega el parámetro p_modo_estricto (default true).
--    Cuando es false, el stock negativo se permite y se registra igualmente.
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
  p_modo_estricto    boolean  default true   -- false = permitir stock negativo (uso en trigger de venta)
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

    -- Solo bloquear si es modo estricto (uso manual/producción) Y es una SALIDA
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

    -- FIX: solo bloquear si es SALIDA (v_delta < 0), nunca para entradas
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

-- ============================================================================
-- 2) TRIGGER SEGURO: nunca bloquea una venta
--    Todos los errores de inventario se registran como NOTICE.
--    IMPORTANTE: usa p_modo_estricto = false → permite stock negativo por venta
--    (el negocio debe seguir vendiendo aunque el inventario no esté configurado)
-- ============================================================================

create or replace function public.procesar_salida_inventario_por_venta()
returns trigger
language plpgsql
as $$
declare
  v_items           jsonb;
  v_item            jsonb;
  v_producto_id     uuid;
  v_cantidad        numeric(14,4);
  v_nombre          text;
  v_tipo_pos        text;
  v_config          record;
  v_receta          record;
  v_detalle         record;
  v_consumo         numeric(14,4);
  v_ref_id          text;
begin
  -- Referencia: número de factura o id del registro
  v_ref_id := coalesce(new.factura, new.id::text);

  -- Parsear el campo productos (texto JSON → jsonb)
  begin
    v_items := new.productos::jsonb;
  exception when others then
    raise notice 'inventario_venta: no se pudo parsear productos de factura %. Error: %',
                  v_ref_id, sqlerrm;
    return new;  -- devolvemos new sin excepción; la venta se guarda igual
  end;

  if jsonb_typeof(v_items) <> 'array' then
    return new;
  end if;

  -- Procesar cada producto de la factura
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    -- Bloque por-item: cualquier error en este item se loggea y se continúa
    begin

      -- Obtener UUID del producto
      begin
        v_producto_id := coalesce(
          v_item ->> 'id',
          v_item ->> 'producto_id'
        )::uuid;
      exception when others then
        raise notice 'inventario_venta: UUID inválido en factura %, saltando item',
                      v_ref_id;
        continue;
      end;

      v_cantidad := coalesce((v_item ->> 'cantidad')::numeric, 1);
      v_nombre   := coalesce(v_item ->> 'nombre', 'Producto');

      -- Tipo de producto desde la tabla productos
      select p.tipo into v_tipo_pos
        from public.productos p
       where p.id = v_producto_id;

      -- Buscar configuración de inventario para este producto
      select *
        into v_config
        from public.inventario_config_productos cfg
       where cfg.producto_id = v_producto_id;

      -- Si no existe config, crearla automáticamente según el tipo del producto
      if not found then
        begin
          insert into public.inventario_config_productos
               (producto_id, controla_inventario, modo_consumo)
          values (
            v_producto_id,
            case
              when coalesce(v_tipo_pos,'') in ('comida','bebida','complemento')
                then true
              else false
            end,
            case
              when coalesce(v_tipo_pos,'') = 'comida'                    then 'receta'
              when coalesce(v_tipo_pos,'') in ('bebida','complemento')   then 'stock_producto'
              else 'sin_control'
            end
          )
          on conflict (producto_id) do nothing;
        exception when others then
          raise notice 'inventario_venta: no se pudo crear config para % — %',
                        v_producto_id, sqlerrm;
        end;

        -- Releer la config recién creada
        select *
          into v_config
          from public.inventario_config_productos cfg
         where cfg.producto_id = v_producto_id;
      end if;

      -- Si no controla inventario o modo sin_control → saltar
      if coalesce(v_config.controla_inventario, false) = false
         or coalesce(v_config.modo_consumo, 'sin_control') = 'sin_control'
      then
        continue;
      end if;

      -- -------------------------------------------------------
      -- MODO: stock_producto  (bebida, complemento)
      --   Descuenta directamente del stock del producto terminado
      -- -------------------------------------------------------
      if v_config.modo_consumo = 'stock_producto' then
        begin
          perform public.registrar_movimiento_inventario(
            'producto',
            v_producto_id,
            'venta',
            v_cantidad,
            0,
            'factura',
            v_ref_id,
            'Salida automática por venta: ' || v_nombre,
            new.cajero,
            new.cajero_id::text,
            false  -- p_modo_estricto = false (no bloquear venta)
          );
        exception when others then
          raise notice 'inventario_venta: error al descontar stock de producto % (factura %): %',
                        v_producto_id, v_ref_id, sqlerrm;
        end;

      -- -------------------------------------------------------
      -- MODO: receta  (comida)
      --   Descuenta insumos según la receta activa del producto
      -- -------------------------------------------------------
      elsif v_config.modo_consumo = 'receta' then

        select r.id, r.rendimiento
          into v_receta
          from public.recetas r
         where r.producto_id = v_producto_id
           and r.activo = true;

        if not found then
          raise notice 'inventario_venta: producto % vendido sin receta activa — inventario no descontado',
                        v_producto_id;
          continue;
        end if;

        -- Recorrer ingredientes de la receta
        for v_detalle in
          select rd.insumo_id,
                 rd.cantidad,
                 coalesce(i.costo_unitario, 0) as costo_unitario
            from public.recetas_detalle rd
            join public.insumos i on i.id = rd.insumo_id
           where rd.receta_id = v_receta.id
        loop
          v_consumo := (v_detalle.cantidad / greatest(v_receta.rendimiento, 1))
                       * v_cantidad;
          begin
            perform public.registrar_movimiento_inventario(
              'insumo',
              v_detalle.insumo_id,
              'venta',
              v_consumo,
              v_detalle.costo_unitario,
              'factura',
              v_ref_id,
              'Consumo automático por venta: ' || v_nombre,
              new.cajero,
              new.cajero_id::text,
              false  -- p_modo_estricto = false
            );
          exception when others then
            raise notice 'inventario_venta: error al descontar insumo % (receta %, factura %): %',
                          v_detalle.insumo_id, v_receta.id, v_ref_id, sqlerrm;
          end;
        end loop;

      end if;  -- fin de modo_consumo

    exception when others then
      -- Salvaguarda final: cualquier error inesperado por item → NOTICE, nunca falla la venta
      raise notice 'inventario_venta: error inesperado en factura % para producto %: %',
                    v_ref_id, coalesce(v_producto_id::text,'?'), sqlerrm;
    end;  -- fin bloque por-item

  end loop;

  return new;  -- la venta SIEMPRE se guarda
end;
$$;

-- Recrear el trigger (por si acaso)
drop trigger if exists trg_facturas_salida_inventario on public.facturas;
create trigger trg_facturas_salida_inventario
  after insert on public.facturas
  for each row execute function public.procesar_salida_inventario_por_venta();

-- ============================================================================
-- VERIFICACIÓN RÁPIDA
-- Después de ejecutar este script puedes comprobar que el trigger existe:
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trg_facturas_salida_inventario';
-- ============================================================================
