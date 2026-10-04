/**
 * AppBackground
 *
 * Pure visual primitive. No authentication, routing, or business logic.
 *
 * Renders the Fernleaf Kitchen ambient background environment:
 *   - Warm parchment base (#f4f1e8)
 *   - Soft emerald + amber radial glows
 *   - Subtle technical grid
 *   - Concentric ring accents
 *   - Large Fernleaf brand leaf watermark on the right
 *   - Secondary botanical motifs and accent dots
 *
 * Usage:
 *   <AppBackground>
 *     <YourPage />
 *   </AppBackground>
 *
 * Variants:
 *   "default" — standard intensity
 *   "muted"   — lower-opacity decorations
 */

type AppBackgroundVariant = "default" | "muted";

interface AppBackgroundProps {
  children: React.ReactNode;
  variant?: AppBackgroundVariant;
  className?: string;
}

export function AppBackground({
  children,
  variant = "default",
  className = "",
}: AppBackgroundProps) {
  const isMuted = variant === "muted";

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden bg-[#f4f1e8] text-[#26352a] ${className}`}
    >
      {/* ================================================================ */}
      {/* FIXED BACKGROUND ENVIRONMENT                                    */}
      {/* ================================================================ */}

      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* ============================================================ */}
        {/* Layer 1 — Ambient radial glows                               */}
        {/* ============================================================ */}

        <div
          className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-[#dce7d7] blur-3xl"
          style={{
            opacity: isMuted ? 0.35 : 0.6,
          }}
        />

        <div
          className="absolute -bottom-48 -right-32 h-[620px] w-[620px] rounded-full bg-[#eadfc9] blur-3xl"
          style={{
            opacity: isMuted ? 0.4 : 0.7,
          }}
        />

        <div
          className="absolute right-[20%] top-[12%] h-[380px] w-[380px] rounded-full bg-[#d8e6d4] blur-3xl"
          style={{
            opacity: isMuted ? 0.22 : 0.38,
          }}
        />

        {/* ============================================================ */}
        {/* Layer 2 — Fine technical grid                                */}
        {/* ============================================================ */}

        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(#26352a 1px, transparent 1px), linear-gradient(90deg, #26352a 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            opacity: isMuted ? 0.02 : 0.035,
          }}
        />

        {/* ============================================================ */}
        {/* Layer 3 — Concentric ring accents                            */}
        {/* ============================================================ */}

        <div
          className="absolute left-[8%] top-[18%] h-32 w-32 rounded-full border border-[#315d3c]"
          style={{
            opacity: isMuted ? 0.05 : 0.1,
          }}
        />

        <div
          className="absolute left-[10%] top-[21%] h-20 w-20 rounded-full border border-[#315d3c]"
          style={{
            opacity: isMuted ? 0.05 : 0.1,
          }}
        />

        <div
          className="absolute bottom-[15%] right-[8%] h-48 w-48 rounded-full border border-[#b9965a]"
          style={{
            opacity: isMuted ? 0.07 : 0.15,
          }}
        />

        {/* ============================================================ */}
        {/* Layer 4 — LARGE FERNLEAF WATERMARK                           */}
        {/* ============================================================ */}

        {/*
          Large brand leaf.

          Intentionally oversized and partially outside the viewport.
          This gives the background a more editorial / premium feel
          instead of looking like a normal decorative illustration.

          The leaf is positioned on the RIGHT side and vertically
          centered so it remains visible while scrolling.
        */}

        <svg
          className="
            absolute
            -right-[210px]
            top-1/2
            h-[850px]
            w-[850px]
            -translate-y-1/2
            text-[#315d3c]
            transition-opacity
            duration-500

            sm:-right-[230px]
            sm:h-[900px]
            sm:w-[900px]

            lg:-right-[250px]
            lg:h-[1000px]
            lg:w-[1000px]

            xl:-right-[280px]
            xl:h-[1100px]
            xl:w-[1100px]
          "
          style={{
            opacity: isMuted ? 0.045 : 0.085,
          }}
          viewBox="0 0 500 500"
          fill="none"
        >
          {/* Main stem */}
          <path
            d="M120 470C120 470 155 320 225 225C275 158 315 115 365 65"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* ======================================================== */}
          {/* Lower left leaf                                            */}
          {/* ======================================================== */}

          <path
            d="M160 360C105 315 62 307 25 323C65 365 110 378 160 360Z"
            fill="currentColor"
          />

          {/* Lower right leaf */}
          <path
            d="M180 325C235 260 290 242 350 258C310 312 250 335 180 325Z"
            fill="currentColor"
          />

          {/* ======================================================== */}
          {/* Middle left leaf                                           */}
          {/* ======================================================== */}

          <path
            d="M205 275C160 220 120 198 78 204C108 253 155 283 205 275Z"
            fill="currentColor"
          />

          {/* Middle right leaf */}
          <path
            d="M225 250C280 195 330 180 385 193C350 238 295 260 225 250Z"
            fill="currentColor"
          />

          {/* ======================================================== */}
          {/* Upper left leaf                                            */}
          {/* ======================================================== */}

          <path
            d="M260 185C225 138 195 120 160 125C180 165 215 190 260 185Z"
            fill="currentColor"
          />

          {/* Upper right leaf */}
          <path
            d="M278 168C320 125 360 112 402 122C370 160 325 180 278 168Z"
            fill="currentColor"
          />

          {/* ======================================================== */}
          {/* Top leaf                                                   */}
          {/* ======================================================== */}

          <path
            d="M315 120C300 85 285 65 260 58C265 92 283 115 315 120Z"
            fill="currentColor"
          />

          {/* Small top-right leaf */}
          <path
            d="M330 105C355 78 382 72 408 80C386 105 358 115 330 105Z"
            fill="currentColor"
          />
        </svg>

        {/* ============================================================ */}
        {/* Large soft halo behind leaf                                  */}
        {/* ============================================================ */}

        <div
          className="
            absolute
            -right-[180px]
            top-1/2
            h-[650px]
            w-[650px]
            -translate-y-1/2
            rounded-full
            bg-[#dce7d7]
            blur-3xl
          "
          style={{
            opacity: isMuted ? 0.08 : 0.16,
          }}
        />

        {/* ============================================================ */}
        {/* Layer 5 — Top-right complementary botanical motif            */}
        {/* ============================================================ */}

        <svg
          className="
            absolute
            -right-16
            -top-16
            hidden
            h-[380px]
            w-[380px]
            rotate-45
            text-[#315d3c]
            sm:block
          "
          style={{
            opacity: isMuted ? 0.03 : 0.05,
          }}
          viewBox="0 0 500 500"
          fill="none"
        >
          <path
            d="M250 470C250 470 248 270 330 100"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <path
            d="M285 385C235 335 190 320 145 330C190 375 235 390 285 385Z"
            fill="currentColor"
          />

          <path
            d="M270 275C225 230 190 215 150 220C185 260 225 280 270 275Z"
            fill="currentColor"
          />

          <path
            d="M305 165C278 125 255 110 225 108C242 145 268 165 305 165Z"
            fill="currentColor"
          />

          <path
            d="M278 330C330 280 375 270 418 282C372 320 330 335 278 330Z"
            fill="currentColor"
          />

          <path
            d="M292 220C330 180 370 170 405 180C370 215 330 230 292 220Z"
            fill="currentColor"
          />
        </svg>

        {/* ============================================================ */}
        {/* Layer 6 — Bottom-left botanical motif                        */}
        {/* ============================================================ */}

        <svg
          className="
            absolute
            -bottom-24
            -left-28
            hidden
            h-[360px]
            w-[360px]
            -rotate-[20deg]
            text-[#b9965a]
            sm:block
          "
          style={{
            opacity: isMuted ? 0.035 : 0.055,
          }}
          viewBox="0 0 400 400"
          fill="none"
        >
          <path
            d="M200 380C200 380 198 210 260 70"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <path
            d="M225 305C185 265 155 255 120 265C155 300 185 310 225 305Z"
            fill="currentColor"
          />

          <path
            d="M235 235C270 200 300 192 330 200C300 230 265 242 235 235Z"
            fill="currentColor"
          />

          <path
            d="M218 178C185 145 162 135 132 140C155 168 180 180 218 178Z"
            fill="currentColor"
          />

          <path
            d="M240 130C265 105 290 100 315 110C290 135 262 144 240 130Z"
            fill="currentColor"
          />
        </svg>

        {/* ============================================================ */}
        {/* Layer 7 — Accent dots                                        */}
        {/* ============================================================ */}

        <div
          className="absolute left-[14%] top-[72%] h-2 w-2 rounded-full bg-[#b9965a]"
          style={{
            opacity: isMuted ? 0.25 : 0.4,
          }}
        />

        <div
          className="absolute left-[17%] top-[75%] h-1.5 w-1.5 rounded-full bg-[#315d3c]"
          style={{
            opacity: isMuted ? 0.18 : 0.3,
          }}
        />

        <div
          className="absolute right-[20%] top-[18%] h-2 w-2 rounded-full bg-[#b9965a]"
          style={{
            opacity: isMuted ? 0.25 : 0.4,
          }}
        />

        <div
          className="absolute right-[23%] top-[22%] h-1.5 w-1.5 rounded-full bg-[#315d3c]"
          style={{
            opacity: isMuted ? 0.15 : 0.25,
          }}
        />
      </div>

      {/* ================================================================ */}
      {/* CONTENT                                                          */}
      {/* ================================================================ */}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
