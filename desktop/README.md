# VOX Desktop

This is the Electron desktop shell for the existing hosted VOX app. It keeps the current Firebase backend and loads the deployed HTTPS VOX site; it does not create a second database.

## Settings

Open **VOX → Settings…** or press **Ctrl+,**.

- **Hardware Acceleration:** ON by default. OFF invokes Electron's `app.disableHardwareAcceleration()` before startup. Restart required.
- **CPU Boost:** raises VOX Electron process scheduling priority to Windows HIGH (never REALTIME). This is not CPU overclocking and cannot force higher clock speeds; it may affect responsiveness of other apps.
- **Low Latency Profile:** reduces background renderer throttling. It cannot reduce internet ping or Firebase/network latency and may increase CPU/battery use.
- **Disable Animation Effects:** injects reduced-motion CSS into the app window.
- **Microphone / Camera:** gates Electron media permission requests. Windows privacy settings still apply.
- **Screen sharing:** Electron prompts the user to choose a screen or window when the web app requests capture.

Settings are saved in Electron's user-data folder and never sent to Firebase.

## Build on Windows

Install Node.js 22 or newer, then from this folder:

```powershell
npm install
npm start
npm run dist:portable
```

The portable executable is generated in `dist/`. Build and test on the target Windows machine with both GPU settings; driver support differs. The app is not performance-benchmarked against Discord, so no claim of beating Discord is made.
