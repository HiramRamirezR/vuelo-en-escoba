# Vuelo en Escoba

Juego 3D de navegador donde pilotas una escoba voladora a través de un paisaje nocturno generado proceduralmente. Colecciona anillos dorados, esquivá árboles y alcanza la mayor distancia posible.

## Cómo jugar

| Tecla | Acción |
|-------|--------|
| ↑ / W | Acelerar / bajar |
| ↓ / S | Frenar / subir |
| ← / A | Girar a la izquierda |
| → / D | Girar a la derecha |

## Requisitos

Un navegador moderno con soporte WebGL.

## Ejecutar localmente

El proyecto usa módulos ES nativos — **no requiere instalación ni build**.

```bash
python -m http.server 8000
# o
npx serve .
```

Luego abre `http://localhost:8000` en el navegador.

## Tecnologías

- **Three.js** (r128) — motor 3D vía CDN
- **JavaScript** (ES Modules) — sin bundlers ni transpiladores
- **CSS** — una hoja de estilos
- **HTML** — página única

## Despliegue

Configurado para Netlify. Conectá el repo o usá `npx netlify deploy`.
