import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Loader2, RotateCcw, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubmitScore } from "../hooks/useQueries";

interface GameOverScreenProps {
  score: number;
  onPlayAgain: () => void;
  onMenu: () => void;
  onLeaderboard: () => void;
}

export default function GameOverScreen({
  score,
  onPlayAgain,
  onMenu,
  onLeaderboard,
}: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { mutate: submitScore, isPending } = useSubmitScore();

  const handleSubmit = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    submitScore(
      { playerName: playerName.trim(), score },
      {
        onSuccess: () => {
          setSubmitted(true);
          toast.success("Score submitted!");
        },
        onError: () => {
          toast.error("Failed to submit score. Try again.");
        },
      },
    );
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-8 px-4"
      style={{
        background: "linear-gradient(180deg, #0e1928 0%, #070d16 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "backOut" }}
        className="flex flex-col items-center gap-6 w-full max-w-md"
      >
        {/* Game Over text */}
        <div className="text-center">
          <h1 className="font-display font-extrabold text-5xl md:text-7xl uppercase tracking-widest text-foreground">
            GAME OVER
          </h1>
          <p className="text-muted-foreground mt-2">You ran out of road!</p>
        </div>

        {/* Score card */}
        <div
          className="w-full rounded-2xl p-6 text-center"
          style={{
            background: "#0f1a28",
            border: "1px solid oklch(0.22 0.04 242)",
          }}
        >
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">
            Final Score
          </p>
          <p
            data-ocid="gameover.score.panel"
            className="font-display font-extrabold text-6xl"
            style={{ color: "oklch(0.74 0.175 65)" }}
          >
            {score.toLocaleString()}
          </p>
        </div>

        {/* Submit score */}
        {!submitted ? (
          <div className="w-full flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Enter your name to save your score
            </p>
            <Input
              data-ocid="gameover.name.input"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              maxLength={20}
              className="bg-secondary border-border text-center text-lg"
            />
            <Button
              data-ocid="gameover.submit.primary_button"
              onClick={handleSubmit}
              disabled={isPending || !playerName.trim()}
              className="w-full py-3 font-bold text-lg"
              style={{ background: "oklch(0.74 0.175 65)", color: "#070d16" }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Submitting...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-2" /> Submit Score
                </>
              )}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <Button
              data-ocid="gameover.leaderboard.secondary_button"
              onClick={onLeaderboard}
              variant="outline"
              className="w-full py-3 font-bold"
            >
              <Trophy className="w-4 h-4 mr-2" /> View Leaderboard
            </Button>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <Button
            data-ocid="gameover.play_again.primary_button"
            onClick={onPlayAgain}
            className="flex-1 py-3 font-bold"
            style={{ background: "oklch(0.74 0.175 65)", color: "#070d16" }}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Play Again
          </Button>
          <Button
            data-ocid="gameover.menu.secondary_button"
            onClick={onMenu}
            variant="outline"
            className="flex-1 py-3 font-bold"
          >
            <Home className="w-4 h-4 mr-2" /> Menu
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
