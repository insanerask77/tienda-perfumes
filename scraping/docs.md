**Especificaciones de las Tablas en PocketBase para la Aplicación de Perfumes y Equivalencias**

---

### 1. Tabla: `perfumes`

**Descripción**: Contiene los perfumes originales obtenidos desde el endpoint `search.php` de DupesRadar.

**Campos:**

* `id`: (autogenerado) Identificador único.
* `title`: (string) Nombre del perfume original.
* `description`: (text) Descripción breve del perfume (puede incluir marca, tipo, etc.).
* `original_link`: (url) Enlace a la página original del perfume en DupesRadar.
* `thumbnail_url`: (url, opcional) Imagen en miniatura del perfume.
* `created`: (timestamp) Fecha de creación del registro.
* `updated`: (timestamp) Fecha de la última actualización del registro.

### 2. Tabla: `equivalencias`

**Descripción**: Contiene las equivalencias asociadas a un perfume original, extraídas de su página individual.

**Campos:**

* `id`: (autogenerado) Identificador único.
* `perfume_id`: (relation) Relación con el perfume original (`perfumes.id`).
* `titulo`: (string) Nombre del perfume equivalente (como aparece en la tienda).
* `tienda`: (string) Nombre de la tienda o marca de equivalencias (ej: OK Perfumes).
* `precio`: (string) Rango de precios (ej: "9,95 € – 22,95 €").
* `descripcion`: (text) Descripción de la equivalencia.
* `genero`: (string) Género al que va dirigido (ej: Masculino, Femenino, Unisex).
* `enlace_compra`: (url) Enlace directo a la tienda donde se puede adquirir la equivalencia.
* `created`: (timestamp) Fecha de creación del registro.
* `updated`: (timestamp) Fecha de la última actualización del registro.

**Relaciones:**

* Cada `equivalencia` está relacionada a un `perfume` mediante `perfume_id`.

### Recomendaciones adicionales:

* **Índices**:

  * `perfumes.original_link` (para evitar duplicados en scraping).
  * `equivalencias.enlace_compra` (para evitar insertar equivalencias repetidas).

* **Validaciones**:

  * Evitar insertar perfumes con `original_link` ya existentes.
  * Evitar insertar equivalencias si ya existe una con mismo `titulo` y `tienda` para ese `perfume_id`.


