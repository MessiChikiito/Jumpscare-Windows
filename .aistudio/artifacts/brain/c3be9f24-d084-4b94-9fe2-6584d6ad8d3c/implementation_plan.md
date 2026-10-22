# Random Jumpscare para Windows 11 (Foxy Edition)

Sistema integral de sustos aleatorios configurable y seguro, inspirado en la mecánica de Foxy de Five Nights at Freddy's. Incluye un centro de control interactivo en navegador para simulación en vivo y pruebas inmediatas, junto con el generador y exportador del proyecto de escritorio nativo para Windows 11 desarrollado en Python (PySide6 + python-vlc) con empaquetador a `.exe` (PyInstaller).

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones confirmadas por el usuario:
> - **Tecnología nativa**: Python con PySide6 y `python-vlc` (alta compatibilidad de códecs multimedia sin depender de los códecs de Windows).
> - **Entrega y experiencia**: Interfaz web interactiva moderna inspirada en Windows 11 (Fluent Design) con simulador en tiempo real de pantalla completa + descarga del código fuente completo, scripts de compilación `.exe` y configuración.
> - **Contenido precargado**: Inclusión de clips y efectos sonoros de jumpscares inspirados en Foxy / FNAF (sonidos de alarma, carrera de Foxy, chirrido animatrónico, estática CRT) listos para usar, además de la capacidad de importar archivos locales (MP4, WebM, MKV, AVI, MOV).

---

## 1. Overview & Core Concept

- **Qué hace**: Permite programar jumpscares sorpresivos mientras se usa la PC o se juegan títulos como *Minecraft*, ejecutándose en segundo plano sin interrumpir los archivos del juego ni inyectar código.
- **Mecánica inspirada en Foxy (FNAF)**: Simula la tensión de Pirate Cove, donde un descuido o un intervalo sorpresa desata una carrera y jumpscare a pantalla completa con audio estruendoso, cerrándose automáticamente para devolver el control al usuario.
- **Público objetivo**: Creadores de contenido, streamers, bromas entre amigos y jugadores que buscan un desafío de terror de fondo durante sus partidas.
- **Doble propósito**:
  1. **Simulador y consola web completa**: Permite configurar, probar y experimentar los tres modos de disparo, gestionar la biblioteca y simular los jumpscares a pantalla completa en el navegador.
  2. **Paquete nativo descargable para Windows 11**: Código modular completo en Python listo para ejecutar con `python main.py` o compilar a un único `.exe` independiente mediante PyInstaller.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme (Windows 11 Fluent Dark Aesthetic)
- **Alineación con la Constitución de Diseño**:
  - Paleta 60-30-10: Fondo pizarra oscura neutra (`#0B0F17`), paneles estructurales (`#161F30`), bordes sutiles de 1px (`#233047`) y acentos carmesí de advertencia (`#EF4444`) y ámbar de tensión (`#F59E0B`).
  - Sin pseudocódigos ni comentarios en encabezados (`//`).
  - Metadatos limpios sin pastillas estáticas innecesarias (`15 min · 12 sustos · Foxy_Run.mp4`).
  - Tipografía: Titulares en **Plus Jakarta Sans**, cuerpo en **DM Sans**, y contadores/temporizadores en **JetBrains Mono** con cifras tabulares (`font-mono tabular-nums`).
- **Secciones de la interfaz principal**:
  1. **Barra superior**: Identificador de la aplicación, estado operativo (Detenido / Activo / En espera de juego / Pausado) y botón de pánico / prueba inmediata.
  2. **Panel de control del motor**: Selector de los 3 modos de activación con controles dinámicos que se muestran/ocultan según el modo.
  3. **Monitor en tiempo real**: Próxima comprobación/disparo previsto, cuenta regresiva tabular, último jumpscare ejecutado y estadísticas de sesión.
  4. **Biblioteca de vídeos**: Vista previa en miniatura, duración, control de volumen individual, interruptor de activación, carga de archivos locales y botón de eliminar con diálogo de confirmación.
  5. **Compatibilidad con videojuegos**: Selector de juego activo (`javaw.exe - Minecraft`, `RobloxPlayer.exe`, `FortniteClient.exe`, etc.) y regla de persistencia de temporizadores al salir del juego.
  6. **Ajustes de reproducción y seguridad**: Monitor de destino, volumen maestro, atajo de emergencia (Escape o tecla rápida), retardo inicial y tiempo de enfriamiento post-jumpscare.
  7. **Centro de exportación Windows 11**: Visor de código fuente de los módulos Python, descarga en un clic del paquete ZIP con `main.py`, `requirements.txt`, script `.bat` para crear el ejecutable `.exe` y manual de usuario.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Reproducción en capa superior sin bordes (Frameless Topmost)**
  - *Enfoque*: En Windows 11 nativo, PySide6 crea una ventana `Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint` en pantalla completa que se autodestruye al terminar el vídeo y reactiva la ventana anterior con `SetForegroundWindow`. En la web, se implementa mediante la API Fullscreen estándar con overlay de alta prioridad.
  - *Ventaja*: El juego no se cierra ni se minimiza; cuando el jumpscare termina, el usuario retoma el control inmediatamente.
  - *Nota documentada*: Para juegos en pantalla completa exclusiva, se aconseja modo "Ventana sin bordes" (Borderless Window) para máxima fiabilidad en Windows.

- **Decisión 2: Tres modos matemáticamente puros y aislados**
  - *Intervalo Fijo*: Temporizador exacto con minutos y segundos configurables.
  - *Intervalo Aleatorio*: Cálculo dinámico `uniform(min, max)` generado tras cada jumpscare, validando que `min < max`.
  - *Probabilidad por ciclo*: Tick recurrente (ej. cada 60s) con tirada porcentual (1-100%). Cuenta con tiempo mínimo de enfriamiento (*cooldown*) para evitar sustos en cascada.

- **Decisión 3: Arquitectura modular del proyecto nativo Python**
  - Estructura limpia desacoplada:
    - `core/config.py`: Carga y validación estricta de JSON.
    - `core/scheduler.py`: Motor de eventos y temporizadores sin bucles intensivos (`QTimer`).
    - `core/process_watcher.py`: Detección opcional mediante `psutil` de ejecutables objetivo sin inyecciones.
    - `ui/main_window.py`: Interfaz moderna con tema Fluent de PySide6.
    - `player/jumpscare_window.py`: Ventana flotante VLC sin bordes con audio independiente y cierre automático.
    - `build_exe.bat`: Script de compilación rápida con `pyinstaller --noconsole --onefile`.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        JUMPSCARE CONTROL CENTER                             │
├───────────────────────────────┬─────────────────────────────────────────────┤
│      Modos de Disparo         │             Biblioteca Multimedia           │
│  [ Fijo | Aleatorio | Prob. ] │   • FNAF Foxy Sprint (incorporado)          │
│                               │   • Freddy Hallway Scream (incorporado)     │
│  Temporizador / Scheduler     │   • Archivos locales (MP4, MKV, WebM, etc.) │
│  (QTimer / Web requestTicker) │   • Volumen y habilitación individual       │
├───────────────────────────────┴─────────────────────────────────────────────┤
│                          Condición de Activación                            │
│           ¿Juego activo? (Minecraft / Proceso seleccionado / Libre)         │
├─────────────────────────────────────────────────────────────────────────────┤
│                      Reproductor sin bordes (Topmost)                       │
│    • Pantalla completa en monitor elegido • Audio con volumen maestro       │
│    • Cierre automático en 'media_ended'   • Atajo de pánico (ESC/Shortcut)  │
├─────────────────────────────────────────────────────────────────────────────┤
│                     Exportador de Proyecto Windows 11                       │
│    • Archivos .py limpios • requirements.txt • build_exe.bat • Manual       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Datos (Configuración Persistente JSON)
```json
{
  "mode": "fixed",
  "fixed_interval_seconds": 900,
  "random_interval_min_seconds": 300,
  "random_interval_max_seconds": 1500,
  "probability_interval_seconds": 60,
  "probability_percent": 5.0,
  "min_cooldown_seconds": 180,
  "initial_delay_seconds": 60,
  "master_volume": 100,
  "panic_key": "Escape",
  "target_monitor": 0,
  "fullscreen": true,
  "max_scares_per_session": 0,
  "game_filter_enabled": true,
  "target_process_name": "javaw.exe",
  "pause_timer_when_game_closed": true,
  "library": [
    {
      "id": "foxy_sprint_1",
      "name": "Foxy Hallway Sprint & Screamer",
      "path": "builtin://foxy_sprint",
      "enabled": true,
      "volume": 100,
      "duration": 4.5
    }
  ]
}
```

---

## 5. Verification & Testing Plan

1. **Pruebas de los 3 Modos**:
   - Modo 1 (Fijo): Verificar cuenta regresiva exacta y reseteo post-activación.
   - Modo 2 (Aleatorio): Verificar generación de números entre min y max sin salidas de rango.
   - Modo 3 (Probabilidad): Probar tiradas porcentuales, tiempo de enfriamiento obligatorio y mensajes de orientación matemática.
2. **Biblioteca de vídeos**:
   - Agregar, previsualizar, silenciar, alternar activación y eliminar con confirmación.
   - Algoritmo que evita la repetición consecutiva cuando hay más de 1 vídeo activo.
3. **Reproducción y controles de emergencia**:
   - Prueba inmediata con un clic.
   - Cierre forzoso instantáneo mediante tecla ESC o botón de emergencia.
   - Silenciado global o ajuste de volumen independiente.
4. **Verificación de entrega del código nativo**:
   - Descarga de archivos zip/individuales con el código Python, `requirements.txt` y manual de compilación `.exe`.
   - Validación sintáctica y de compilación limpia de la aplicación web.
