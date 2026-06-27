# Nest — Mobile

The Flutter mobile client for [Nest](../README.md), using Riverpod for state
management and Dio for networking.

## Development

```bash
flutter pub get
flutter run
```

## API base URL

The backend base URL is configured in
[`lib/core/api/nest_api.dart`](lib/core/api/nest_api.dart):

- `10.0.2.2` reaches the host machine's `localhost` from the Android emulator.
- For a physical device, use your host machine's LAN IP (e.g. `http://192.168.1.x:5000`).

See the [root README](../README.md) for the full stack and backend setup.
