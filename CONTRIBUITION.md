# Contribution Guide

Bienvenido a la guía de contribución del proyecto. Aquí explicamos cómo realizar commits, pull requests y seguir nuestras convenciones de nombres.

---

## Tabla de Contenidos
- [Convención de commits](#convención-de-commits)
- [Cómo hacer commits](#cómo-hacer-commits)
- [Pull Requests](#pull-requests)
- [Buenas prácticas](#buenas-prácticas)

---

<details>
<summary>Convención de commits</summary>

Usamos la siguiente convención para los mensajes de commit:

<tipo>(<área>): <descripción corta>

### Tipos permitidos
- feat: Nueva funcionalidad
- fix: Corrección de errores
- ci: Actualizar configuración de CI/CD
- docs: Cambios en documentación
- style: Formato y estilo de código
- refactor: Refactorización de código
- test: Añadir o modificar pruebas

### Ejemplos
feat(auth): agregar login con Auth0  
fix(api): corregir error al actualizar usuario  
docs(CONTRIBUTION): agregar sección de contribuciones  
ci(api): actualizar configuración de CI/CD de la api
# si la tarea es general se puede omitir el área.

</details>

---

<details>
<summary>Cómo hacer commits</summary>

1. Asegúrate de que tu rama esté actualizada:

git pull origin main

2. Agrega los archivos modificados:

git add .

3. Haz el commit usando la convención:

git commit -m "feat(auth): agregar login con Google"

4. Sube tu rama:

git push origin mi-rama

</details>

---

<details>
<summary>Pull Requests</summary>

- Antes de hacer un PR, asegúrate de que tu rama esté actualizada.  
- Describe claramente los cambios y el motivo.  
- Etiqueta reviewers si es necesario.  
- Mantén la rama pequeña y coherente para facilitar la revisión.

</details>

---

<details>
<summary>Buenas prácticas</summary>

- Commits pequeños y frecuentes.  
- Mensajes claros y concisos, siguiendo la convención.  
- Revisar que todos los tests pasen antes de hacer merge.  
- No subir información sensible en commits.  
- Siempre actualizar tu rama antes de mergear para evitar conflictos.

</details>

---

> Este archivo sirve como guía oficial para contribuir al proyecto. Siguiendo estas reglas, el historial de commits será claro y mantenible.
