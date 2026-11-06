# VOX Desktop

This is the Electron desktop shell for the existing hosted VOX app. It keeps the current Firebase backend and loads the deployed HTTPS VOX site; it does not create a second database.

## Settings

Open **VOX → Settings…** or press **Ctrl+,**.

- **Hardware Acceleration:** ON by default. OFF invokes Electron's `app.disableHardwareAcceleration()` before startup. Restart required.
- **GPU Acceleration Boost:** ON by default. Adds Chromium `enable-gpu-rasterization` and `enable-accelerated-video-decode` switches before startup. This is a real GPU rendering/decode preference, not a GPU overclock; the driver may disable unsupported features. Requires Hardware Acceleration ON and a restart. The Settings page also displays Electron GPU feature status.
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

## Desktop app updates

- The installed NSIS version checks GitHub Releases at startup and every **5 minutes**. Users can also choose **VOX → Check for Updates…** or use **Settings → Desktop App Updates → Check now**.
- Available updates download in the background. When ready, VOX asks whether to restart and install. If the user chooses Later, the update installs when VOX exits.
- Five-minute polling is a practical near-real-time compromise, not a push notification: updates are normally detected within about 5 minutes while VOX is running. Frequent checks make more GitHub requests, so monitor for rate-limit errors as the user base grows.
- Updates are published by the tagged-release workflow. Bump `desktop/package.json`'s version, commit the change, create and push a matching tag (for example `v1.0.2`), and the workflow builds the Windows installer and portable executable and publishes the release assets plus updater metadata.
- The auto-updater is supported for the installed NSIS build. Portable EXE users get a Releases link and must download/replace the portable build manually; portable executables are not silently self-replaced.
- Important bootstrap step: users on older desktop builds that did not include this updater must install the new updater-enabled installer once. They cannot receive an automatic update popup from code they do not yet have. After that one-time install, future tagged desktop releases can update automatically.
- Website version popups and Electron desktop updates are separate systems. The website update checker does not update the desktop executable.
