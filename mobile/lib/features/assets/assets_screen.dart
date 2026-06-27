import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import 'update_value_sheet.dart';

final _assetsProvider = FutureProvider.autoDispose<List<AssetDto>>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;
  return api.getAssets(wsId);
});

const _assetTypeLabels = [
  'Real Estate', 'Vehicle', 'Electronics', 'Valuables', // Physical 0-3
  'Savings', 'Investment', 'Crypto', 'Business', 'Loan Given', 'Other', // Financial 4-9
];
const _assetTypeIcons = [
  Icons.home_outlined,
  Icons.directions_car_outlined,
  Icons.devices_outlined,
  Icons.diamond_outlined,
  Icons.savings_outlined,
  Icons.trending_up_outlined,
  Icons.currency_bitcoin,
  Icons.business_outlined,
  Icons.handshake_outlined,
  Icons.more_horiz,
];
const _assetTypeColors = [
  Color(0xFF6366F1), // Real Estate — indigo
  Color(0xFF2DD4BF), // Vehicle — teal
  Color(0xFF38BDF8), // Electronics — sky
  Color(0xFFA78BFA), // Valuables — violet
  Color(0xFF34D399), // Savings — green
  Color(0xFFFBBF24), // Investment — amber
  Color(0xFFF97316), // Crypto — orange
  Color(0xFF818CF8), // Business — indigo-light
  Color(0xFFFB7185), // Loan Given — pink
  Color(0xFF98A2B3), // Other — muted
];

class AssetsScreen extends ConsumerWidget {
  const AssetsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(_assetsProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: NestColors.text1),
        title: const Text('Assets', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 18, color: NestColors.text1)),
        backgroundColor: NestColors.base,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_assetsProvider.future),
        child: dataAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5)),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 40),
              const SizedBox(height: 12),
              Text(e.toString(), style: const TextStyle(color: NestColors.text3, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(onPressed: () => ref.refresh(_assetsProvider), child: const Text('Retry', style: TextStyle(color: NestColors.indigoL))),
            ]),
          ),
          data: (assets) => _AssetList(assets: assets),
        ),
      ),
    );
  }
}

class _AssetList extends ConsumerWidget {
  final List<AssetDto> assets;
  const _AssetList({required this.assets});

  Future<void> _openUpdateSheet(BuildContext context, WidgetRef ref, AssetDto asset) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => UpdateValueSheet(asset: asset),
    );
    if (saved == true) ref.invalidate(_assetsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (assets.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.diamond_outlined, size: 48, color: NestColors.text4),
          SizedBox(height: 16),
          Text('No assets yet', style: TextStyle(color: NestColors.text2, fontSize: 15, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('Add assets on the web app to get started.', style: TextStyle(color: NestColors.text4, fontSize: 13)),
        ]),
      );
    }

    final totalValue = assets.fold(0.0, (s, a) => s + a.currentValue);
    final physicalTotal = assets.where((a) => a.assetClass == 0).fold(0.0, (s, a) => s + a.currentValue);
    final financialTotal = assets.where((a) => a.assetClass == 1).fold(0.0, (s, a) => s + a.currentValue);

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF3B3FBB), Color(0xFF1A9B8A)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Total Assets', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white70)),
                const SizedBox(height: 6),
                Text(
                  formatCurrency(totalValue),
                  style: const TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 30, color: Colors.white),
                ),
                const SizedBox(height: 14),
                Row(children: [
                  _HeroStat(label: 'Physical', value: formatCurrency(physicalTotal), color: NestColors.indigoL),
                  const SizedBox(width: 24),
                  _HeroStat(label: 'Financial', value: formatCurrency(financialTotal), color: NestColors.teal),
                ]),
              ]),
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, i) => _AssetTile(
              asset: assets[i],
              onUpdateTap: () => _openUpdateSheet(context, ref, assets[i]),
            ),
            childCount: assets.length,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    );
  }
}

class _AssetTile extends StatelessWidget {
  final AssetDto asset;
  final VoidCallback onUpdateTap;
  const _AssetTile({required this.asset, required this.onUpdateTap});

  @override
  Widget build(BuildContext context) {
    final typeIdx = asset.assetType.clamp(0, _assetTypeLabels.length - 1);
    final color = _assetTypeColors[typeIdx];
    final hasGain = asset.purchasePrice != null && asset.purchasePrice! > 0;
    final gainLoss = hasGain ? asset.currentValue - asset.purchasePrice! : null;
    final gainPct = hasGain ? (gainLoss! / asset.purchasePrice!) * 100 : null;
    final isGain = gainLoss != null && gainLoss >= 0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NestColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: NestColors.border),
        ),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: color.withOpacity(0.14), borderRadius: BorderRadius.circular(12)),
            child: Icon(_assetTypeIcons[typeIdx], color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(asset.name, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: NestColors.text1)),
            Text(
              '${_assetTypeLabels[typeIdx]}${asset.institution != null ? " · ${asset.institution}" : ""}',
              style: const TextStyle(fontSize: 11.5, color: NestColors.text4),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
          ])),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(
              formatCurrency(asset.currentValue),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: NestColors.text1, fontFamily: 'InterTight'),
            ),
            if (gainLoss != null)
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: (isGain ? NestColors.income : NestColors.expense).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  '${isGain ? "+" : ""}${gainPct!.toStringAsFixed(1)}%',
                  style: TextStyle(
                    fontSize: 10.5, fontWeight: FontWeight.w600,
                    color: isGain ? NestColors.income : NestColors.expense,
                  ),
                ),
              ),
            const SizedBox(height: 4),
            GestureDetector(
              onTap: onUpdateTap,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: NestColors.teal.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: NestColors.teal.withOpacity(0.25)),
                ),
                child: const Text('Update', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: NestColors.teal)),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _HeroStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, color: Colors.white60)),
      const SizedBox(height: 2),
      Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color, fontFamily: 'InterTight')),
    ]);
  }
}
