# VOX Mobile

A separate native React Native app for Android phones, iPhone, and tablets. It lives in its own `mobile/` directory and does not replace the existing website or Windows desktop app.

## Technology

- Expo SDK 58 and React Native 0.88
- TypeScript
- Firebase JavaScript SDK 13
- Existing Firebase project: `vox-chat-979fd`
- Persistent sign-in using AsyncStorage
- Native React Native UI, not a WebView wrapper
- Expo development client for native-module support

## Implemented foundation

- Email/password sign-in and account creation
- Sign-in using an existing VOX username or email
- Persistent sign-in between app launches
- Existing VOX profile documents in `vox_users`
- Mutual-friend list with friend/block checks
- Existing servers, groups, and server channels
- Real-time text messages using `vox_messages`
- Existing DM room IDs and message document fields
- Adaptive phone navigation and two-pane tablet layout
- Tuned message-list rendering for smoother scrolling on Android devices
- Camera and microphone permission declarations for future native calling
- Online/away/offline presence in `vox_presence`

## Still to build

- Native voice/video calling and screen sharing with WebRTC (not implemented yet)
- Native push notifications
- Google and Apple native sign-in
- Native media/file uploads and richer message rendering
- Friend requests, profile editing, and server/group creation controls

The voice-channel screen is currently a placeholder and does not start a call yet.

## Requirements

Use Node.js 22.13+ and npm.

## Run locally on Windows

1. Open CMD in the `mobile` directory.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npx expo install --fix`.
5. Run `npm run typecheck`.
6. Run `npm start` and open the project with a matching VOX development build.

SDK 58 requires Node.js 22.13 or newer. Use a development build for real-device work and the upcoming WebRTC/push modules.

## Development builds

```sh
npm install --global eas-cli
eas login
```

Build development clients:

```sh
eas build --profile development --platform android
eas build --profile development --platform ios
```

For an Android preview APK:

```sh
eas build --profile preview --platform android
```

EAS cloud builds can create iOS binaries without a local Mac, but Apple signing and distribution requirements still apply.

## Firebase compatibility

The app connects to the same Firebase project and collections as VOX Web. It does not create a new Firebase project or migrate user data. Existing Firestore security rules continue to apply.

The public Firebase client configuration is supplied with `EXPO_PUBLIC_` environment variables. The `.env` file is ignored by Git. Never put service-account credentials or Admin SDK private keys in a mobile app.

Google sign-in needs native Android/iOS OAuth client configuration for the new bundle identifiers. It is not enabled yet; email/password and username-based sign-in are implemented first.

## Calls and notifications

See [CALLS-AND-NOTIFICATIONS.md](./CALLS-AND-NOTIFICATIONS.md). The mobile call implementation will preserve VOX's existing `vox_calls` signalling room shape and add TURN relay support before claiming reliable calls across mobile networks.
