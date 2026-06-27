"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatMoney, MoneyDto } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";

const ASSET_CLASS_LABELS = ["Physical", "Financial"];
const ASSET_TYPE_LABELS = [
  "Real Estate", "Vehicle", "Electronics", "Valuables",
  "Savings", "Investment", "Crypto", "Business", "Loan Given", "Other",
];
const ASSET_TYPE_ICONS = [
  "home", "directions_car", "devices", "diamond",
  "savings", "trending_up", "currency_bitcoin", "business_center", "handshake", "category",
];
const ASSET_TYPE_COLORS = [
  "#6366F1", "#FBBF24", "#38BDF8", "#A78BFA",
  "#34D399", "#2DD4BF", "#F97316", "#818CF8", "#FB7185", "#98A2B3",
];

interface Asset {
  id: string;
  name: string;
  description?: string;
  assetClass: number;
  assetType: number;
  currentValue: MoneyDto;
  purchaseDate?: string;
  purchasePrice?: MoneyDto;
  institution?: string;
  condition?: string;
  location?: string;
  isShared: boolean;
  notes?: string;
  createdAt: string;
  currentValueUpdatedAt?: string;
}

interface AssetCardProps {
  asset: Asset;
  onDelete: (id: string) => void;
  onUpdateValue: (asset: Asset) => void;
}

function AssetCard({ asset, onDelete, onUpdateValue }: AssetCardProps) {
  const [confirming, setConfirming] = useState(false);
  const color = ASSET_TYPE_COLORS[asset.assetType] ?? "#98A2B3";
  const icon = ASSET_TYPE_ICONS[asset.assetType] ?? "category";
  const gain = asset.purchasePrice != null ? asset.currentValue.amount - asset.purchasePrice.amount : null;
  const gainPct = gain != null && asset.purchasePrice ? (gain / asset.purchasePrice.amount) * 100 : null;

  return (
    <div
      className="p-5 rounded-[18px] flex flex-col gap-4"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}22` }}
          >
            <Icon name={icon} size={21} weight={400} style={{ color }} />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#EEF1F6] leading-tight">{asset.name}</div>
            <div className="text-[11.5px] text-[#5B6573] mt-0.5">
              {ASSET_TYPE_LABELS[asset.assetType]} · {ASSET_CLASS_LABELS[asset.assetClass]}
              {asset.isShared && " · Shared"}
            </div>
          </div>
        </div>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="w-7 h-7 flex items-center justify-center rounded-[8px] hover:bg-[rgba(251,113,133,0.14)] transition-colors flex-shrink-0"
            style={{ color: "#5B6573" }}
          >
            <Icon name="delete" size={15} />
          </button>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onDelete(asset.id)}
              className="px-2 py-1 rounded-[7px] text-[11px] font-semibold"
              style={{ background: "rgba(251,113,133,0.18)", color: "#FB7185" }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2 py-1 rounded-[7px] text-[11px] text-[#5B6573]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="text-[22px] font-[700] tabular leading-tight" style={{ fontFamily: "'Inter Tight'", color }}>
          {formatMoney(asset.currentValue)}
        </div>
        {gain != null && (
          <div
            className="text-[11.5px] font-medium mt-0.5"
            style={{ color: gain >= 0 ? "#34D399" : "#FB7185" }}
          >
            {gain >= 0 ? "+" : ""}{formatMoney({ ...asset.currentValue, amount: gain })}
            {gainPct != null && ` (${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}%)`}
            {" from purchase"}
          </div>
        )}
        {asset.institution && (
          <div className="text-[11.5px] text-[#5B6573] mt-1">{asset.institution}</div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onUpdateValue(asset)}
          className="flex items-center justify-center gap-2 flex-1 py-[8px] rounded-[10px] text-[12.5px] font-semibold transition-colors hover:opacity-80"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
        >
          <Icon name="edit" size={14} weight={400} />
          Update value
        </button>
        <Link
          href={`/assets/${asset.id}`}
          className="flex items-center justify-center gap-1.5 px-3 py-[8px] rounded-[10px] text-[12.5px] font-semibold transition-colors hover:opacity-80 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", color: "#98A2B3", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Icon name="open_in_new" size={13} />
          Details
        </Link>
      </div>
    </div>
  );
}

interface FormState {
  name: string;
  assetClass: string;
  assetType: string;
  currentValue: string;
  currency: string;
  purchasePrice: string;
  purchaseDate: string;
  institution: string;
  condition: string;
  location: string;
  isShared: boolean;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  name: "", assetClass: "0", assetType: "0", currentValue: "", currency: "USD",
  purchasePrice: "", purchaseDate: "", institution: "", condition: "", location: "",
  isShared: false, notes: "",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [valueDrawerAsset, setValueDrawerAsset] = useState<Asset | null>(null);
  const [newValue, setNewValue] = useState("");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = getWorkspaceId();
  const base = `/api/workspaces/${workspaceId}`;

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.get<Asset[]>(`${base}/assets`)
      .then(setAssets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, base]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(`${base}/assets`, {
        name: form.name,
        description: undefined,
        assetClass: parseInt(form.assetClass),
        assetType: parseInt(form.assetType),
        currentValue: parseFloat(form.currentValue),
        currency: form.currency,
        purchaseDate: form.purchaseDate || undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        purchaseCurrency: form.currency,
        institution: form.institution || undefined,
        condition: form.condition || undefined,
        location: form.location || undefined,
        isShared: form.isShared,
        notes: form.notes || undefined,
      });
      setDrawerOpen(false);
      setForm(DEFAULT_FORM);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create asset.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateValue(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !valueDrawerAsset) return;
    setSaving(true);
    try {
      await api.post(`${base}/assets/${valueDrawerAsset.id}/value`, { value: parseFloat(newValue) });
      setValueDrawerAsset(null);
      setNewValue("");
      load();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!workspaceId) return;
    try {
      await api.delete(`${base}/assets/${id}`);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  }

  const isPhysical = parseInt(form.assetClass) === 0;
  const totalValue = assets.reduce((s, a) => s + a.currentValue.amount, 0);
  const defaultMoney = assets[0]?.currentValue ?? { amount: 0, currencyCode: "USD" };
  const byType = ASSET_TYPE_LABELS.map((label, i) => ({
    label, count: assets.filter((a) => a.assetType === i).length,
    value: assets.filter((a) => a.assetType === i).reduce((s, a) => s + a.currentValue.amount, 0),
    color: ASSET_TYPE_COLORS[i],
  })).filter((t) => t.count > 0);

  const actions = (
    <button
      onClick={() => { setForm(DEFAULT_FORM); setError(null); setDrawerOpen(true); }}
      className="flex items-center gap-[7px] px-[15px] py-[9px] rounded-[10px] text-[13px] font-semibold"
      style={{ background: "#6366F1", color: "#0B0E14", boxShadow: "0 6px 18px rgba(99,102,241,0.35)", border: "none", cursor: "pointer" }}
    >
      <Icon name="add" size={18} weight={500} />
      Add asset
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Assets" subtitle="Track what you own." actions={actions} />

      <div className="flex-1 overflow-auto p-7">
        {assets.length > 0 && (
          <div className="rounded-[20px] p-5 mb-7 flex items-center gap-6"
            style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(45,212,191,0.10))", border: "1px solid rgba(99,102,241,0.20)" }}>
            <div className="flex-1">
              <div className="text-[12px] text-[#98A2B3] mb-1">Total Assets</div>
              <div className="text-[32px] font-[800] tabular" style={{ fontFamily: "'Inter Tight'", color: "#34D399" }}>
                {formatMoney({ ...defaultMoney, amount: totalValue })}
              </div>
              <div className="text-[12px] text-[#5B6573] mt-1">{assets.length} asset{assets.length !== 1 ? "s" : ""}</div>
            </div>
            {byType.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {byType.map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    <span className="text-[11.5px] text-[#98A2B3]">{t.label}</span>
                    <span className="text-[11.5px] font-semibold tabular ml-auto" style={{ color: t.color }}>{formatMoney({ ...defaultMoney, amount: t.value })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#5B6573]">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              <span className="text-[13px]">Loading assets…</span>
            </div>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Icon name="diamond" size={28} className="text-[#818CF8]" />
            </div>
            <div className="text-[15px] font-semibold text-[#C4CBD6]">No assets yet</div>
            <div className="text-[13px] text-[#4B5462] mt-1 mb-5">Add your properties, investments, and more.</div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] text-[13px] font-semibold"
              style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: "pointer" }}
            >
              <Icon name="add" size={17} weight={500} />
              Add first asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {assets.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                onDelete={handleDelete}
                onUpdateValue={(asset) => { setValueDrawerAsset(asset); setNewValue(String(asset.currentValue)); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Asset Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setError(null); }}
        title="Add asset"
        footer={
          <button
            form="asset-form"
            type="submit"
            disabled={saving}
            className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60"
            style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Adding…" : "Add asset"}
          </button>
        }
      >
        <form id="asset-form" onSubmit={handleCreate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Name</label>
            <input
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required placeholder="e.g. My Apartment"
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Class</label>
              <select
                value={form.assetClass}
                onChange={(e) => setForm((f) => ({ ...f, assetClass: e.target.value, assetType: "0" }))}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
              >
                <option value="0">Physical</option>
                <option value="1">Financial</option>
              </select>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Type</label>
              <select
                value={form.assetType}
                onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
              >
                {isPhysical
                  ? [0, 1, 2, 3, 9].map((i) => <option key={i} value={i}>{ASSET_TYPE_LABELS[i]}</option>)
                  : [4, 5, 6, 7, 8, 9].map((i) => <option key={i} value={i}>{ASSET_TYPE_LABELS[i]}</option>)
                }
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Current value</label>
              <input
                type="number" step="0.01" min="0"
                value={form.currentValue} onChange={(e) => setForm((f) => ({ ...f, currentValue: e.target.value }))}
                required placeholder="0.00"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Currency</label>
              <input
                value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 3) }))}
                placeholder="USD"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Purchase price</label>
              <input
                type="number" step="0.01" min="0"
                value={form.purchasePrice} onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                placeholder="Optional"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Purchase date</label>
              <input
                type="date"
                value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", colorScheme: "dark" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          {!isPhysical && (
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Institution / Broker</label>
              <input
                value={form.institution} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                placeholder="e.g. Fidelity, Coinbase"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          )}

          {isPhysical && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[6px]">
                <label className="text-[12.5px] font-semibold text-[#98A2B3]">Condition</label>
                <input
                  value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                  placeholder="e.g. Excellent"
                  className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                  style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />
              </div>
              <div className="flex flex-col gap-[6px]">
                <label className="text-[12.5px] font-semibold text-[#98A2B3]">Location</label>
                <input
                  value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Home"
                  className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                  style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.isShared ? "#6366F1" : "rgba(255,255,255,0.1)" }}
              onClick={() => setForm((f) => ({ ...f, isShared: !f.isShared }))}
            >
              <div
                className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-transform"
                style={{ background: "#EEF1F6", transform: form.isShared ? "translateX(18px)" : "translateX(3px)" }}
              />
            </div>
            <span className="text-[13.5px] font-medium">Shared asset</span>
          </label>

          {error && (
            <div className="text-[13px] text-[#FB7185] px-3 py-2 rounded-[9px]" style={{ background: "rgba(251,113,133,0.10)" }}>
              {error}
            </div>
          )}
        </form>
      </Drawer>

      {/* Update Value Drawer */}
      <Drawer
        open={valueDrawerAsset !== null}
        onClose={() => { setValueDrawerAsset(null); setNewValue(""); }}
        title={`Update value — ${valueDrawerAsset?.name ?? ""}`}
        footer={
          <button
            form="value-form"
            type="submit"
            disabled={saving}
            className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60"
            style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : "Save new value"}
          </button>
        }
      >
        <form id="value-form" onSubmit={handleUpdateValue} className="flex flex-col gap-5">
          {valueDrawerAsset && (
            <div className="text-[12.5px] text-[#5B6573]">
              Current: <span className="text-[#EEF1F6] font-semibold tabular">{formatMoney(valueDrawerAsset.currentValue)}</span>
            </div>
          )}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">New value</label>
            <input
              type="number" step="0.01" min="0"
              value={newValue} onChange={(e) => setNewValue(e.target.value)}
              required placeholder="0.00"
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
