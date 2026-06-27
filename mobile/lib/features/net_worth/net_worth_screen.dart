import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

class _NetWorthData {
  final List<AssetDto> assets;
  final List<LiabilityDto> liabilities;
  final List<NetWorthEntry> history;
  const _NetWorthData({required this.assets, required this.liabilities, required this.history});
}

final _netWorthProvider = FutureProvider.autoDispose<_NetWorthData>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;
  final assetsFut = api.getAssets(wsId);
  final liabsFut = api.getLiabilities(wsId);
  final histFut = api.getNetWorthHistory(wsId);
  return _NetWorthData(
    assets: await assetsFut,
    liabilities: await liabsFut,
    history: await histFut,
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────

class NetWorthScreen extends ConsumerWidget {
  const NetWorthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(_netWorthProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: NestColors.text1),
        title: const Text('Net Worth', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 18, color: NestColors.text1)),
        backgroundColor: NestColors.base,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_netWorthProvider.future),
        child: dataAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5)),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 40),
              const SizedBox(height: 12),
              Text(e.toString(), style: const TextStyle(color: NestColors.text3, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(onPressed: () => ref.refresh(_netWorthProvider), child: const Text('Retry', style: TextStyle(color: NestColors.indigoL))),
            ]),
          ),
          data: (data) => _NetWorthBody(data: data),
        ),
      ),
    );
  }
}

class _NetWorthBody extends StatelessWidget {
  final _NetWorthData data;
  const _NetWorthBody({required this.data});

  @override
  Widget build(BuildContext context) {
    final totalAssets = data.assets.fold(0.0, (s, a) => s + a.currentValue);
    final totalLiabilities = data.liabilities.fold(0.0, (s, l) => s + l.currentBalance);
    final netWorth = totalAssets - totalLiabilities;

    // MoM change from history
    double? momChange;
    if (data.history.length >= 2) {
      final prev = data.history[data.history.length - 2].netWorth;
      momChange = prev != 0 ? ((netWorth - prev) / prev.abs()) * 100 : null;
    }

    final debtToAsset = totalAssets > 0 ? (totalLiabilities / totalAssets).clamp(0.0, 1.0) : 0.0;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Hero card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF3B3FBB), Color(0xFF1A9B8A)],
            ),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Net Worth', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white70)),
            const SizedBox(height: 6),
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(
                formatCurrency(netWorth),
                style: const TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 32, color: Colors.white),
              ),
              if (momChange != null) ...[
                const SizedBox(width: 10),
                Container(
                  margin: const EdgeInsets.only(bottom: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    '${momChange >= 0 ? "+" : ""}${momChange.toStringAsFixed(1)}% MoM',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                  ),
                ),
              ],
            ]),
            const SizedBox(height: 16),
            if (data.history.isNotEmpty)
              SizedBox(
                height: 56,
                child: _SparklineChart(history: data.history),
              ),
          ]),
        ),
        const SizedBox(height: 16),

        // Assets + Liabilities side by side
        Row(children: [
          Expanded(child: _SplitCard(
            label: 'Assets',
            value: totalAssets,
            color: NestColors.income,
            icon: Icons.diamond_outlined,
          )),
          const SizedBox(width: 10),
          Expanded(child: _SplitCard(
            label: 'Liabilities',
            value: totalLiabilities,
            color: NestColors.expense,
            icon: Icons.trending_down,
          )),
        ]),
        const SizedBox(height: 16),

        // Debt-to-asset ratio
        if (totalAssets > 0) ...[
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: NestColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: NestColors.border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Debt-to-Asset Ratio', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: NestColors.text2)),
                Text(
                  '${(debtToAsset * 100).toStringAsFixed(1)}%',
                  style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w700,
                    color: debtToAsset > 0.5 ? NestColors.expense : debtToAsset > 0.3 ? NestColors.amber : NestColors.income,
                    fontFamily: 'InterTight',
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: debtToAsset,
                  backgroundColor: Colors.white.withOpacity(0.06),
                  valueColor: AlwaysStoppedAnimation(
                    debtToAsset > 0.5 ? NestColors.expense : debtToAsset > 0.3 ? NestColors.amber : NestColors.income,
                  ),
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                debtToAsset > 0.5 ? 'High leverage — consider reducing debt'
                  : debtToAsset > 0.3 ? 'Moderate leverage'
                  : 'Healthy debt ratio',
                style: const TextStyle(fontSize: 11.5, color: NestColors.text4),
              ),
            ]),
          ),
          const SizedBox(height: 16),
        ],

        // 12-month history chart
        if (data.history.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: NestColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: NestColors.border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('12-Month Trend', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: NestColors.text2)),
              const SizedBox(height: 18),
              SizedBox(
                height: 140,
                child: _BarTrendChart(history: data.history),
              ),
            ]),
          ),
        ],
      ]),
    );
  }
}

// ── Sparkline (for hero card) ─────────────────────────────────────────────────

class _SparklineChart extends StatelessWidget {
  final List<NetWorthEntry> history;
  const _SparklineChart({required this.history});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _SparklinePainter(history),
      size: const Size(double.infinity, 56),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final List<NetWorthEntry> history;
  _SparklinePainter(this.history);

  @override
  void paint(Canvas canvas, Size size) {
    if (history.isEmpty) return;

    final values = history.map((e) => e.netWorth).toList();
    final minV = values.reduce(math.min);
    final maxV = values.reduce(math.max);
    final range = (maxV - minV).abs();
    final w = size.width;
    final h = size.height;

    double xOf(int i) => i / (values.length - 1) * w;
    double yOf(double v) => range < 0.01 ? h / 2 : h - ((v - minV) / range) * (h * 0.85) - h * 0.07;

    final path = Path();
    path.moveTo(xOf(0), yOf(values[0]));
    for (int i = 1; i < values.length; i++) {
      path.lineTo(xOf(i), yOf(values[i]));
    }

    // Fill
    final fillPath = Path.from(path)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();

    canvas.drawPath(fillPath, Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [Colors.white.withOpacity(0.18), Colors.white.withOpacity(0.0)],
      ).createShader(Rect.fromLTWH(0, 0, w, h))
      ..style = PaintingStyle.fill);

    // Line
    canvas.drawPath(path, Paint()
      ..color = Colors.white.withOpacity(0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round);
  }

  @override
  bool shouldRepaint(_SparklinePainter old) => old.history != history;
}

// ── Bar trend chart ───────────────────────────────────────────────────────────

class _BarTrendChart extends StatelessWidget {
  final List<NetWorthEntry> history;
  const _BarTrendChart({required this.history});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _BarTrendPainter(history),
      size: const Size(double.infinity, 140),
    );
  }
}

class _BarTrendPainter extends CustomPainter {
  final List<NetWorthEntry> history;
  _BarTrendPainter(this.history);

  @override
  void paint(Canvas canvas, Size size) {
    if (history.isEmpty) return;

    final netValues = history.map((e) => e.netWorth).toList();
    final maxV = netValues.reduce(math.max);
    final minV = netValues.reduce(math.min);
    final range = (maxV - minV).abs();
    final n = history.length;
    final barW = (size.width / n) * 0.55;
    final gap = size.width / n;
    final chartH = size.height - 18; // leave room for labels

    final posColor = const Color(0xFF34D399);
    final negColor = const Color(0xFFFB7185);
    final labelStyle = const TextStyle(fontSize: 9, color: Color(0xFF5B6573));
    final zeroPct = range < 0.01 ? 0.5 : minV < 0 ? (-minV) / range : 0.0;
    final zeroY = chartH * (1 - zeroPct.clamp(0.0, 1.0));

    for (int i = 0; i < n; i++) {
      final v = netValues[i];
      final x = gap * i + (gap - barW) / 2;
      final pct = range < 0.01 ? 0.0 : (v - minV) / range;
      final barH = (pct * chartH * 0.85).clamp(2.0, chartH * 0.85);
      final top = zeroY - (v >= 0 ? barH : 0);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, top, barW, barH),
        const Radius.circular(3),
      );
      canvas.drawRRect(rect, Paint()..color = (v >= 0 ? posColor : negColor).withOpacity(0.7));

      // Month label
      final tp = TextPainter(
        text: TextSpan(text: history[i].month, style: labelStyle),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(x + (barW - tp.width) / 2, chartH + 4));
    }
  }

  @override
  bool shouldRepaint(_BarTrendPainter old) => old.history != history;
}

// ── Split card ────────────────────────────────────────────────────────────────

class _SplitCard extends StatelessWidget {
  final String label;
  final double value;
  final Color color;
  final IconData icon;
  const _SplitCard({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NestColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NestColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, color: NestColors.text4)),
        ]),
        const SizedBox(height: 8),
        Text(
          formatCurrency(value),
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: color, fontFamily: 'InterTight'),
        ),
      ]),
    );
  }
}
