import { Car, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface MenuScreenProps {
  onPlay: () => void;
  onLeaderboard: () => void;
}

export default function MenuScreen({ onPlay, onLeaderboard }: MenuScreenProps) {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0e1928 0%, #070d16 100%)",
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b border-border/50"
        style={{ background: "#121c2a" }}
      >
        <div className="flex items-center gap-2">
          <Car className="text-primary w-7 h-7" />
          <span className="font-display font-800 text-xl tracking-widest text-foreground uppercase">
            Road Rush
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <button
            type="button"
            data-ocid="nav.leaderboard.link"
            onClick={onLeaderboard}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            Leaderboard
          </button>
          <button
            type="button"
            data-ocid="nav.play_now.button"
            onClick={onPlay}
            className="px-4 py-2 rounded-md text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Play Now
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
        {/* Hero image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-border/30"
          style={{
            boxShadow:
              "0 8px 60px rgba(0,0,0,0.6), 0 0 40px oklch(0.74 0.175 65 / 0.08)",
          }}
        >
          <img
            src="/assets/generated/road-rush-preview.dim_900x500.jpg"
            alt="Road Rush gameplay preview"
            className="w-full h-auto object-cover"
          />
        </motion.div>

        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-center flex flex-col items-center gap-4"
        >
          <h1 className="font-display font-extrabold text-6xl md:text-8xl tracking-widest uppercase text-foreground leading-none">
            ROAD <span style={{ color: "oklch(0.74 0.175 65)" }}>RUSH</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-medium">
            A 2D top-down car racing game
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              type="button"
              data-ocid="menu.play_now.primary_button"
              onClick={onPlay}
              className="px-10 py-4 rounded-xl font-display font-bold text-xl uppercase tracking-widest text-primary-foreground transition-all hover:scale-105 active:scale-95"
              style={{
                background: "oklch(0.74 0.175 65)",
                boxShadow: "0 0 30px oklch(0.74 0.175 65 / 0.4)",
              }}
            >
              PLAY NOW
            </button>
            <button
              type="button"
              data-ocid="menu.leaderboard.secondary_button"
              onClick={onLeaderboard}
              className="px-10 py-4 rounded-xl font-display font-bold text-xl uppercase tracking-widest border border-border/60 text-foreground hover:border-primary/60 hover:text-primary transition-all"
            >
              <Trophy className="inline-block w-5 h-5 mr-2" />
              Leaderboard
            </button>
          </div>
        </motion.div>

        {/* How to play */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex gap-6 text-sm text-muted-foreground flex-wrap justify-center"
        >
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-1 rounded bg-secondary text-foreground text-xs font-mono">
              ← →
            </kbd>
            or
            <kbd className="px-2 py-1 rounded bg-secondary text-foreground text-xs font-mono">
              A D
            </kbd>
            Move lanes
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-1 rounded bg-secondary text-foreground text-xs font-mono">
              ESC
            </kbd>
            Pause
          </span>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground/60 flex flex-col gap-1">
        <span>
          © {new Date().getFullYear()} · Created by Zoonide Afreed · Built with
          ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </span>
        <span className="text-muted-foreground/40">
          Special Thanks to: Nekib Ali, Rehana Sultana, Sumaiya Afreen &amp;
          Little Flower Public School
        </span>
      </footer>
    </div>
  );
}
