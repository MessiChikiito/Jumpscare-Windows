import JSZip from 'jszip';

export interface ProjectFile {
  path: string;
  filename: string;
  content: string;
  description: string;
}

export const PYTHON_PROJECT_FILES: ProjectFile[] = [
  {
    path: 'requirements.txt',
    filename: 'requirements.txt',
    description: 'Dependencias de Python reproducibles para Windows 11',
    content: `PySide6>=6.6.0
python-vlc>=3.0.18105
psutil>=5.9.0
keyboard>=0.13.5
`,
  },
  {
    path: 'main.py',
    filename: 'main.py',
    description: 'Punto de entrada principal de la aplicación de escritorio',
    content: `"""
Random Jumpscare para Windows 11 (Foxy Edition)
Punto de entrada principal con PySide6 y VLC.
"""
import sys
import os
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from core.config import ConfigManager
from core.scheduler import JumpscareScheduler
from ui.main_window import MainWindow

def main():
    # Habilitar soporte High DPI para pantallas modernas de Windows 11
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    app = QApplication(sys.argv)
    app.setApplicationName("Random Jumpscare Windows 11")
    app.setOrganizationName("HorrorTools")

    # Cargar configuracion persistente
    config_mgr = ConfigManager()

    # Inicializar motor de temporizadores
    scheduler = JumpscareScheduler(config_mgr)

    # Crear ventana principal
    window = MainWindow(config_mgr, scheduler)
    window.show()

    # Manejar cierre limpio
    exit_code = app.exec()
    scheduler.stop()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
`,
  },
  {
    path: 'core/config.py',
    filename: 'config.py',
    description: 'Gestor de configuración persistente JSON con validación estricta',
    content: `"""
Módulo de persistencia y validación de configuración (config.json).
"""
import json
import os
from typing import Dict, Any, List

DEFAULT_CONFIG: Dict[str, Any] = {
    "mode": "random",  # 'fixed', 'random', 'probability'
    "fixed_interval_seconds": 900,  # 15 minutos
    "random_interval_min_seconds": 300,  # 5 minutos
    "random_interval_max_seconds": 1500,  # 25 minutos
    "probability_interval_seconds": 60,  # Comprobar cada 60s
    "probability_percent": 5.0,  # 5% por comprobacion
    "min_cooldown_seconds": 180,  # Minimo 3 minutos entre sustos
    "initial_delay_seconds": 30,  # Espera antes del primer susto
    "post_scare_pause_seconds": 60,  # Pausa tras un susto
    "max_scares_per_session": 0,  # 0 = sin limite
    "master_volume": 100,  # 0 a 100
    "audio_enabled": True,
    "target_monitor": 0,  # Indice de monitor
    "fullscreen": True,
    "panic_key": "Escape",
    "game_filter_enabled": True,
    "target_process_name": "javaw.exe",  # Minecraft Java Edition
    "pause_timer_when_game_closed": True,
    "prevent_consecutive_repetition": True,
    "library": [
        {
            "id": "builtin_foxy_sprint",
            "name": "Foxy: Hallway Sprint & Screamer",
            "path": "assets/videos/foxy_sprint.mp4",
            "volume": 100,
            "enabled": True,
            "duration": 3.5
        }
    ]
}

class ConfigManager:
    def __init__(self, filename: str = "config.json"):
        self.filename = filename
        self.data = self.load()

    def load(self) -> Dict[str, Any]:
        if not os.path.exists(self.filename):
            self.save(DEFAULT_CONFIG)
            return dict(DEFAULT_CONFIG)

        try:
            with open(self.filename, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            validated = self.validate_and_merge(loaded)
            return validated
        except Exception as e:
            print(f"[ERROR] No se pudo leer {self.filename}: {e}. Restaurando valores seguros.")
            return dict(DEFAULT_CONFIG)

    def validate_and_merge(self, loaded: Dict[str, Any]) -> Dict[str, Any]:
        cfg = dict(DEFAULT_CONFIG)
        cfg.update(loaded)

        # Validaciones de integridad
        if cfg["mode"] not in ["fixed", "random", "probability"]:
            cfg["mode"] = "random"

        if cfg["fixed_interval_seconds"] < 1:
            cfg["fixed_interval_seconds"] = 1

        if cfg["random_interval_min_seconds"] < 1:
            cfg["random_interval_min_seconds"] = 1

        if cfg["random_interval_max_seconds"] <= cfg["random_interval_min_seconds"]:
            cfg["random_interval_max_seconds"] = cfg["random_interval_min_seconds"] + 60

        # Probabilidad estrictamente entre 0 y 100
        cfg["probability_percent"] = max(0.1, min(100.0, float(cfg.get("probability_percent", 5.0))))
        cfg["probability_interval_seconds"] = max(1, int(cfg.get("probability_interval_seconds", 60)))
        cfg["min_cooldown_seconds"] = max(0, int(cfg.get("min_cooldown_seconds", 0)))
        cfg["master_volume"] = max(0, min(100, int(cfg.get("master_volume", 100))))

        if not isinstance(cfg.get("library"), list):
            cfg["library"] = list(DEFAULT_CONFIG["library"])

        return cfg

    def save(self, data: Dict[str, Any] = None) -> None:
        if data is not None:
            self.data = self.validate_and_merge(data)
        try:
            with open(self.filename, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"[ERROR] Error al guardar configuracion: {e}")

    def get(self, key: str, default=None):
        return self.data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self.data[key] = value
        self.save()
`,
  },
  {
    path: 'core/scheduler.py',
    filename: 'scheduler.py',
    description: 'Motor de programación para los tres modos de disparo independientes',
    content: `"""
Motor de temporización sin bucles activos (Event-driven mediante QTimer).
Soporta los tres modos:
1. Intervalo Fijo
2. Intervalo Aleatorio (uniforme entre min y max)
3. Probabilidad por comprobación (independiente con cooldown)
"""
import random
import time
from typing import Optional, Callable
from PySide6.QtCore import QObject, QTimer, Signal
from core.config import ConfigManager
from core.process_watcher import ProcessWatcher

class JumpscareScheduler(QObject):
    # Senales Qt para comunicacion con la GUI sin bloquear hilos
    trigger_jumpscare = Signal(dict) # Emite el diccionario del video a reproducir
    countdown_updated = Signal(int) # Segundos restantes
    state_changed = Signal(str)     # 'running', 'paused', 'stopped', 'waiting_game'
    status_message = Signal(str)

    def __init__(self, config_mgr: ConfigManager):
        super().__init__()
        self.config_mgr = config_mgr
        self.is_running = False
        self.is_paused = False
        self.last_played_video_id: Optional[str] = None
        self.last_scare_timestamp: float = 0
        self.scares_count_session: int = 0

        # Temporizador principal de eventos (tick cada 1 segundo)
        self.tick_timer = QTimer(self)
        self.tick_timer.timeout.connect(self._on_tick)

        self.seconds_remaining: int = 0
        self.process_watcher = ProcessWatcher()

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.is_paused = False
        self.scares_count_session = 0

        # Retardo inicial configurado
        initial_delay = self.config_mgr.get("initial_delay_seconds", 10)
        self.seconds_remaining = initial_delay
        self.tick_timer.start(1000)
        self.state_changed.emit("running")
        self.status_message.emit(f"Sistema iniciado. Esperando retardo inicial ({initial_delay}s)...")

    def pause(self):
        if not self.is_running:
            return
        self.is_paused = not self.is_paused
        state = "paused" if self.is_paused else "running"
        self.state_changed.emit(state)
        self.status_message.emit("Sistema pausado" if self.is_paused else "Sistema reanudado")

    def stop(self):
        self.is_running = False
        self.is_paused = False
        self.tick_timer.stop()
        self.seconds_remaining = 0
        self.state_changed.emit("stopped")
        self.status_message.emit("Sistema detenido")

    def _on_tick(self):
        if not self.is_running or self.is_paused:
            return

        # 1. Comprobar restriccion de videojuego
        if self.config_mgr.get("game_filter_enabled", False):
            target_proc = self.config_mgr.get("target_process_name", "javaw.exe")
            game_active = self.process_watcher.is_process_running(target_proc)
            if not game_active:
                if self.config_mgr.get("pause_timer_when_game_closed", True):
                    self.state_changed.emit("waiting_game")
                    self.status_message.emit(f"En espera: {target_proc} no esta en ejecucion")
                    return

        # 2. Gestion de los 3 modos
        mode = self.config_mgr.get("mode", "random")

        if mode in ["fixed", "random"]:
            self.seconds_remaining -= 1
            self.countdown_updated.emit(max(0, self.seconds_remaining))
            if self.seconds_remaining <= 0:
                self._execute_scare()
                self._schedule_next(mode)

        elif mode == "probability":
            # Modo probabilidad: se decrementa el temporizador de comprobacion
            self.seconds_remaining -= 1
            self.countdown_updated.emit(max(0, self.seconds_remaining))
            if self.seconds_remaining <= 0:
                self._evaluate_probability_attempt()
                # Reiniciar periodo de comprobacion
                self.seconds_remaining = self.config_mgr.get("probability_interval_seconds", 60)

    def _evaluate_probability_attempt(self):
        cooldown = self.config_mgr.get("min_cooldown_seconds", 120)
        now = time.time()

        # Verificar enfriamiento minimo
        if now - self.last_scare_timestamp < cooldown:
            remaining_cool = int(cooldown - (now - self.last_scare_timestamp))
            self.status_message.emit(f"Comprobacion ignorada: tiempo de enfriamiento activo ({remaining_cool}s restantes)")
            return

        # Tirada aleatoria
        prob = self.config_mgr.get("probability_percent", 5.0)
        roll = random.uniform(0.0, 100.0)
        if roll <= prob:
            self.status_message.emit(f"Probabilidad cumplida (Tirada: {roll:.1f}% <= {prob}%)")
            self._execute_scare()
        else:
            self.status_message.emit(f"Sin activacion (Tirada: {roll:.1f}% > {prob}%). Siguiente comprobacion en curso.")

    def _schedule_next(self, mode: str):
        if mode == "fixed":
            interval = self.config_mgr.get("fixed_interval_seconds", 900)
            self.seconds_remaining = interval
        elif mode == "random":
            min_sec = self.config_mgr.get("random_interval_min_seconds", 300)
            max_sec = self.config_mgr.get("random_interval_max_seconds", 1500)
            self.seconds_remaining = random.randint(min_sec, max_sec)

    def _execute_scare(self):
        # Comprobar limite de sustos por sesion
        limit = self.config_mgr.get("max_scares_per_session", 0)
        if limit > 0 and self.scares_count_session >= limit:
            self.status_message.emit(f"Limite maximo de sesion alcanzado ({limit} sustos). Deteniendo.")
            self.stop()
            return

        video = self.select_next_video()
        if not video:
            self.status_message.emit("Advertencia: No hay videos habilitados en la biblioteca.")
            return

        self.last_played_video_id = video.get("id")
        self.last_scare_timestamp = time.time()
        self.scares_count_session += 1

        self.trigger_jumpscare.emit(video)

    def select_next_video(self) -> Optional[dict]:
        library = self.config_mgr.get("library", [])
        enabled_videos = [v for v in library if v.get("enabled", True)]

        if not enabled_videos:
            return None

        prevent_repetition = self.config_mgr.get("prevent_consecutive_repetition", True)
        if prevent_repetition and len(enabled_videos) > 1 and self.last_played_video_id:
            eligible = [v for v in enabled_videos if v.get("id") != self.last_played_video_id]
            if eligible:
                return random.choice(eligible)

        return random.choice(enabled_videos)
`,
  },
  {
    path: 'core/process_watcher.py',
    filename: 'process_watcher.py',
    description: 'Detección no invasiva de procesos de videojuegos (Minecraft, etc.)',
    content: `"""
Detector de aplicaciones en ejecucion mediante psutil.
No inyecta codigo ni altera la memoria ni los archivos de los juegos.
Totalmente seguro y compatible con sistemas antitrampas.
"""
import psutil
import time
from typing import Set

class ProcessWatcher:
    def __init__(self, cache_ttl: float = 2.0):
        self.cache_ttl = cache_ttl
        self.last_check_time: float = 0
        self.running_processes_cache: Set[str] = set()

    def _refresh_cache(self):
        now = time.time()
        if now - self.last_check_time < self.cache_ttl:
            return

        current_set = set()
        for p in psutil.process_iter(['name']):
            try:
                name = p.info['name']
                if name:
                    current_set.add(name.lower())
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        self.running_processes_cache = current_set
        self.last_check_time = now

    def is_process_running(self, process_name: str) -> bool:
        """
        Comprueba si un proceso especifico (ej: 'javaw.exe', 'Minecraft.exe') esta activo.
        """
        self._refresh_cache()
        target = process_name.strip().lower()
        return target in self.running_processes_cache

    def get_running_process_list(self) -> list:
        """
        Devuelve lista ordenada de procesos activos para autocompletar en la GUI.
        """
        self._refresh_cache()
        return sorted(list(self.running_processes_cache))
`,
  },
  {
    path: 'player/jumpscare_window.py',
    filename: 'jumpscare_window.py',
    description: 'Reproductor VLC sin bordes a pantalla completa (Topmost) con cierre de emergencia',
    content: `"""
Ventana de reproduccion multimedia de jumpscares.
Utiliza libVLC via python-vlc para decodificar MP4, MKV, AVI, WebM y MOV.
Muestra una ventana sin bordes por encima de todo (Topmost) y devuelve el control al usuario al terminar.
"""
import os
import sys
from PySide6.QtWidgets import QWidget
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QKeyEvent, QGuiApplication

try:
    import vlc
except ImportError:
    vlc = None

if sys.platform == "win32":
    import ctypes
    user32 = ctypes.windll.user32

class JumpscareWindow(QWidget):
    def __init__(self, video_data: dict, master_volume: int = 100, monitor_index: int = 0, fullscreen: bool = True):
        super().__init__()
        self.video_data = video_data
        self.master_volume = master_volume

        # Guardar la ventana activa previa para devolver el foco
        self.previous_hwnd = None
        if sys.platform == "win32":
            self.previous_hwnd = user32.GetForegroundWindow()

        # Configurar flags de ventana: sin bordes, siempre visible arriba (Topmost), sin icono en barra
        self.setWindowFlags(
            Qt.WindowStaysOnTopHint |
            Qt.FramelessWindowHint |
            Qt.Tool
        )
        self.setAttribute(Qt.WA_DeleteOnClose, True)
        self.setStyleSheet("background-color: black;")

        # Posicionamiento en el monitor seleccionado
        screens = QGuiApplication.screens()
        target_screen = screens[0]
        if 0 <= monitor_index < len(screens):
            target_screen = screens[monitor_index]

        geo = target_screen.geometry()
        self.setGeometry(geo)
        if fullscreen:
            self.showFullScreen()
        else:
            self.show()

        # Inicializar VLC MediaPlayer
        self.vlc_instance = None
        self.player = None
        self._init_vlc_player()

        # Temporizador de seguridad para cierre forzoso si libVLC no emite fin
        duration_sec = float(self.video_data.get("duration", 4.0)) + 0.8
        self.safety_timer = QTimer(self)
        self.safety_timer.setSingleShot(True)
        self.safety_timer.timeout.connect(self.close_and_restore)
        self.safety_timer.start(int(duration_sec * 1000))

    def _init_vlc_player(self):
        video_path = self.video_data.get("path", "")
        if not os.path.exists(video_path):
            print(f"[ERROR] Archivo no encontrado: {video_path}")
            QTimer.singleShot(500, self.close_and_restore)
            return

        if vlc is None:
            print("[ERROR] libVLC no esta instalado o no se encuentra el DLL.")
            QTimer.singleShot(1000, self.close_and_restore)
            return

        # Opciones de bajo retardo y aceleracion
        self.vlc_instance = vlc.Instance("--no-xlib --quiet --network-caching=0")
        self.player = self.vlc_instance.media_player_new()

        media = self.vlc_instance.media_new(os.path.abspath(video_path))
        self.player.set_media(media)

        # Vincular reproduccion con el identificador HWND de Windows
        if sys.platform == "win32":
            self.player.set_hwnd(int(self.winId()))
        elif sys.platform.startswith("linux"):
            self.player.set_xwindow(int(self.winId()))

        # Calcular volumen efectivo (Volumen Maestro * Volumen del Video)
        video_vol = float(self.video_data.get("volume", 100))
        effective_vol = int((self.master_volume / 100.0) * video_vol)
        self.player.audio_set_volume(max(0, min(100, effective_vol)))

        # Ajustar velocidad de reproduccion (acelerar o ralentizar)
        speed = float(self.video_data.get("speed", 1.0))
        self.player.set_rate(speed)

        # Iniciar reproduccion
        self.player.play()

    def keyPressEvent(self, event: QKeyEvent):
        # Cierre de emergencia instantaneo con ESCAPE o espacio
        if event.key() in (Qt.Key_Escape, Qt.Key_Space, Qt.Key_Q):
            self.close_and_restore()
        super().keyPressEvent(event)

    def close_and_restore(self):
        if self.player:
            try:
                self.player.stop()
                self.player.release()
            except Exception:
                pass

        self.close()

        # Restaurar foco a la aplicacion/juego previo
        if sys.platform == "win32" and self.previous_hwnd:
            try:
                user32.SetForegroundWindow(self.previous_hwnd)
            except Exception:
                pass
`,
  },
  {
    path: 'ui/main_window.py',
    filename: 'main_window.py',
    description: 'Interfaz gráfica moderna Windows 11 Fluent Dark con gestión completa',
    content: `"""
Interfaz de usuario de Windows 11 en PySide6.
Diseño oscuro, selectores intuitivos para los 3 modos, biblioteca de vídeos y prueba en tiempo real.
"""
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QRadioButton, QButtonGroup, QSpinBox, QDoubleSpinBox,
    QTableWidget, QTableWidgetItem, QHeaderView, QFileDialog, QMessageBox,
    QCheckBox, QComboBox, QGroupBox, QSlider
)
from PySide6.QtCore import Qt, Slot
from PySide6.QtGui import QIcon, QFont, QGuiApplication
from core.config import ConfigManager
from core.scheduler import JumpscareScheduler
from player.jumpscare_window import JumpscareWindow

STYLESHEET = """
QMainWindow {
    background-color: #0b0f17;
    color: #f1f5f9;
}
QGroupBox {
    background-color: #161f30;
    border: 1px solid #233047;
    border-radius: 8px;
    margin-top: 14px;
    padding-top: 12px;
    font-weight: bold;
    color: #e2e8f0;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 14px;
    padding: 0 6px;
    color: #94a3b8;
}
QPushButton {
    background-color: #1e293b;
    border: 1px solid #334155;
    color: #f8fafc;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
}
QPushButton:hover {
    background-color: #334155;
    border-color: #475569;
}
QPushButton#primaryBtn {
    background-color: #dc2626;
    border: 1px solid #ef4444;
}
QPushButton#primaryBtn:hover {
    background-color: #b91c1c;
}
QPushButton#testBtn {
    background-color: #7c2d12;
    border: 1px solid #ea580c;
}
QTableWidget {
    background-color: #0f172a;
    border: 1px solid #1e293b;
    gridline-color: #1e293b;
    color: #f1f5f9;
    border-radius: 6px;
}
QHeaderView::section {
    background-color: #1e293b;
    color: #94a3b8;
    padding: 6px;
    border: 1px solid #0f172a;
}
QSpinBox, QDoubleSpinBox, QComboBox {
    background-color: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #f8fafc;
    padding: 4px 8px;
}
QLabel#countdownLabel {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 26px;
    color: #f87171;
    font-weight: bold;
}
"""

class MainWindow(QMainWindow):
    def __init__(self, config_mgr: ConfigManager, scheduler: JumpscareScheduler):
        super().__init__()
        self.config_mgr = config_mgr
        self.scheduler = scheduler

        self.setWindowTitle("Random Jumpscare Windows 11 (Foxy Edition)")
        self.resize(920, 720)
        self.setStyleSheet(STYLESHEET)

        self.active_jumpscare_win = None
        self._build_ui()
        self._connect_signals()
        self._load_config_to_ui()

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(18, 18, 18, 18)
        root_layout.setSpacing(14)

        # 1. Cabecera y Estado
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        app_title = QLabel("RANDOM JUMPSCARE FOR WINDOWS 11")
        app_title.setFont(QFont("Segoe UI", 14, QFont.Bold))
        subtitle = QLabel("Inspirado en la mecanica de Foxy (Five Nights at Freddy's)")
        subtitle.setStyleSheet("color: #64748b; font-size: 11px;")
        title_box.addWidget(app_title)
        title_box.addWidget(subtitle)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.test_btn = QPushButton("PROBAR SUSTO AHORA")
        self.test_btn.setObjectName("testBtn")
        self.test_btn.clicked.connect(self._on_test_scare)
        header_layout.addWidget(self.test_btn)

        self.start_btn = QPushButton("INICIAR")
        self.start_btn.setObjectName("primaryBtn")
        self.start_btn.clicked.connect(self._on_toggle_start)
        header_layout.addWidget(self.start_btn)

        root_layout.addLayout(header_layout)

        # 2. Panel de Estado en Tiempo Real
        status_box = QGroupBox("Estado del Sistema y Temporizador")
        s_layout = QHBoxLayout(status_box)

        self.state_label = QLabel("DETENIDO")
        self.state_label.setStyleSheet("color: #94a3b8; font-weight: bold;")
        s_layout.addWidget(QLabel("Estado:"))
        s_layout.addWidget(self.state_label)

        s_layout.addSpacing(20)
        s_layout.addWidget(QLabel("Cuenta regresiva:"))
        self.countdown_label = QLabel("00:00")
        self.countdown_label.setObjectName("countdownLabel")
        s_layout.addWidget(self.countdown_label)

        s_layout.addStretch()
        self.status_msg_label = QLabel("Listo para iniciar.")
        self.status_msg_label.setStyleSheet("color: #cbd5e1; font-style: italic;")
        s_layout.addWidget(self.status_msg_label)

        root_layout.addWidget(status_box)

        # 3. Selector de Modos de Activacion
        mode_box = QGroupBox("1. Modos de Activacion")
        mode_layout = QVBoxLayout(mode_box)

        # Botones de seleccion
        mode_sel_layout = QHBoxLayout()
        self.mode_group = QButtonGroup(self)
        self.radio_fixed = QRadioButton("Modo 1: Intervalo Fijo")
        self.radio_random = QRadioButton("Modo 2: Intervalo Aleatorio")
        self.radio_prob = QRadioButton("Modo 3: Probabilidad por Comprobacion")
        self.mode_group.addButton(self.radio_fixed, 1)
        self.mode_group.addButton(self.radio_random, 2)
        self.mode_group.addButton(self.radio_prob, 3)

        mode_sel_layout.addWidget(self.radio_fixed)
        mode_sel_layout.addWidget(self.radio_random)
        mode_sel_layout.addWidget(self.radio_prob)
        mode_sel_layout.addStretch()
        mode_layout.addLayout(mode_sel_layout)

        # Sub-paneles dinamicos
        # Panel Fijo
        self.panel_fixed = QWidget()
        pf_layout = QHBoxLayout(self.panel_fixed)
        pf_layout.addWidget(QLabel("Intervalo cada:"))
        self.spin_fixed_min = QSpinBox()
        self.spin_fixed_min.setRange(0, 120)
        self.spin_fixed_min.setSuffix(" min")
        self.spin_fixed_sec = QSpinBox()
        self.spin_fixed_sec.setRange(0, 59)
        self.spin_fixed_sec.setSuffix(" seg")
        pf_layout.addWidget(self.spin_fixed_min)
        pf_layout.addWidget(self.spin_fixed_sec)
        pf_layout.addStretch()
        mode_layout.addWidget(self.panel_fixed)

        # Panel Aleatorio
        self.panel_random = QWidget()
        pr_layout = QHBoxLayout(self.panel_random)
        pr_layout.addWidget(QLabel("Tiempo Minimo:"))
        self.spin_rand_min = QSpinBox()
        self.spin_rand_min.setRange(1, 120)
        self.spin_rand_min.setSuffix(" min")
        pr_layout.addWidget(self.spin_rand_min)

        pr_layout.addSpacing(14)
        pr_layout.addWidget(QLabel("Tiempo Maximo:"))
        self.spin_rand_max = QSpinBox()
        self.spin_rand_max.setRange(2, 300)
        self.spin_rand_max.setSuffix(" min")
        pr_layout.addWidget(self.spin_rand_max)
        pr_layout.addStretch()
        mode_layout.addWidget(self.panel_random)

        # Panel Probabilidad
        self.panel_prob = QWidget()
        pp_layout = QVBoxLayout(self.panel_prob)
        pp_row = QHBoxLayout()
        pp_row.addWidget(QLabel("Comprobar cada:"))
        self.spin_prob_freq = QSpinBox()
        self.spin_prob_freq.setRange(5, 600)
        self.spin_prob_freq.setSuffix(" seg")
        pp_row.addWidget(self.spin_prob_freq)

        pp_row.addSpacing(12)
        pp_row.addWidget(QLabel("Probabilidad:"))
        self.spin_prob_percent = QDoubleSpinBox()
        self.spin_prob_percent.setRange(0.1, 100.0)
        self.spin_prob_percent.setSingleStep(0.5)
        self.spin_prob_percent.setSuffix(" %")
        pp_row.addWidget(self.spin_prob_percent)

        pp_row.addSpacing(12)
        pp_row.addWidget(QLabel("Espera minima entre sustos:"))
        self.spin_prob_cooldown = QSpinBox()
        self.spin_prob_cooldown.setRange(10, 1800)
        self.spin_prob_cooldown.setSuffix(" seg")
        pp_row.addWidget(self.spin_prob_cooldown)
        pp_row.addStretch()
        pp_layout.addLayout(pp_row)

        prob_notice = QLabel("Nota: Un 5% por comprobacion no garantiza un susto en 20 min; cada comprobacion es un intento independiente.")
        prob_notice.setStyleSheet("color: #94a3b8; font-size: 11px;")
        pp_layout.addWidget(prob_notice)
        mode_layout.addWidget(self.panel_prob)

        self.mode_group.idClicked.connect(self._on_mode_changed)
        root_layout.addWidget(mode_box)

        # 4. Biblioteca de Videos
        lib_box = QGroupBox("2. Biblioteca de Videos (MP4, MKV, AVI, WebM, MOV)")
        lib_layout = QVBoxLayout(lib_box)

        self.table_videos = QTableWidget(0, 4)
        self.table_videos.setHorizontalHeaderLabels(["Nombre", "Ruta de Archivo", "Volumen", "Habilitado"])
        self.table_videos.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self.table_videos.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        lib_layout.addWidget(self.table_videos)

        lib_btns_layout = QHBoxLayout()
        self.btn_add_video = QPushButton("Importar Video...")
        self.btn_add_video.clicked.connect(self._on_add_video)
        self.btn_remove_video = QPushButton("Eliminar Seleccionado")
        self.btn_remove_video.clicked.connect(self._on_remove_video)
        self.check_anti_repeat = QCheckBox("Evitar repetir el mismo video consecutivamente")
        self.check_anti_repeat.setChecked(True)

        lib_btns_layout.addWidget(self.btn_add_video)
        lib_btns_layout.addWidget(self.btn_remove_video)
        lib_btns_layout.addSpacing(16)
        lib_btns_layout.addWidget(self.check_anti_repeat)
        lib_btns_layout.addStretch()
        lib_layout.addLayout(lib_btns_layout)

        root_layout.addWidget(lib_box)

        # 5. Compatibilidad con Juegos y Opciones
        opt_box = QGroupBox("3. Compatibilidad con Juegos y Opciones de Reproduccion")
        opt_layout = QHBoxLayout(opt_box)

        # Juego
        game_col = QVBoxLayout()
        self.check_game_filter = QCheckBox("Solo activar mientras se ejecuta este juego:")
        game_col.addWidget(self.check_game_filter)
        self.combo_game = QComboBox()
        self.combo_game.setEditable(True)
        self.combo_game.addItems(["javaw.exe", "Minecraft.exe", "RobloxPlayerBeta.exe", "FortniteClient-Win64-Shipping.exe"])
        game_col.addWidget(self.combo_game)
        self.check_pause_when_closed = QCheckBox("Pausar temporizador si el juego se cierra")
        self.check_pause_when_closed.setChecked(True)
        game_col.addWidget(self.check_pause_when_closed)
        opt_layout.addLayout(game_col)

        opt_layout.addSpacing(20)

        # Pantalla y Seguridad
        scr_col = QVBoxLayout()
        scr_col.addWidget(QLabel("Atajo de emergencia: ESCAPE (cierra instantaneamente)"))
        scr_col.addWidget(QLabel("Volumen Maestro:"))
        self.slider_master_vol = QSlider(Qt.Horizontal)
        self.slider_master_vol.setRange(0, 100)
        self.slider_master_vol.setValue(100)
        scr_col.addWidget(self.slider_master_vol)
        opt_layout.addLayout(scr_col)

        root_layout.addWidget(opt_box)

    def _connect_signals(self):
        self.scheduler.countdown_updated.connect(self._on_countdown_tick)
        self.scheduler.state_changed.connect(self._on_state_changed)
        self.scheduler.status_message.connect(self.status_msg_label.setText)
        self.scheduler.trigger_jumpscare.connect(self._on_trigger_jumpscare)

    def _load_config_to_ui(self):
        mode = self.config_mgr.get("mode", "random")
        if mode == "fixed":
            self.radio_fixed.setChecked(True)
            self._show_mode_panel(1)
        elif mode == "random":
            self.radio_random.setChecked(True)
            self._show_mode_panel(2)
        else:
            self.radio_prob.setChecked(True)
            self._show_mode_panel(3)

        fixed_sec = self.config_mgr.get("fixed_interval_seconds", 900)
        self.spin_fixed_min.setValue(fixed_sec // 60)
        self.spin_fixed_sec.setValue(fixed_sec % 60)

        self.spin_rand_min.setValue(self.config_mgr.get("random_interval_min_seconds", 300) // 60)
        self.spin_rand_max.setValue(self.config_mgr.get("random_interval_max_seconds", 1500) // 60)

        self.spin_prob_freq.setValue(self.config_mgr.get("probability_interval_seconds", 60))
        self.spin_prob_percent.setValue(self.config_mgr.get("probability_percent", 5.0))
        self.spin_prob_cooldown.setValue(self.config_mgr.get("min_cooldown_seconds", 180))

        self.check_game_filter.setChecked(self.config_mgr.get("game_filter_enabled", False))
        self.combo_game.setCurrentText(self.config_mgr.get("target_process_name", "javaw.exe"))
        self.slider_master_vol.setValue(self.config_mgr.get("master_volume", 100))
        self.check_anti_repeat.setChecked(self.config_mgr.get("prevent_consecutive_repetition", True))

        self._refresh_library_table()

    def _refresh_library_table(self):
        library = self.config_mgr.get("library", [])
        self.table_videos.setRowCount(len(library))
        for row, item in enumerate(library):
            self.table_videos.setItem(row, 0, QTableWidgetItem(item.get("name", "Video")))
            self.table_videos.setItem(row, 1, QTableWidgetItem(item.get("path", "")))
            self.table_videos.setItem(row, 2, QTableWidgetItem(f"{item.get('volume', 100)}%"))
            self.table_videos.setItem(row, 3, QTableWidgetItem("Si" if item.get("enabled", True) else "No"))

    def _show_mode_panel(self, mode_id: int):
        self.panel_fixed.setVisible(mode_id == 1)
        self.panel_random.setVisible(mode_id == 2)
        self.panel_prob.setVisible(mode_id == 3)

    def _on_mode_changed(self, mode_id: int):
        self._show_mode_panel(mode_id)
        mode_str = "fixed" if mode_id == 1 else "random" if mode_id == 2 else "probability"
        self.config_mgr.set("mode", mode_str)

    def _on_toggle_start(self):
        if not self.scheduler.is_running:
            self._save_ui_to_config()
            self.scheduler.start()
            self.start_btn.setText("DETENER")
            self.start_btn.setStyleSheet("background-color: #475569;")
        else:
            self.scheduler.stop()
            self.start_btn.setText("INICIAR")
            self.start_btn.setStyleSheet("")

    def _save_ui_to_config(self):
        self.config_mgr.set("fixed_interval_seconds", self.spin_fixed_min.value() * 60 + self.spin_fixed_sec.value())
        self.config_mgr.set("random_interval_min_seconds", self.spin_rand_min.value() * 60)
        self.config_mgr.set("random_interval_max_seconds", self.spin_rand_max.value() * 60)
        self.config_mgr.set("probability_interval_seconds", self.spin_prob_freq.value())
        self.config_mgr.set("probability_percent", self.spin_prob_percent.value())
        self.config_mgr.set("min_cooldown_seconds", self.spin_prob_cooldown.value())
        self.config_mgr.set("game_filter_enabled", self.check_game_filter.isChecked())
        self.config_mgr.set("target_process_name", self.combo_game.currentText().strip())
        self.config_mgr.set("master_volume", self.slider_master_vol.value())
        self.config_mgr.set("prevent_consecutive_repetition", self.check_anti_repeat.isChecked())

    @Slot(int)
    def _on_countdown_tick(self, seconds: int):
        mins = seconds // 60
        secs = seconds % 60
        self.countdown_label.setText(f"{mins:02d}:{secs:02d}")

    @Slot(str)
    def _on_state_changed(self, state: str):
        mapping = {
            "running": ("ACTIVO", "#22c55e"),
            "paused": ("PAUSADO", "#eab308"),
            "stopped": ("DETENIDO", "#94a3b8"),
            "waiting_game": ("ESPERANDO JUEGO", "#f97316")
        }
        text, color = mapping.get(state, ("DESCONOCIDO", "#fff"))
        self.state_label.setText(text)
        self.state_label.setStyleSheet(f"color: {color}; font-weight: bold;")

    @Slot(dict)
    def _on_trigger_jumpscare(self, video_data: dict):
        master_vol = self.config_mgr.get("master_volume", 100)
        monitor = self.config_mgr.get("target_monitor", 0)
        fullscreen = self.config_mgr.get("fullscreen", True)

        self.active_jumpscare_win = JumpscareWindow(
            video_data=video_data,
            master_volume=master_vol,
            monitor_index=monitor,
            fullscreen=fullscreen
        )

    def _on_test_scare(self):
        video = self.scheduler.select_next_video()
        if not video:
            QMessageBox.warning(self, "Aviso", "No hay videos habilitados en la biblioteca.")
            return
        self._on_trigger_jumpscare(video)

    def _on_add_video(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Seleccionar Video de Jumpscare",
            "",
            "Archivos de Video (*.mp4 *.mkv *.avi *.webm *.mov)"
        )
        if path:
            import os
            name = os.path.basename(path)
            library = self.config_mgr.get("library", [])
            library.append({
                "id": f"custom_{len(library) + 1}",
                "name": name,
                "path": path,
                "volume": 100,
                "enabled": True,
                "duration": 4.0
            })
            self.config_mgr.set("library", library)
            self._refresh_library_table()

    def _on_remove_video(self):
        row = self.table_videos.currentRow()
        if row < 0:
            return
        reply = QMessageBox.question(
            self,
            "Confirmar eliminacion",
            "¿Estas seguro de eliminar este video de la biblioteca?",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            library = self.config_mgr.get("library", [])
            if 0 <= row < len(library):
                library.pop(row)
                self.config_mgr.set("library", library)
                self._refresh_library_table()
`,
  },
  {
    path: 'build_exe.bat',
    filename: 'build_exe.bat',
    description: 'Script por lotes para compilar a .exe independiente con PyInstaller',
    content: `@echo off
title Compilador de Random Jumpscare Windows 11 (.exe)
color 0C
echo =====================================================================
echo    COMPILADOR DE RANDOM JUMPSCARE PARA WINDOWS 11 (FOXY EDITION)
echo =====================================================================
echo.
echo Paso 1: Verificando e instalando dependencias de Python...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install pyinstaller
if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron instalar los paquetes requeridos.
    pause
    exit /b
)
echo.
echo Paso 2: Creando ejecutable .exe autonomo...
pyinstaller --noconsole ^
            --onefile ^
            --name "RandomJumpscareFoxy" ^
            --clean ^
            main.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ocurrio un fallo durante la compilacion de PyInstaller.
    pause
    exit /b
)

echo.
echo =====================================================================
echo   COMPILACION EXITOSA!
echo   Tu archivo ejecutable esta listo en: dist\\RandomJumpscareFoxy.exe
echo =====================================================================
echo Puedes mover ese archivo a cualquier carpeta y ejecutarlo sin necesidad de Python.
echo Nota: Asegurate de tener VLC Media Player instalado en Windows para el motor libVLC.
echo.
pause
`,
  },
  {
    path: 'README.md',
    filename: 'README.md',
    description: 'Manual de usuario, guía de compilación y documentación técnica',
    content: `# Random Jumpscare para Windows 11 (Foxy Edition)

Software de jumpscares aleatorios para PC con Windows 11, inspirado en la mecánica de Foxy de *Five Nights at Freddy's*. Diseñado para funcionar de manera independiente mientras juegas videojuegos como *Minecraft*, sin mods ni inyección de código.

---

## 1. Características Principales

- **Tres modos de activación independientes**:
  1. **Intervalo Fijo**: Un jumpscare cada X minutos y segundos definidos.
  2. **Intervalo Aleatorio**: Espera calculada aleatoriamente entre un mínimo y un máximo tras cada susto.
  3. **Probabilidad por comprobación**: Tirada porcentual cada N segundos con tiempo de enfriamiento obligatorio (*cooldown*).
- **Biblioteca multimedia**:
  - Soporte para MP4, MKV, AVI, MOV y WebM a través de **libVLC** (no dependiente de los códecs nativos de Windows).
  - Control de volumen individual y general.
  - Prevención de repetición consecutiva del mismo vídeo.
  - Almacenamiento persistente en \`config.json\`.
- **Reproducción a pantalla completa**:
  - Ventana sin bordes *topmost* que aparece sobre los juegos en ventana sin bordes.
  - Cierre automático al finalizar el vídeo con restauración de foco inmediata a la ventana previa.
  - Atajo de emergencia **ESCAPE** para cierre instantáneo.
- **Compatibilidad con videojuegos**:
  - Detección no invasiva por nombre de ejecutable (ej. \`javaw.exe\` para Minecraft).
  - Opción de congelar o continuar los temporizadores cuando el juego está cerrado.

---

## 2. Instalación y Ejecución Rápida

### Requisitos:
1. **Windows 10 u 11** (64 bits).
2. **Python 3.10 o superior** (si ejecutas desde el código fuente).
3. **VLC Media Player (64-bit)** instalado en el sistema (provee las librerías \`libvlc.dll\`).

### Pasos:
\`\`\`bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar la aplicación
python main.py
\`\`\`

---

## 3. Generar el Archivo Ejecutable (.exe)

Puedes compilar un ejecutable independiente de un solo archivo que no requiere tener Python instalado:

1. Haz doble clic en el archivo \`build_exe.bat\`.
2. El script instalará \`pyinstaller\` y compilará la aplicación.
3. El archivo resultante estará en la carpeta:
   \`dist/RandomJumpscareFoxy.exe\`

---

## 4. Notas Importantes sobre Minecraft y Juegos en Pantalla Completa

- Si juegas a Minecraft en **Pantalla Completa Exclusiva** (*Exclusive Fullscreen*), Windows puede impedir que aplicaciones externas superpongan ventanas.
- **Solución recomendada**: En los ajustes gráficos de Minecraft, selecciona **Ventana sin bordes** (*Borderless Windowed* o modo ventana maximizada con F11). Esto permite que el jumpscare se superponga instantáneamente con audio estruendoso sin minimizar el juego.

---

## 5. Controles de Seguridad

- **Escape**: Cierra cualquier jumpscare activo de inmediato.
- **Botón "PROBAR SUSTO AHORA"**: Te permite comprobar el volumen y funcionamiento sin esperar a que transcurra el temporizador.
- **Pausa del sistema**: Detiene temporalmente las cuentas regresivas.
`,
  },
];

/**
 * Creates and triggers a download of the entire Python Windows 11 project as a ZIP file.
 */
export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('RandomJumpscare_Windows11_Foxy');

  for (const file of PYTHON_PROJECT_FILES) {
    if (folder) {
      folder.file(file.path, file.content);
    }
  }

  // Generate the zip blob
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'RandomJumpscare_Windows11_Foxy_Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
