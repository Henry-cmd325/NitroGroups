# Requisito: gestión de calendario — bloqueos, ocupación y cancelaciones

**Feature sugerida (camelCase):** `groupAvailability`  
**Dominio de negocio:** disponibilidad y agenda del grupo (ensayos, salas, servicios con ventanas horarias).  
**Versión del documento:** 1.0

---

## 1. Resumen ejecutivo

El **calendario del grupo** debe permitir, de forma fiable y trazable:

- **Bloquear** intervalos de fecha/hora en los que el grupo no ofrece disponibilidad (mantenimiento, cierre, reserva interna, etc.).
- **Consultar** de un vistazo qué tramos **ya están ocupados o bloqueados**, sin ambigüedad respecto a lo que aún está libre.
- **Anular** bloqueos o liberar tramos que dejan de aplicar — en particular cuando **un cliente cancela** y el hueco vuelve a ofrecerse, de modo que el sistema refleje el estado real y no muestre como ocupado lo que ya no lo está.

Se espera un comportamiento **coherente con operación profesional**: datos correctos, prevención de solapes indebidos donde aplique, y acciones claras para el usuario que administra el calendario.

---

## 2. Problema actual / oportunidad

Sin un único criterio para “bloquear / ocupar / liberar”:

- El equipo y los clientes ven **conflictos o información desactualizada** (huecos mostrados como libres o como ocupados de forma errónea).
- Las **cancelaciones** no impactan al calendario y generan fricción operativa o pérdida de reservas.

---

## 3. Objetivos (mensurables a nivel de producto)

1. Toda acción de **bloqueo** o **liberación** queda reflejada en el calendario de forma **consistente y auditable** (quién/cuándo, según el modelo de datos que permita el producto).
2. Un usuario con permisos puede **ver** en el calendario las franjas **ocupadas o no disponibles** (incluidos bloqueos y, si aplica, ocupación por terceros).
3. Tras la **cancelación** por parte del cliente, el tramo afectado **puede dejarse libre** (desmarcar / eliminar / actualizar el bloqueo según reglas de negocio definidas en implementación), sin intervención manual innecesaria.

---

## 4. Actores y permisos (alto nivel)

| Actor | Necesidad |
|--------|-----------|
| **Staff / administrador del grupo** | Bloquear y desbloquear fechas; ver ocupación; reaccionar a cancelaciones. |
| **Sistema (integraciones)** | (Opcional v2) Sincronizar con origen de verdad; no obligatorio en v1 del documento. |
| **Cliente** | (Fuera de este documento) Solicitar o cancelar reserva; el efecto en calendario se refleja vía el flujo de cancelación acordado. |

> **A definir con producto/seguridad:** qué roles ven solo lectura y cuáles pueden modificar bloqueos (no bloquea la redacción de este requisito; el implementador debe alinear con políticas de auth existentes).

---

## 5. Alcance funcional

### 5.1 Bloquear fechas o intervalos en el calendario

- Debe ser posible **definir** al menos un intervalo `[inicio, fin)` (o equivalente con zona horaria explícita) asociado al **grupo** correcto, marcado como no disponible o bloqueado según el modelo (disponible = falso, tipo “ocupado”, o entidad de agenda equivalente en el dominio).
- Debe quedar claro en las reglas de negocio: **solapes** (¿se permiten? ¿se fusionan? ¿se rechazan?).

### 5.2 Ver lo que ya está ocupado o bloqueado

- En la vista de calendario (o lista/agenda, según UI), el usuario ve **de forma clara** qué intervalos están **ocupados o bloqueados** frente a los que permanecen utilizables.
- La información debe ser **suficiente** para decidir: fechas, horas, y si el producto lo requiere, un identificador o motivo mínimo (p. ej. nota, tipo de evento) sin forzar un diseño de UI en este documento.

### 5.3 Desmarcar / liberar por cancelación de clientes

- Cuando un **cliente cancela** una reserva o compromiso que implicaba ocupación o bloqueo:
  - el sistema debe permitir **actualizar o eliminar** el registro correspondiente para que el **tramo vuelva a mostrarse como disponible** (o con la regla acordada: p. ej. “pendiente de limpieza” si el negocio lo requiere).
- Debe evitarse dejar en el calendario estados “fantasma” (ocupado cuando en realidad ya no aplica).

---

## 6. Reglas de negocio (prioritarias)

1. **Zona horaria:** los intervalos se interpretan con la **misma** convención de zona horaria que el resto del módulo de agenda (p. ej. `Timezone` del agregado o del grupo); evitar ambigüedad entre UTC y local.
2. **Integridad temporal:** inicio estrictamente anterior a fin; rechazar o corregir intervalos inválidos según convención del producto.
3. **Alcance por grupo:** toda operación está **anclada al identificador del grupo** correcto; no exponer bloqueos de un grupo a otro.
4. **Cancelación:** al liberar, el sistema debe dejar claro en auditoría o historial mínimo lo que exija compliance interno (si aplica v2).

---

## 7. Criterios de aceptación (verificación)

- [ ] Puedo **crear** un bloqueo/intervalo no disponible y verlo reflejado al **recargar** o actualizar el calendario.
- [ ] Puedo **listar o visualizar** todos los tramos **ocupados o bloqueados** en un rango de fechas dado, sin mezclar grupos.
- [ ] Puedo **retirar** o **actualizar** un bloqueo/ ocupación vinculada a una **cancelación de cliente** y comprobar que el hueco queda **libre o en el estado acordado**.
- [ ] Comportamiento **predecible** bajo doble clic o reintentos (idempotencia o mensajes de error claros, según diseño de API).

---

## 8. Fuera de alcance (v1 de este requisito)

- Motor de reservas completo, pasarela de pago, notificaciones push (salvo que el producto decida acoplarlos explícitamente en otro documento).
- Sincronización con calendarios externos (Google, Outlook) salvo indicación expresa.
- Reglas de precios dinámicos o descuentos (solo si el modelo ya los contempla; no se exigen aquí).

---

## 9. Supuestos y dependencias

- Existe un **modelo de dominio** coherente con “disponibilidad / ocupación / agenda” del grupo (entidades, repositorios y contexto de aplicación alineados con el módulo **Schedules** o equivalente en el repositorio).
- La autenticación y autorización se aplican **en capa de API** según el estándar del proyecto; este documento no fija códigos HTTP concretos.

---

## 10. Glosario breve

| Término | Uso en este documento |
|---------|------------------------|
| **Bloqueo** | Intervalo en el que no se ofrece disponibilidad o no se acepta reserva, por decisión del grupo. |
| **Ocupado** | Intervalo en uso o no disponible, incluidos bloqueos y compromisos que impiden ofrecer el hueco. |
| **Desmarcar / liberar** | Actualizar o eliminar el registro que mantenía el tramo no disponible. |

---

*Documento listo para usar con `npm run ai -- requirement-workshop groupAvailability --file=groupAvailability.md` y, tras el contrato B2B, con `npm run ai -- generate-feature groupAvailability`.*
