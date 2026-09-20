const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
});
