import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/nest_api.dart';

// ── Session model ─────────────────────────────────────────────────────────────

class AuthSession {
  final String accessToken;
  final String refreshToken;
  final String workspaceId;
  final String workspaceName;
  final String displayName;
  final String email;
  final String userId;

  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.workspaceId,
    required this.workspaceName,
    required this.displayName,
    required this.email,
    required this.userId,
  });

  String get initials {
    final parts = displayName.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends AsyncNotifier<AuthSession?> {
  NestApi get _api => ref.read(nestApiProvider);

  @override
  Future<AuthSession?> build() async {
    final token = await _api.readToken();
    if (token == null) return null;
    final storage = _api.storage;
    return AuthSession(
      accessToken: token,
      refreshToken: await storage.read(key: 'refreshToken') ?? '',
      workspaceId: await storage.read(key: 'workspaceId') ?? '',
      workspaceName: await storage.read(key: 'workspaceName') ?? 'My Finances',
      displayName: await storage.read(key: 'displayName') ?? 'User',
      email: await storage.read(key: 'email') ?? '',
      userId: await storage.read(key: 'userId') ?? '',
    );
  }

  Future<void> login(String email, String password) async {
    final result = await _api.login(email, password);
    final session = await _buildSession(result);
    state = AsyncValue.data(session);
  }

  Future<void> register(String displayName, String email, String password) async {
    final result = await _api.register(displayName, email, password);
    await _api.storage.write(key: 'accessToken', value: result.accessToken);
    await _api.storage.write(key: 'refreshToken', value: result.refreshToken);
    final workspace = await _api.createWorkspace('My Finances');
    await _api.saveSession(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      displayName: result.user.displayName,
      email: result.user.email,
      userId: result.user.id,
    );
    state = AsyncValue.data(AuthSession(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      displayName: result.user.displayName,
      email: result.user.email,
      userId: result.user.id,
    ));
  }

  Future<void> logout() async {
    await _api.clearSession();
    state = const AsyncValue.data(null);
  }

  Future<void> switchWorkspace(WorkspaceDto ws) async {
    final current = state.value;
    if (current == null) return;
    await _api.storage.write(key: 'workspaceId', value: ws.id);
    await _api.storage.write(key: 'workspaceName', value: ws.name);
    state = AsyncValue.data(AuthSession(
      accessToken: current.accessToken,
      refreshToken: current.refreshToken,
      workspaceId: ws.id,
      workspaceName: ws.name,
      displayName: current.displayName,
      email: current.email,
      userId: current.userId,
    ));
  }

  Future<AuthSession> _buildSession(LoginResult result) async {
    await _api.storage.write(key: 'accessToken', value: result.accessToken);
    await _api.storage.write(key: 'refreshToken', value: result.refreshToken);

    final workspaces = await _api.getWorkspaces();
    final workspace = workspaces.isNotEmpty
        ? workspaces.first
        : await _api.createWorkspace('My Finances');

    await _api.saveSession(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      displayName: result.user.displayName,
      email: result.user.email,
      userId: result.user.id,
    );

    return AuthSession(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      displayName: result.user.displayName,
      email: result.user.email,
      userId: result.user.id,
    );
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final authNotifierProvider =
    AsyncNotifierProvider<AuthNotifier, AuthSession?>(() => AuthNotifier());

// Convenience accessor — throws if not authenticated
final authSessionProvider = Provider<AuthSession>((ref) {
  return ref.watch(authNotifierProvider).requireValue!;
});
