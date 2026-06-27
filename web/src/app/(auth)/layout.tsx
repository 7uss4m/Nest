export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0B0E14" }}>
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366F1,#2DD4BF)" }}
          >
            <span className="font-[800] text-[22px]" style={{ fontFamily: "'Inter Tight'", color: "#0B0E14" }}>W</span>
          </div>
          <span className="font-[800] text-[24px] tracking-tight" style={{ fontFamily: "'Inter Tight'" }}>Nest</span>
        </div>
        {children}
      </div>
    </div>
  );
}
