# Native calls and notifications — next mobile phase

VOX Web currently uses Firebase documents in vox_calls/{roomKey} and the signals subcollection, plus browser WebRTC APIs. The mobile app does not pretend those browser APIs are available in React Native.

The native implementation should:

1. Use a React Native WebRTC module through an Expo config plugin and an EAS development build.
2. Preserve the existing room key and signaling document shape where practical, after verifying current Firestore security rules.
3. Add a TURN relay service before claiming reliable calls across mobile networks; the current website only configures a public STUN server.
4. Use Expo Notifications with platform credentials for background push delivery.
5. Store device push tokens under a documented per-user structure and remove stale tokens on logout.

Do not add TURN credentials, service-account keys, or Admin SDK secrets to the client app or Git repository.
