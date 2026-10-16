# Produciendo Música — escuela visual de producción musical

Una web app para aprender producción musical: **7 lecciones**, **8 laboratorios interactivos**, **86 citas** de libros y un glosario. Todo el audio se sintetiza en vivo con Web Audio: no hay samples, no hay backend, no hay build obligatorio.

## Cómo abrirla

- **Online (GitHub Pages):** en el repo, *Settings → Pages → Deploy from a branch → `main` / `/ (root)`*. La app queda en
  `https://<usuario>.github.io/<repo>/produciendo-musica/`
- **Local:** `cd produciendo-musica && python3 -m http.server` y abrí `http://localhost:8000`.
- **Un solo archivo:** `python3 build.py` genera `dist/produciendo-musica.html`, que se puede mandar por mail o abrir con doble clic.

## Qué hay adentro

| Lecciones | Labs |
|---|---|
| 1. El oficio de producir | Caja de ritmos: 16 pasos, BPM por género, swing, sidechain, exporta a **SuperCollider** (Pdef/Pbind) |
| 2. Escuchar: sala, monitores y oído | Mezcla en 3D: escenario arrastrable (paneo × profundidad), canales, chequeo mono, gain staging |
| 3. Ritmo: bombo, batería y groove | Arreglo: mapa de secciones, curva de energía, risers y build-ups automáticos |
| 4. Arreglo: del loop a la canción | Ecualizador: 5 bandas arrastrables sobre el espectro, presets sacados de los libros |
| 5. Mezcla: balance, frecuencia y espacio | Compresor: curva de transferencia, reducción de ganancia, método del % de Rogers |
| 6. Mastering: la última milla | Mastering: cadena completa, medidores, la guerra del volumen en pantalla |
| 7. La mente del productor | Entrenamiento auditivo: adiviná la frecuencia realzada |
| | Diseño de sonido: sintetizador sustractivo, presets y **SynthDef de SuperCollider** |

Cada lección trae figuras que suenan, citas en el idioma original con traducción, casos prácticos, recuadros "Profundizar" y un cuestionario. El progreso queda guardado en el navegador.

## Fuentes

- Richard James Burgess, *The Art of Music Production: The Theory and Practice*
- Tommy Swindali, *Music Production, 2020 Edition*
- Tommy Swindali, *Electronic Dance Music Production: The Advanced Guide*
- John Rogers, *Audio Mastering Secrets*
- Jason Timothy, *Music Habits: The Mental Game of Electronic Music Production*

Las citas son breves y se usan con fines educativos; los derechos pertenecen a sus autores. Donde un libro tiene errores técnicos (por ejemplo "bit rate" por *bit depth*), la app lo aclara.

## Estructura

```
produciendo-musica/
  index.html
  css/app.css
  js/audio.js     motor de audio: voces de batería, groove, sintetizador
  js/viz.js       canvas, espectro, controles
  js/content.js   libros, citas, lecciones, glosario
  js/widgets.js   figuras interactivas de las lecciones
  js/labs1.js     labs: beat, mezcla, arreglo
  js/labs2.js     labs: EQ, compresor, mastering, oído, síntesis
  js/app.js       router y páginas
  build.py        empaqueta todo en un HTML
```
