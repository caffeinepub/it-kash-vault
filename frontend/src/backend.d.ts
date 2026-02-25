import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Game {
    title: string;
    thumbnail: string;
    description: string;
    playCount: bigint;
    category: string;
}
export interface backendInterface {
    addGame(title: string, description: string, category: string, thumbnail: string): Promise<void>;
    deleteGame(title: string): Promise<void>;
    getAllGames(): Promise<Array<Game>>;
    getGameByTitle(title: string): Promise<Game | null>;
    getGamesByCategory(category: string): Promise<Array<Game>>;
    getMostPopularGames(limit: bigint): Promise<Array<Game>>;
    incrementPlayCount(title: string): Promise<void>;
}
