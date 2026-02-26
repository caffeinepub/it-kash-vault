import type { Game } from '../backend';

interface SeedGame {
  title: string;
  description: string;
  category: string;
  thumbnail: string;
}

export const seedGamesData: SeedGame[] = [
  {
    title: 'Whack-a-Mole',
    description: 'Whack the moles as fast as you can! Moles pop up randomly — click them before they disappear. 30 seconds on the clock!',
    category: 'Arcade',
    thumbnail: 'whack-a-mole-thumb.dim_400x300.png',
  },
  {
    title: 'Dino Runner',
    description: 'An endless runner where you guide a pixel dinosaur through a desert of cacti. Jump to survive and beat your high score!',
    category: 'Arcade',
    thumbnail: 'dino-runner-thumb.dim_400x300.png',
  },
  {
    title: 'Pong',
    description: 'The classic two-player paddle game. First to 7 points wins! Use W/S and Arrow keys to control your paddles.',
    category: 'Arcade',
    thumbnail: 'pong-thumb.dim_400x300.png',
  },
  {
    title: 'Memory Match',
    description: 'Flip cards to find matching pairs. Test your memory with 16 cards and 8 pairs. Track your moves and time!',
    category: 'Puzzle',
    thumbnail: 'memory-match-thumb.dim_400x300.png',
  },
  {
    title: 'Asteroids',
    description: 'Pilot your spaceship through an asteroid field. Shoot to split and destroy asteroids before they destroy you!',
    category: 'Shooter',
    thumbnail: 'asteroids-thumb.dim_400x300.png',
  },
  {
    title: 'Minesweeper',
    description: 'Reveal the grid without hitting a mine. Use logic to flag dangerous cells and clear the board to win!',
    category: 'Puzzle',
    thumbnail: 'minesweeper-thumb.dim_400x300.png',
  },
  {
    title: 'Swords & Sandals',
    description: 'Battle as a gladiator in turn-based arena combat against an AI opponent. Attack, block, and unleash special moves to claim victory!',
    category: 'RPG',
    thumbnail: 'swords-sandals.dim_400x300.png',
  },
  {
    title: 'Retro Bowl',
    description: 'Lead your team to glory in this retro-style American football game. Call plays, throw passes, and score touchdowns across 4 quarters!',
    category: 'Sports',
    thumbnail: 'retro-bowl.png',
  },
];

export async function seedInitialGames(
  getAllGames: () => Promise<Game[]>,
  addGame: (title: string, description: string, category: string, thumbnail: string) => Promise<void>
): Promise<void> {
  let existingTitles: Set<string>;

  try {
    const existingGames = await getAllGames();
    existingTitles = new Set(existingGames.map((g) => g.title));
    console.log(`[Seed] Found ${existingGames.length} existing games.`);
  } catch (err) {
    console.error('[Seed] Failed to fetch existing games:', err);
    existingTitles = new Set();
  }

  let added = 0;
  let skipped = 0;

  for (const game of seedGamesData) {
    if (existingTitles.has(game.title)) {
      skipped++;
      continue;
    }
    try {
      await addGame(game.title, game.description, game.category, game.thumbnail);
      console.log(`[Seed] Added game: "${game.title}"`);
      added++;
    } catch (err) {
      console.error(`[Seed] Failed to add game "${game.title}":`, err);
    }
  }

  console.log(`[Seed] Done. Added: ${added}, Skipped (already exist): ${skipped}`);
}
