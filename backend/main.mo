import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import MixinStorage "blob-storage/Mixin";



actor {
  include MixinStorage();

  type Game = {
    title : Text;
    description : Text;
    category : Text;
    thumbnail : Text;
    playCount : Nat;
  };

  module Game {
    public func compare(game1 : Game, game2 : Game) : Order.Order {
      Text.compare(game1.title, game2.title);
    };

    public func compareByCategory(game1 : Game, game2 : Game) : Order.Order {
      Text.compare(game1.category, game2.category);
    };

    public func compareByPlayCount(game1 : Game, game2 : Game) : Order.Order {
      if (game1.playCount < game2.playCount) { #less } else if (game1.playCount > game2.playCount) {
        #greater;
      } else { #equal };
    };
  };

  let games = Map.empty<Text, Game>();

  public shared ({ caller }) func addGame(title : Text, description : Text, category : Text, thumbnail : Text) : async () {
    let game : Game = {
      title;
      description;
      category;
      thumbnail;
      playCount = 0;
    };
    games.add(title, game);
  };

  public query ({ caller }) func getAllGames() : async [Game] {
    games.values().toArray().sort();
  };

  public query ({ caller }) func getGamesByCategory(category : Text) : async [Game] {
    games.values().toArray().filter(func(g) { g.category == category }).sort(Game.compareByPlayCount);
  };

  public shared ({ caller }) func incrementPlayCount(title : Text) : async () {
    let game = switch (games.get(title)) {
      case (null) { Runtime.trap("Game does not exist") };
      case (?game) { game };
    };
    games.add(title, { game with playCount = game.playCount + 1 });
  };

  public query ({ caller }) func getMostPopularGames(limit : Nat) : async [Game] {
    games.values().toArray().sort(Game.compareByPlayCount).sliceToArray(0, limit);
  };

  public query ({ caller }) func getGameByTitle(title : Text) : async ?Game {
    games.get(title);
  };

  public shared ({ caller }) func deleteGame(title : Text) : async () {
    let _ = getGameByTitle(title);
    games.remove(title);
  };
};
