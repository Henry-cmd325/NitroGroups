# Rediseño "Cartel de baile" en lila
Objetivo: rehacer el diseño de la UI con la skill taste-skill (dirección `name-as-monument`, semilla 1020026138) y una paleta lila/morado. Rama: claude/practical-keller-qzzaaq (fork). Entrega: ask-on-risk. Tests: vitest + eslint + tsc; gate visual con taste-skill inspect.mjs.

## Specs
- S1. Paleta lila/morado. Usuario: "no me encanta el diseño ni la paleta de colores, inicialmente nos gustaban el lila y morados".
- S2. Que no parezca genérica. Usuario: "la otra es que se ve como una pagina generica hecha con IA, te pedí que usaras skills para eso". Hay que seguir el proceso completo de taste-skill: dirección dealt, idea, copy deck, inspect.mjs con 0 FAIL, crítica escrita.
- S3. Dirección elegida por el usuario: "Cartel de baile (Recomendado)". El nombre de cada grupo enorme, como en los carteles de baile impresos en tinta fluorescente; fecha y lugar; al elegir una fecha, el cartel de la portada muestra quién está libre.
- S4. Fotos reales con licencia libre (archivos abiertos) y crédito. Usuario: "Habilito la red (Recomendado)". Pendiente de que el entorno permita commons.wikimedia.org, api.openverse.org, api.artic.edu y collectionapi.metmuseum.org.
- S5. Pantallas: portada, búsqueda, perfil de grupo, login y registro, panel del cliente, panel del músico, hilo de solicitud y onboarding. Las de trabajo (paneles, hilo, onboarding) siguen references/app-screens.md.
- S6. Sin romper el comportamiento: rutas, formularios, datos y tests actuales siguen pasando.
- S7. Corregir lo que salió en las capturas: fechas tipo "Domingo, 15 De Noviembre" → "domingo 15 de noviembre"; el pie dice "Entrar" con la sesión iniciada; el nombre artístico viene prellenado con el nombre personal.

## Tasks
| ID | Specs | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S1, S2 | inline | hecho | 77b6a0e |
| T2 | S2, S3 | inline | hecho (falta foto) | 77b6a0e |
| T3 | S2, S5, S6 | inline | parcial: tokens y perfil | 77b6a0e |
| T4 | S2, S5, S6 | inline | parcial: hoja clara y títulos | 77b6a0e |
| T5 | S4 | inline | bloqueada por la red | |
| T6 | S7 | inline | hecho | 77b6a0e |
| T7 | S2 | inline | pendiente | |

- T1: tokens, tipografía (Unbounded + Onest), DESIGN.md.
- T2: portada con el cartel y la cosa viva (la fecha).
- T3: búsqueda, perfil, login y registro.
- T4: pantallas de trabajo (paneles, hilo, onboarding).
- T5: fotos reales y créditos.
- T6: detalles de las capturas.
- T7: movimiento, inspect, crítica y capturas para el usuario.

## Log
- L1 (2026-11-03, usuario): "fijate que bo me encanta el diseño ni la paleta de colores, inicialmente nos gustaba el lila y morados, la ptra es que se ve como una pagina generica hecha con IA, te pedí que usaras skills para eso"
- L2: taste-skill repartió 3 direcciones (name-as-monument, contact-sheet, pinned-poster). El usuario eligió "Cartel de baile" (name-as-monument) y habilitar la red para las fotos. La regla de la skill que prohíbe el violeta se levanta con `--allow` porque la marca lo pide (SKILL.md, Special cases).
- L3: assets.mjs no llega a ninguna fuente: el proxy rechaza la conexión. Se avisó al usuario para que agregue los dominios.
- L4: portada con inspect.mjs: 0 FAIL salvo few-pictures (red bloqueada). vitest 66/66, tsc y eslint limpios. Commit local 77b6a0e. El push al fork lo bloqueó el clasificador de permisos ("Remote Repoint"); queda pendiente de autorización del usuario.
- L5: los verbos de "cómo se contrata" se ajustan al 86% del ancho para no encimarse con el papel picado.
- L6 (2026-11-03, usuario): "no me gusta como se ve, hay saturación visual, diseñalo desde cero, quiero algo minimalista, profesional, que se vea sobrio, elegante, tipo apple, si se puede con liquid glass, solo si logra armonía, también necesitamos buenas animaciones. Un ejemplo es https://www.corva.ai/, aunque está enfocado al Oil and gas, se ve increible el diseño y fluido, muy agradable a ala vista, sin saturar"
- L7: decisiones del usuario: fondo "Oscuro (Recomendado)"; lila "Solo acento (Recomendado)". corva.ai no se puede abrir (proxy rechaza el túnel); se pidió al usuario habilitar el dominio. Se reemplaza la dirección "Cartel de baile" por un sistema oscuro, sobrio, con vidrio solo en navegación y búsqueda.
- L8 (usuario): "usa playwright para ver la pagina que te mandé". Intento con Playwright: ERR_TUNNEL_CONNECTION_FAILED (red bloqueada).
