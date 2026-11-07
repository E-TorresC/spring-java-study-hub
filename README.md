
# Spring Java Study Hub

> Simulador de examen tipo test y flashcards 3D para estudiar **Spring Boot** y **Java**.
> Carga tu propio banco de preguntas en `.txt` y elige entre modo práctica, examen, repaso o flashcards con repetición espaciada.

---

## ✨ Características

| Módulo | Modos disponibles | Descripción |
|---|---|---|
| 🎯 **Examen** | Práctica · Examen · Repaso | Preguntas tipo test con corrección instantánea (práctica), al final (examen) o navegable con respuesta visible (repaso). Resultados con % y revisión paginada. |
| 🃏 **Flashcards** | Repaso · Flashcards | Tarjetas 3D con autoevaluación. Las que fallas se repiten (3 aciertos seguidos) hasta dominarlas. Atajos de teclado. |

- 🎨 **UI dark theme** inspirada en los colores de Spring Boot y Java (glassmorphism, animaciones 3D).
- 📄 **Banco de preguntas 100 % personalizable** en `.txt`.
- 📱 **Responsive**: móvil y escritorio.
- ⚡ **Cero dependencias**: HTML + CSS + JS vanilla. Sin build, sin frameworks.
- 🔀 **Opciones barajadas** en cada inicio para evitar memorizar posiciones.
- ⌨️ **Atajos de teclado** en flashcards (`Espacio`, `←`, `→`).

---

## 🚀 Cómo usar

1. Clona el repositorio:
   ```bash
   git clone https://github.com/<tu-usuario>/spring-java-study-hub.git
   ```
2. Abre `index.html` en el navegador (doble clic) o sírvelo con cualquier servidor estático:
   ```bash
   npx serve .
   # o
   python -m http.server 8000
   ```
3. Elige **Examen** o **Flashcards** en la landing.
4. Sube tu archivo `.txt` con el banco de preguntas (o usa el ejemplo que trae por defecto el modo examen).

---

## 📄 Formato del archivo `.txt`

El proyecto acepta **dos formatos**. El **formato nuevo** es el recomendado y el único compatible con **ambos** sistemas (examen + flashcards). El **formato clásico** solo lo entiende el sistema de examen.

### 🔹 Formato recomendado (nuevo)

Compatible con **examen** y **flashcards**. Cada bloque es una pregunta y los bloques se separan con una línea que contenga `---` (tres o más guiones).

```
pregunta: ¿Qué diferencia hay entre una interfaz y una clase abstracta?

respuesta teórica: Una interfaz define un contrato (solo firmas) y permite herencia múltiple; una clase abstracta puede tener estado y lógica compartida, pero solo permite herencia simple.

explicación como lo aplique en el proyecto: Definí AerolineaService, ClienteService, VentaService, etc., como interfaces y su implementación en service/impl/*Impl.java. Esto permitió que los controllers dependan del contrato y no de la implementación, facilitando tests y aplicando el principio de inversión de dependencias (SOLID).

respuesta falsa 1: Una interfaz y una clase abstracta son casi lo mismo; la diferencia principal es que la clase abstracta permite herencia múltiple y la interfaz solo herencia simple.

respuesta falsa 2: La interfaz sirve para definir atributos y constructores compartidos, mientras que la clase abstracta solo tiene métodos sin cuerpo.

respuesta falsa 3: Una clase abstracta es mejor para desacoplar porque permite instanciarse directamente, y la interfaz solo sirve para documentar.

---

pregunta: ¿Por qué usas record para los DTOs y no clases tradicionales?

respuesta teórica: record (Java 16+) es un tipo inmutable que genera automáticamente constructor, equals, hashCode y toString. Ideal para DTOs que solo transportan datos y no deben mutarse.

explicación como lo aplique en el proyecto: Todos los *Request y *Response (AerolineaRequest, VentaResponse, LoginResponse, PageResponse<T>, etc.) son record. Así los DTOs son inmutables por diseño, más legibles y con menos boilerplate.

respuesta falsa 1: Uso record porque es una clase mutable más liviana que una clase tradicional; genera setters automáticamente y permite cambiar los datos del DTO después de crearlo.

respuesta falsa 2: Uso record porque reemplaza a las entidades JPA y evita tener que anotar con @Entity; así el DTO se guarda directo en la base de datos.

respuesta falsa 3: Uso record porque permite herencia múltiple y tiene constructores telescópicos automáticos.

---
```

#### Campos del formato nuevo

| Campo | Obligatorio | Descripción |
|---|---|---|
| `pregunta:` | ✅ Sí | Enunciado de la pregunta. |
| `respuesta teórica:` | ✅ Sí | Respuesta correcta. En el examen se convierte en la opción correcta. |
| `explicación como lo aplique en el proyecto:` | ❌ Opcional | Explicación adicional. Si se omite, se usa la respuesta teórica como explicación. También se acepta simplemente `explicación:`. |
| `respuesta falsa 1:` | ⚠️ Al menos 1 | Opciones incorrectas. Cuantas más añadas, más distractores tendrá la pregunta. |
| `respuesta falsa 2:` | ❌ Opcional | Igual que la anterior. |
| `respuesta falsa 3:` | ❌ Opcional | Igual que la anterior. |
| `---` | ✅ Sí | Separador entre preguntas (una línea con 3 o más guiones). |

> 💡 **Multilínea**: puedes escribir el contenido de cualquier campo en varias líneas. Las líneas que **no** empiecen por un marcador (`pregunta:`, `respuesta teórica:`, etc.) se añaden al campo anterior.

---

### 🔹 Formato clásico (solo examen)

Compatible **únicamente** con el simulador de examen. Usa letras A–D para las opciones.

```
Pregunta: ¿Qué anotación de Spring Boot habilita la configuración automática?

A) @EnableAutoConfiguration
B) @SpringBootApplication
C) @Configuration
D) @ComponentScan

Correcta: B

Explicación: @SpringBootApplication combina @Configuration, @EnableAutoConfiguration y @ComponentScan en una sola anotación.

---
```

#### Campos del formato clásico

| Campo | Obligatorio | Descripción |
|---|---|---|
| `Pregunta:` | ✅ Sí | Enunciado de la pregunta. |
| `A)` `B)` `C)` `D)` | ✅ Sí | Opciones (solo se admiten letras de la A a la D). |
| `Correcta:` | ✅ Sí | Letra de la opción correcta (`A`, `B`, `C` o `D`). |
| `Explicación:` | ❌ Opcional | Explicación mostrada tras responder. |
| `---` | ✅ Sí | Separador entre preguntas. |

---

### 🧩 Compatibilidad por sistema

| Formato | `examen.html` | `flashcards.html` |
|---|---|---|
| **Nuevo** (`pregunta:` / `respuesta teórica:` / `respuesta falsa N:`) | ✅ Sí | ✅ Sí |
| **Clásico** (`Pregunta:` / `A)` … `D)` / `Correcta:`) | ✅ Sí | ❌ No |

> ⚠️ **Importante:** si vas a usar el mismo archivo para ambos sistemas, quédate con el **formato nuevo**. El clásico solo funciona en el examen.

---

### 📌 Reglas comunes

- **Codificación:** UTF-8 (para tildes, ñ y símbolos correctos).
- **Separador:** una línea con `---` (3 o más guiones) entre preguntas. Sin `---` el parser puede unir bloques o perder preguntas.
- **Mayúsculas / minúsculas:** los marcadores (`pregunta:`, `respuesta teórica:`, etc.) son **insensibles a mayúsculas**. `Pregunta:` y `pregunta:` funcionan igual.
- **Espacios:** los espacios en blanco al inicio/final de cada línea se recortan. Puedes indentar sin miedo.
- **Opciones barajadas:** no importa el orden en que pongas las respuestas; el sistema las mezcla en cada inicio.
- **Extensión:** debe ser `.txt` (texto plano). Archivos `.md`, `.docx` o `.pdf` no son aceptados.

---

### 📁 Ejemplo mínimo funcional

Si quieres probar rápido, crea un archivo `banco_preguntas.txt` con esto:

```
pregunta: ¿Qué es la inyección de dependencias?

respuesta teórica: Un patrón donde un objeto recibe sus dependencias desde fuera en lugar de crearlas él mismo.

explicación como lo aplique en el proyecto: Los controllers reciben los services por constructor, sin hacer new. Spring se encarga de inyectarlos.

respuesta falsa 1: Un patrón donde cada clase crea sus propias instancias manualmente con new.

respuesta falsa 2: Una forma de heredar comportamiento de una clase padre automáticamente.

respuesta falsa 3: Una anotación de JPA para mapear entidades a tablas.

---
```

---

## 📂 Estructura del proyecto

```
spring-java-study-hub/
├── index.html         ← landing de selección (Examen o Flashcards)
├── examen.html        ← simulador de examen tipo test
├── flashcards.html    ← flashcards 3D con repetición espaciada
└── README.md
```

---

## 🛠️ Stack

- **HTML5** semántico
- **CSS3** (variables, grid, flexbox, `backdrop-filter`, animaciones 3D)
- **JavaScript vanilla** (ES2020, sin dependencias externas)
- **Diseño**: dark theme basado en la paleta de Spring Boot (`#6DB33F`) y Java (`#F89820`)

---
