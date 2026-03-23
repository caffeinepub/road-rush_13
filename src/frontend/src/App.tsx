import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import GameOverScreen from "./components/GameOverScreen";
import GameScreen from "./components/GameScreen";
import LeaderboardScreen from "./components/LeaderboardScreen";
import MenuScreen from "./components/MenuScreen";

const queryClient = new QueryClient();

export type Screen = "menu" | "game" | "gameover" | "leaderboard";

function GameApp() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [finalScore, setFinalScore] = useState(0);

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setScreen("gameover");
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-background">
      {screen === "menu" && (
        <MenuScreen
          onPlay={() => setScreen("game")}
          onLeaderboard={() => setScreen("leaderboard")}
        />
      )}
      {screen === "game" && (
        <GameScreen
          onGameOver={handleGameOver}
          onMenu={() => setScreen("menu")}
        />
      )}
      {screen === "gameover" && (
        <GameOverScreen
          score={finalScore}
          onPlayAgain={() => setScreen("game")}
          onMenu={() => setScreen("menu")}
          onLeaderboard={() => setScreen("leaderboard")}
        />
      )}
      {screen === "leaderboard" && (
        <LeaderboardScreen onBack={() => setScreen("menu")} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameApp />
    </QueryClientProvider>
  );
}
