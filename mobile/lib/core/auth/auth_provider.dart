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

class AuthNotifier extends StateNotifier<AsyncValue<AuthSession?>> {
  final NestApi api;

  AuthNotifier(this.api) : super(const AsyncValue.loading()) {
    _init();
  }

  Future<void> _init() async {
    try {
      final token = await api.readToken();
      if (token == null) {
        state = const AsyncValue.data(null);
        return;
      }
      final storage = api.storage;
      final session = AuthSession(
        accessToken: token,
        refreshToken: await storage.read(key: 'refreshToken') ?? '',
        workspaceId: await storage.read(key: 'workspaceId') ?? '',
        workspaceName: await storage.read(key: 'workspaceName') ?? 'My Finances',
        displayName: await storage.read(key: 'displayName') ?? 'User',
        email: await storage.read(key: 'email') ?? '',
        userId: await storage.read(key: 'userId') ?? '',
      );
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final result = await api.login(email, password);
      final session = await _buildSession(result);
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> register(String displayName, String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final result = await api.register(displayName, email, password);
      // New user has no workspace — create "My Finances" automatically
      await api.storage.write(key: 'accessToken', value: result.accessToken);
      await api.storage.write(key: 'refreshToken', value: result.refreshToken);
      final workspace = await api.createWorkspace('My Finances');
      await api.saveSession(
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
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> logout() async {
    await api.clearSession();
    state = const AsyncValue.data(null);
  }

  Future<void> switchWorkspace(WorkspaceDto ws) async {
    final current = state.valueOrNull;
    if (current == null) return;
    await api.storage.write(key: 'workspaceId', value: ws.id);
    await api.storage.write(key: 'workspaceName', value: ws.name);
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
    // Temporarily write tokens so authenticated calls work
    await api.storage.write(key: 'accessToken', value: result.accessToken);
    await api.storage.write(key: 'refreshToken', value: result.refreshToken);

    final workspaces = await api.getWorkspaces();
    final workspace = workspaces.isNotEmpty
        ? workspaces.first
        : await api.createWorkspace('My Finances');

    await api.saveSession(
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
    StateNotifierProvider<AuthNotifier, AsyncValue<AuthSession?>>((ref) {
  return AuthNotifier(ref.read(nestApiProvider));
});

// Convenience accessor — throws if not authenticated
final authSessionProvider = Provider<AuthSession>((ref) {
  return ref.watch(authNotifierProvider).requireValue!;
});
