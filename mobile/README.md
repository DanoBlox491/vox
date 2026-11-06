# VOX Mobile

Native Android and iOS client for VOX. This is a separate project from the GitHub Pages website and the Windows Electron app.

## Current foundation

- Expo SDK 58 / React Native 0.88.
- Adaptive phone and tablet layout.
- Existing VOX Firebase project: `vox-chat-979fd`.
- Firebase Authentication with persistent native storage.
- Existing Firestore collections and field names:
  - `vox_users`
  - `vox_servers`
  - `vox_channels`
  - `vox_groups`
  - `vox_messages`
- Live Firestore listeners for the signed-in profile, servers, groups, and the active conversation.
- Email/password sign-in, username sign-in, and email/password account creation.

## Requirements

- Node.js 22.13 or newer.
- npm.
- For local Android builds: Android Studio and an Android SDK.
- For local iOS builds: macOS with Xcode. An EAS cloud build can build iOS from other operating systems.

## Install and run

From this directory:

```sh
npm install
npx expo install --fix
npm run doctor
npm start
```

The project uses a development client. Expo SDK 58 and native modules should be run with a matching development build, not an older Expo Go client.

## Development builds

Install and sign in to EAS CLI:

```sh
npm install --global eas-cli
eas login
eas build:configure
```

Build a development client:

```sh
eas build --profile development --platform android
eas build --profile development --platform ios
```

For an Android preview APK:

```sh
eas build --profile preview --platform android
```

## Firebase setup and compatibility

The mobile client intentionally uses the same Firebase project and public Firebase web-app configuration as the existing VOX website. It writes and reads the existing VOX document shapes; it does not create a new backend or migrate user data.

The Firebase web API key in `src/firebase.ts` is an app identifier, not an Admin SDK credential. Do not add service-account JSON, Admin SDK private keys, or other server secrets to this mobile app. Firestore and Storage Security Rules must continue to enforce access.

Google sign-in needs Android/iOS OAuth client configuration for the new native bundle identifiers. It is not enabled in this first scaffold yet; email/password and username-based sign-in are implemented first.

## Milestones

1. **Foundation (this commit):** native sign-in, adaptive shell, live friend/group/server lists, and active-room text messaging.
2. **Messaging parity:** friend requests, unread counts, typing, message reactions/edits/deletes, image and file uploads.
3. **Calls:** native WebRTC audio/video using the existing `vox_calls` documents and `signals` subcollection. A custom Expo development build is required for native WebRTC modules.
4. **Notifications:** native push notifications and deep links into the correct room.
5. **Release:** Android and iOS store builds, privacy disclosures, and device testing.

## Important

The current native screen is an initial working foundation, not yet feature-parity with VOX Web. Voice/video, Google sign-in, attachments, and push notifications are tracked above and should not be advertised as complete until tested on real devices.
