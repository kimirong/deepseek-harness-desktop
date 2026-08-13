'use strict'
// Preload: the only bridge between the boot screen renderer and the main
// process. The renderer stays sandboxed (contextIsolation: true); it can only
// trigger the three actions below and receive state updates.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dshBoot', {
  /** Ask the main process to re-probe the connect port. */
  retry: () => ipcRenderer.invoke('boot:retry'),
  /** Spawn (or re-spawn) the `dsh web` server. */
  start: () => ipcRenderer.invoke('boot:start'),
  /** Receive { phase, text, detail, detailKind } state pushes. */
  onState: (callback) => ipcRenderer.on('boot:state', (_event, state) => callback(state)),
})
