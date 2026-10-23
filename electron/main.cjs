const {
  app,
  BrowserWindow,
  shell,
  session,
  screen,
  ipcMain,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
} = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.join(app.getAppPath(), 'dist');
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs');
// Puerto fijo para que localStorage (ajustes y biblioteca) se conserve entre ejecuciones.
const PREFERRED_PORT = 49731;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Permite reproducir los jumpscares automáticamente (con audio) sin interacción del usuario.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let scareWindow = null;
let scarePayload = null;
let staticServer = null;
let appUrl = null;
let finishingScare = false;
let panicAccelerators = [];
let tray = null;
let trayHintShown = false;
let isQuitting = false;

function sendFile(req, res, filePath, stats) {
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      let start = match[1] === '' ? NaN : Number(match[1]);
      let end = match[2] === '' ? NaN : Number(match[2]);

      if (Number.isNaN(start)) {
        start = Math.max(0, stats.size - end);
        end = stats.size - 1;
      } else if (Number.isNaN(end)) {
        end = stats.size - 1;
      }

      if (start >= stats.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        res.end();
        return;
      }

      end = Math.min(end, stats.size - 1);
      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(req, res) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(DIST_DIR, relativePath));

  if (filePath !== DIST_DIR && !filePath.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    sendFile(req, res, filePath, stats);
  });
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(serveStatic);
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

async function startStaticServer() {
  try {
    staticServer = await listen(PREFERRED_PORT);
  } catch {
    staticServer = await listen(0);
  }
  return `http://127.0.0.1:${staticServer.address().port}`;
}

function normalizePanicAccelerator(panicKey) {
  if (!panicKey) return null;
  if (panicKey === ' ' || panicKey.toLowerCase() === 'space') return 'Space';
  if (panicKey.length === 1) return panicKey.toUpperCase();
  return panicKey;
}

function unregisterPanicShortcuts() {
  for (const accelerator of panicAccelerators) {
    try {
      globalShortcut.unregister(accelerator);
    } catch {
      // Ignorado: el atajo ya no estaba registrado.
    }
  }
  panicAccelerators = [];
}

function registerPanicShortcuts(panicKey) {
  unregisterPanicShortcuts();

  const candidates = new Set(['Escape', normalizePanicAccelerator(panicKey)].filter(Boolean));

  for (const accelerator of candidates) {
    if (globalShortcut.isRegistered(accelerator)) continue;
    try {
      if (globalShortcut.register(accelerator, () => finishScare(true))) {
        panicAccelerators.push(accelerator);
      }
    } catch {
      // Algunos atajos pueden estar reservados por el sistema o por el juego.
    }
  }
}

function resolveDisplay(displayId) {
  const displays = screen.getAllDisplays();
  const match = displays.find((display) => String(display.id) === String(displayId));
  return match || screen.getPrimaryDisplay();
}

function computeScareBounds(fullscreen, display) {
  const { x, y, width, height } = display.bounds;

  if (fullscreen) return { x, y, width, height };

  const windowWidth = Math.round(width * 0.7);
  const windowHeight = Math.round(height * 0.7);
  return {
    x: x + Math.round((width - windowWidth) / 2),
    y: y + Math.round((height - windowHeight) / 2),
    width: windowWidth,
    height: windowHeight,
  };
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (appUrl) createMainWindow(appUrl);
    return;
  }

  mainWindow.setSkipTaskbar(false);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(app.getAppPath(), 'assets', 'icon.ico');
  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    image = nativeImage.createEmpty();
  } else {
    image = image.resize({ width: 16, height: 16 });
  }

  tray = new Tray(image);
  tray.setToolTip('Random Jumpscare Foxy — en segundo plano');

  const rebuildMenu = () => {
    const running = Boolean(scareWindow);

    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Abrir panel', click: () => showMainWindow() },
        {
          label: running ? 'Detener jumpscare' : 'En segundo plano',
          enabled: running,
          click: () => finishScare(true),
        },
        { type: 'separator' },
        {
          label: 'Salir',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ])
    );
  };

  rebuildMenu();
  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
  tray.on('menu-show', rebuildMenu);
}

function hideToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Sin botón en la barra de tareas: queda solo el icono de la bandeja.
  mainWindow.setSkipTaskbar(true);
  mainWindow.hide();

  if (!trayHintShown && tray) {
    trayHintShown = true;
    tray.displayBalloon({
      iconType: 'info',
      title: 'Random Jumpscare Foxy',
      content: 'La app sigue funcionando en segundo plano. Haz clic en el icono para volver a abrirla.',
    });
  }
}

function finishScare(notifyRenderer) {
  if (finishingScare) return;
  finishingScare = true;

  try {
    unregisterPanicShortcuts();
    scarePayload = null;

    const windowToClose = scareWindow;
    scareWindow = null;
    if (windowToClose && !windowToClose.isDestroyed()) {
      // Evita que el handler "closed" vuelva a notificar al renderer principal.
      windowToClose.removeAllListeners('closed');
      windowToClose.destroy();
    }

    if (notifyRenderer && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('foxy:scare-finished');
    }
  } finally {
    finishingScare = false;
  }
}

async function showScare(payload) {
  if (!appUrl) throw new Error('El servidor interno aún no está listo');
  if (!payload || !payload.src) throw new Error('Payload de susto inválido');

  finishScare(false);
  scarePayload = payload;

  const display = resolveDisplay(payload.displayId);
  const bounds = computeScareBounds(Boolean(payload.fullscreen), display);

  // La app pasa a segundo plano (bandeja) durante el susto y NO vuelve a primer plano
  // al terminar, para no interrumpir el juego.
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
    mainWindow.minimize();
  }

  scareWindow = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    acceptFirstMouse: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  scareWindow.setAlwaysOnTop(true, 'screen-saver');
  scareWindow.setIgnoreMouseEvents(true, { forward: true });
  scareWindow.setVisibleOnAllWorkspaces(true);

  scareWindow.on('closed', () => {
    scareWindow = null;
    finishScare(true);
  });

  scareWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Registramos el atajo antes de cargar la página para que esté activo desde el primer frame.
  registerPanicShortcuts(payload.panicKey);

  await scareWindow.loadURL(`${appUrl}/overlay.html`);

  if (scareWindow && !scareWindow.isDestroyed()) {
    scareWindow.showInactive();
    // Windows a veces recorta la ventana al área de trabajo (barra de tareas); forzamos los bounds.
    scareWindow.setBounds(bounds);
  }
}

function registerIpcHandlers() {
  ipcMain.handle('foxy:get-displays', () => {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((display, index) => ({
      id: String(display.id),
      label: `Pantalla ${index + 1}`,
      width: Math.round(display.size.width),
      height: Math.round(display.size.height),
      scaleFactor: display.scaleFactor,
      primary: display.id === primaryId,
    }));
  });

  ipcMain.handle('foxy:show-scare', async (_event, payload) => {
    await showScare(payload);
  });

  ipcMain.handle('foxy:close-scare', () => {
    // Cierre solicitado por la app (p. ej. "Detener"): no debe disparar el cooldown del susto.
    finishScare(false);
  });

  ipcMain.handle('foxy:consume-scare-payload', () => scarePayload);

  ipcMain.on('foxy:scare-renderer-finished', () => {
    finishScare(true);
  });
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#0B0F17',
    autoHideMenuBar: true,
    fullscreenable: true,
    icon: path.join(app.getAppPath(), 'assets', 'icon.ico'),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimizar = pasar a segundo plano (icono oculto de la bandeja del sistema).
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    hideToTray();
  });

  mainWindow.on('restore', () => {
    if (mainWindow && !mainWindow.isDestroyed() && !isQuitting) {
      trayHintShown = true;
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      shell.openExternal(targetUrl);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!targetUrl.startsWith(url)) {
      event.preventDefault();
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        shell.openExternal(targetUrl);
      }
    }
  });

  mainWindow.loadURL(url);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(async () => {
    // Fuerza el diálogo "Guardar como" al exportar el ZIP del proyecto Python.
    session.defaultSession.on('will-download', (_event, item) => {
      item.setSaveDialogOptions({ title: 'Guardar archivo' });
    });

    registerIpcHandlers();
    createTray();

    appUrl = await startStaticServer();
    createMainWindow(appUrl);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow(appUrl);
    });  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    finishScare(false);
    if (staticServer) staticServer.close();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });
}
