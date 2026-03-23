import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";

actor {
  type ScoreEntry = {
    playerName : Text;
    score : Nat;
  };

  module ScoreEntry {
    public func compare(score1 : ScoreEntry, score2 : ScoreEntry) : Order.Order {
      Nat.compare(score2.score, score1.score);
    };
  };

  let scores = Map.empty<Text, ScoreEntry>();

  public shared ({ caller }) func submitScore(playerName : Text, score : Nat) : async () {
    if (playerName.isEmpty()) {
      Runtime.trap("Player name cannot be empty");
    };

    scores.add(playerName, { playerName; score });
  };

  public query ({ caller }) func getTopScores() : async [ScoreEntry] {
    let sortedScores = scores.entries().toArray().sort(
      func(a, b) { ScoreEntry.compare(a.1, b.1) }
    );

    let scoreList = List.empty<ScoreEntry>();
    var count = 0;
    for ((playerName, score) in sortedScores.values()) {
      scoreList.add(score);
      count += 1;
      if (count >= 10) { return scoreList.toArray() };
    };

    scoreList.toArray();
  };

  public query ({ caller }) func getBestScore(playerName : Text) : async ?ScoreEntry {
    if (playerName.isEmpty()) {
      Runtime.trap("Player name cannot be empty");
    };

    scores.get(playerName);
  };
};
