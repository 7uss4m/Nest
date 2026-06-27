import 'dart:async';
import 'dart:convert';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

// ntfy base URL — must match Ntfy:BaseUrl in backend appsettings.json
const _kNtfyBase = 'https://ntfy.sh';
const _kTopicTemplate = 'nest-{userId}';

// ── Local notifications setup ─────────────────────────────────────────────────

final _plugin = FlutterLocalNotificationsPlugin();
var _pluginInitialized = false;
int _notifId = 0;

Future<void> initLocalNotifications() async {
  if (_pluginInitialized) return;
  const android = AndroidInitializationSettings('@mipmap/ic_launcher');
  const ios = DarwinInitializationSettings(
    requestAlertPermission: true,
    requestBadgePermission: true,
    requestSoundPermission: true,
  );
  await _plugin.initialize(
    settings: const InitializationSettings(android: android, iOS: ios),
  );
  _pluginInitialized = true;
}

Future<void> _showNotification(String title, String body) async {
  await _plugin.show(
    id: _notifId++,
    title: title,
    body: body,
    notificationDetails: const NotificationDetails(
      android: AndroidNotificationDetails(
        'nest_payments',
        'Payment Reminders',
        channelDescription: 'Reminders for upcoming and overdue payments',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    ),
  );
}

// ── ntfy SSE subscription ─────────────────────────────────────────────────────

class NtfySubscription {
  final String userId;
  StreamSubscription<List<int>>? _sub;
  final _dio = Dio();
  bool _disposed = false;
  final StringBuffer _buf = StringBuffer();

  NtfySubscription(this.userId);

  String get _topic => _kTopicTemplate.replaceAll('{userId}', userId);
  String get _url => '$_kNtfyBase/$_topic/sse';

  Future<void> start() async {
    if (userId.isEmpty) return;
    await initLocalNotifications();
    _connect();
  }

  void _connect() async {
    if (_disposed) return;
    try {
      final response = await _dio.get<ResponseBody>(
        _url,
        options: Options(
          responseType: ResponseType.stream,
          receiveTimeout: Duration.zero,
          headers: {'Accept': 'text/event-stream'},
        ),
      );

      _sub = response.data!.stream.listen(
        (chunk) {
          final text = utf8.decode(chunk, allowMalformed: true);
          _buf.write(text);
          _processBuffer();
        },
        onError: (_) => _scheduleReconnect(),
        onDone: () => _scheduleReconnect(),
      );
    } catch (_) {
      _scheduleReconnect();
    }
  }

  void _processBuffer() {
    final raw = _buf.toString();
    final events = raw.split('\n\n');
    // Keep last partial event (may not be terminated yet)
    _buf.clear();
    _buf.write(events.last);

    for (final block in events.sublist(0, events.length - 1)) {
      _parseEvent(block);
    }
  }

  void _parseEvent(String block) {
    String? dataLine;
    for (final line in block.split('\n')) {
      if (line.startsWith('data:')) {
        dataLine = line.substring(5).trim();
      }
    }
    if (dataLine == null || dataLine.isEmpty) return;
    try {
      final json = jsonDecode(dataLine) as Map<String, dynamic>;
      final event = json['event'] as String? ?? '';
      if (event != 'message') return;
      final title = json['title'] as String? ?? 'Nest';
      final message = json['message'] as String? ?? '';
      _showNotification(title, message);
    } catch (_) {}
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    Future.delayed(const Duration(seconds: 30), _connect);
  }

  void dispose() {
    _disposed = true;
    _sub?.cancel();
    _dio.close();
  }
}

// ── Riverpod provider ─────────────────────────────────────────────────────────

final ntfySubscriptionProvider = Provider.family<NtfySubscription, String>((ref, userId) {
  final sub = NtfySubscription(userId);
  sub.start();
  ref.onDispose(sub.dispose);
  return sub;
});
