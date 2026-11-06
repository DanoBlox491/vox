# VOX Mobile

A separate native React Native app for Android phones, iPhone, and tablets. It lives in its own mobile/ directory and does not replace or rewrite the existing website or Windows desktop app.

## Technology

- Expo SDK 58 and React Native 0.88
- TypeScript
- Firebase JavaScript SDK 12+
- Existing Firebase project: vox-chat-979fd
- Persistent Firebase Authentication using AsyncStorage
- Native React Native UI; this is not a WebView wrapper

## Implemented in this first foundation

- Email/password sign-in and account creation
- Sign-in using an existing VOX username or email
- Persistent sign-in between app launches
- Existing VOX profile documents in vox_users
- Mutual-friend list with the same friend/block checks used by VOX Web
- Existing servers, groups, and server channels
- Real-time text messages using vox_messages
- Existing DM room IDs and message document fields
- Adaptive layout: phone navigation and a two-pane tablet layout
- Online/away/offline presence in vox_presence

## Still to build

- Native voice/video calling with WebRTC
- Native push notifications
- Google and Apple native sign-in
- Native media/file uploads and richer message rendering
- Friend requests, profile editing, and server/group creation controls

The Call button is currently a placeholder and does not start a call yet.

## Requirements

Use Node.js 22.13+ (or a currently supported even-numbered LTS release) and npm.

## Run locally on Windows

1. Open CMD in the mobile directory.
2. Copy .env.example to .env.
3. Run npm install.
4. Run npx expo start.
5. Scan the QR code with an Expo Go build that supports SDK 58. If your installed Expo Go has not updated to SDK 58, use an EAS development build.

For an Android development build:
- Install EAS CLI: npm install --global eas-cli
- Sign in: eas login
- Build: eas build --profile development --platform android

For an iOS development build, run eas build --profile development --platform ios. EAS cloud builds can create iOS binaries without a local Mac, but Apple signing and distribution requirements still apply.

## Firebase compatibility

The app connects to the same Firebase project and collections as VOX Web. It does not create a new Firebase project or change existing documents. Existing Firestore security rules continue to apply.

The public Firebase client configuration is supplied with EXPO_PUBLIC_ environment variables. The .env file is ignored by Git. Never put service-account credentials or Admin SDK private keys in a mobile app.

This first pass uses Firebase JS SDK for Authentication and Firestore. Expo documents support for these Firebase services in React Native. Native calling and background push notifications require a development build and additional native configuration.
