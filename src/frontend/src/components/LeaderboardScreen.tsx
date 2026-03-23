import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useTopScores } from "../hooks/useQueries";

interface LeaderboardScreenProps {
  onBack: () => void;
}

const RANK_COLORS = ["#f59a23", "#c0c0c0", "#cd7f32"];
const RANK_BG = [
  "rgba(245,154,35,0.1)",
  "rgba(192,192,192,0.08)",
  "rgba(205,127,50,0.08)",
];

export default function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { data: scores, isLoading, isError } = useTopScores();

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0e1928 0%, #070d16 100%)",
      }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-4 px-6 py-4 border-b border-border/50"
        style={{ background: "#121c2a" }}
      >
        <Button
          data-ocid="leaderboard.back.button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Trophy style={{ color: "oklch(0.74 0.175 65)" }} className="w-6 h-6" />
        <h1 className="font-display font-bold text-xl uppercase tracking-widest">
          Leaderboard
        </h1>
      </header>

      <main className="flex-1 overflow-auto py-8 px-4">
        <div className="max-w-lg mx-auto">
          {isLoading && (
            <div
              data-ocid="leaderboard.loading_state"
              className="flex justify-center py-20"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {isError && (
            <div
              data-ocid="leaderboard.error_state"
              className="text-center py-20 text-destructive"
            >
              <p>Failed to load scores. Please try again.</p>
            </div>
          )}

          {!isLoading && !isError && scores && scores.length === 0 && (
            <div
              data-ocid="leaderboard.empty_state"
              className="text-center py-20 text-muted-foreground"
            >
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No scores yet. Be the first!</p>
            </div>
          )}

          {!isLoading && scores && scores.length > 0 && (
            <div data-ocid="leaderboard.table" className="flex flex-col gap-2">
              {scores.slice(0, 10).map((entry, index) => (
                <motion.div
                  // biome-ignore lint/suspicious/noArrayIndexKey: leaderboard is sorted by score, index is stable
                  key={index}
                  data-ocid={`leaderboard.item.${index + 1}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl"
                  style={{
                    background: index < 3 ? RANK_BG[index] : "#0f1a28",
                    border: `1px solid ${index < 3 ? `${RANK_COLORS[index]}40` : "oklch(0.22 0.04 242)"}`,
                  }}
                >
                  {/* Rank */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
                    style={{
                      background:
                        index < 3
                          ? `${RANK_COLORS[index]}20`
                          : "rgba(255,255,255,0.05)",
                      color: index < 3 ? RANK_COLORS[index] : "#a9b3c2",
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Name */}
                  <div className="flex-1 font-medium text-foreground truncate">
                    {entry.playerName}
                  </div>

                  {/* Score */}
                  <div
                    className="font-display font-bold text-xl flex-shrink-0"
                    style={{
                      color:
                        index < 3
                          ? RANK_COLORS[index]
                          : "oklch(0.96 0.008 240)",
                    }}
                  >
                    {Number(entry.score).toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground/60">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
