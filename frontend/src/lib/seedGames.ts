import type { Game } from '../backend';

interface SeedGame {
  title: string;
  description: string;
  category: string;
  thumbnail: string;
}

export const seedGamesData: SeedGame[] = [
  {
    title: 'GD Runner',
    description: 'An auto-scrolling platformer inspired by Geometry Dash. Jump over spikes and obstacles as the speed increases!',
    category: 'Arcade',
    thumbnail: 'gd-runner-thumb.dim_400x300.png',
  },
  {
    title: 'Snake',
    description: 'The classic Snake game with a neon cyberpunk twist. Eat food, grow longer, and avoid hitting yourself!',
    category: 'Arcade',
    thumbnail: 'snake-thumb.dim_400x300.png',
  },
  {
    title: 'Flappy Bird',
    description: 'Navigate your bird through endless pipe obstacles. One tap to flap, infinite challenge!',
    category: 'Arcade',
    thumbnail: 'flappy-bird-thumb.dim_400x300.png',
  },
  {
    title: 'Breakout',
    description: 'Smash through colorful bricks with your paddle and ball. Clear all bricks to win!',
    category: 'Arcade',
    thumbnail: 'breakout-thumb.dim_400x300.png',
  },
  {
    title: '2048',
    description: 'Slide and merge tiles to reach the legendary 2048 tile. A deceptively simple puzzle game!',
    category: 'Puzzle',
    thumbnail: '2048-thumb.dim_400x300.png',
  },
  {
    title: 'Tetris',
    description: 'The legendary block-stacking puzzle game. Clear lines, level up, and survive as long as you can!',
    category: 'Puzzle',
    thumbnail: 'tetris-thumb.dim_400x300.png',
  },
  {
    title: 'Pac-Man',
    description: 'Navigate the maze, eat all the dots, and avoid the ghosts. Grab power pellets to turn the tables!',
    category: 'Arcade',
    thumbnail: 'pac-man-thumb.dim_400x300.png',
  },
  {
    title: 'Space Invaders',
    description: 'Defend Earth from waves of alien invaders. Shoot them down before they reach the ground!',
    category: 'Arcade',
    thumbnail: 'space-invaders-thumb.dim_400x300.png',
  },
  {
    title: 'Swords & Sandals',
    description: 'Enter the gladiator arena in this turn-based combat RPG. Attack, block, and use special moves to defeat your opponent!',
    category: 'RPG',
    thumbnail: 'swords-sandals-thumb.dim_400x300.png',
  },
  {
    title: 'Among Us',
    description: 'Complete tasks as a crewmate or eliminate everyone as the impostor. Can you survive the vote?',
    category: 'Social',
    thumbnail: 'among-us-thumb.dim_400x300.png',
  },
  {
    title: 'Tung Tung Tung',
    description: 'Click the neon drum as fast as you can! Build combos and rack up the highest score in this addictive clicker!',
    category: 'Clicker',
    thumbnail: 'tung-tung-tung-thumb.dim_400x300.png',
  },
  {
    title: 'Block Blast',
    description: 'Place polyomino blocks on the grid to fill and clear rows and columns. How long can you keep the board clear?',
    category: 'Puzzle',
    thumbnail: 'block-blast-thumb.dim_400x300.png',
  },
  {
    title: '67 Clicker',
    description: 'Click the iconic six seven meme to rack up points! Build combos with rapid clicks and chase the ultimate high score.',
    category: 'Clicker',
    thumbnail: '67-clicker.dim_256x256.png',
  },
];

export async function seedInitialGames(
  getAllGames: () => Promise<Game[]>,
  addGame: (title: string, description: string, category: string, thumbnail: string) => Promise<void>
): Promise<void> {
  try {
    const existingGames = await getAllGames();
    const existingTitles = new Set(existingGames.map((g) => g.title));

    for (const game of seedGamesData) {
      if (!existingTitles.has(game.title)) {
        try {
          await addGame(game.title, game.description, game.category, game.thumbnail);
        } catch (err) {
          console.warn(`Failed to seed game "${game.title}":`, err);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to seed games:', err);
  }
}
