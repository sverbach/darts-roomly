import express, { Request, Response } from 'express';
import cors from "cors";
import { MongoClient, Db } from 'mongodb';
import { AddTurnRequest, CreateMatchRequest, DartPlayer, Match, Turn } from './models.js';
import { publicProcedure, router, createContext } from './trpc.js';
import * as trpcExpress from '@trpc/server/adapters/express';
import { z } from "zod";
import 'dotenv/config';
import { someMatch } from './some-match.js';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8082;

const MONGO_URI = process.env.MONGO_URI ?? '';
const DB_NAME = process.env.DB_NAME ?? '';
const DART_PLAYERS_COLLECTION_NAME = 'dart-players';

let db: Db;

// CORS
app.use(cors({
  origin: 'https://play.autodarts.io',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

async function connectToMongo() {
  try {
    const client = await MongoClient.connect(MONGO_URI);
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

const appRouter = router({
  users: publicProcedure
    .input(z.string())
    .query(async (opts) => {
      try {
        const { input } = opts;

        const collection = db.collection<DartPlayer>(DART_PLAYERS_COLLECTION_NAME);
        const player = await collection.findOne({ input });

        if (!player) {
          return { error: 'Player not found' };
        }

        return { name: player.name, picture: player.picture };
      } catch (error) {
        console.error('Error fetching player:', error);
        return { error: 'Internal server error' };
      }
    })
});

export type AppRouter = typeof appRouter;
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get('/users/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const collection = db.collection<DartPlayer>(DART_PLAYERS_COLLECTION_NAME);
    const player = await collection.findOne({ name });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    return res.json({ name: player.name, picture: player.picture });
  } catch (error) {
    console.error('Error fetching player:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post(
  '/matches',
  async (
    req: Request<CreateMatchRequest>,
    res: Response
  ) => {
    try {
      const { matchId, players, options } = req.body;

      // Validation
      if (!matchId || typeof matchId !== 'string') {
        res.status(400).json({ error: 'Valid matchId is required' });
        return;
      }

      if (!Array.isArray(players) || players.length === 0) {
        res.status(400).json({ error: 'Players array must contain at least one player' });
        return;
      }

      if (!players.every(player => typeof player === 'string')) {
        res.status(400).json({ error: 'All players must be strings' });
        return;
      }

      // Check if match already exists
      const existingMatch = await db.collection<Match>('matches').findOne({ matchId });
      if (existingMatch) {
        res.status(200).json({ ...existingMatch });
        return;
      }

      // Create match
      const match: Match = {
        matchId,
        players,
        options,
        turns: []
      };

      const result = await db.collection<Match>('matches').insertOne(match);

      res.status(201).json({
        ...match,
        _id: result.insertedId
      });
    } catch (error) {
      console.error('Error creating match:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Add a turn to an existing match
app.post(
  '/matches/:matchId/turns',
  async (
    req: Request<{ matchId: string }, object, Omit<AddTurnRequest, 'matchId'>>,
    res: Response
  ) => {
    try {
      const { matchId } = req.params;
      const { turn } = req.body;

      // Validation
      if (!turn || typeof turn !== 'object') {
        res.status(400).json({ error: 'Valid turn object is required' });
        return;
      }

      if (typeof turn.player !== 'string') {
        res.status(400).json({ error: 'Turn player must be a string' });
        return;
      }

      if (typeof turn.remainingPoints !== 'number') {
        res.status(400).json({ error: 'remainingPoints must be a number' });
        return;
      }

      if (typeof turn.totalThrowValue !== 'number') {
        res.status(400).json({ error: 'totalThrowValue must be a number' });
        return;
      }

      if (typeof turn.currentThrowNumber !== 'number') {
        res.status(400).json({ error: 'currentThrowNumber must be a number' });
        return;
      }

      if (!Array.isArray(turn.throws) || turn.throws.length > 3) {
        res.status(400).json({ error: 'throws must be an array with 1-3 elements' });
        return;
      }

      if (!turn.throws.every(t => typeof t === 'string')) {
        res.status(400).json({ error: 'All throws must be strings' });
        return;
      }

      // Find match and validate player
      const match = await db.collection<Match>('matches').findOne({ matchId });

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (!match.players.includes(turn.player)) {
        res.status(400).json({ error: 'Player not in this match' });
        return;
      }

      // Add turn to match
      const result = await db.collection<Match>('matches').findOneAndUpdate(
        { matchId },
        { $push: { turns: turn as Turn } },
        { returnDocument: 'after' }
      );

      if (!result) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error adding turn:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.get('/users/:name/statistics', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const collection = db.collection<DartPlayer>(DART_PLAYERS_COLLECTION_NAME);
    const player = await collection.findOne({ name });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const { events } = player;

    // Filter only darts-pulled events
    const throws = events.filter(e => e.event === 'darts-pulled');

    // Calculate highest throw
    const highestThrow = Math.max(...throws.map(t => t.game.dartsThrownValue));

    // Count throws by category
    const throws60Plus = throws.filter(t => t.game.dartsThrownValue >= 60).length;
    const throws100Plus = throws.filter(t => t.game.dartsThrownValue >= 100).length;
    const throws140Plus = throws.filter(t => t.game.dartsThrownValue >= 140).length;
    const throws180 = throws.filter(t => t.game.dartsThrownValue === 180).length;

    // Get top 3 outs (pointsLeft === 0, sorted by dartsThrownValue descending)
    const outs = throws
      .filter(t => t.game.pointsLeft === 0)
      .sort((a, b) => b.game.dartsThrownValue - a.game.dartsThrownValue)
      .slice(0, 3)
      .map(t => t.game.dartsThrownValue);

    // Get top 3 busts (busted === true, sorted by dartsThrownValue descending)
    const busts = throws
      .filter(t => t.game.busted === true)
      .sort((a, b) => b.game.dartsThrownValue - a.game.dartsThrownValue)
      .slice(0, 3)
      .map(t => t.game.dartsThrownValue);

    // Calculate average for last 10 throws
    const last10Throws = throws.slice(-10);
    const averageLast10 = last10Throws.length > 0
      ? last10Throws.reduce((sum, t) => sum + t.game.dartsThrownValue, 0) / last10Throws.length
      : 0;

    // Calculate average for last 100 throws
    const last100Throws = throws.slice(-100);
    const averageLast100 = last100Throws.length > 0
      ? last100Throws.reduce((sum, t) => sum + t.game.dartsThrownValue, 0) / last100Throws.length
      : 0;

    return {
      highestThrow,
      throwCounts: {
        '60+': throws60Plus,
        '100+': throws100Plus,
        '140+': throws140Plus,
        '180': throws180
      },
      topOuts: outs,
      topBusts: busts,
      averages: {
        last10: Math.round(averageLast10 * 100) / 100, // Round to 2 decimal places
        last100: Math.round(averageLast100 * 100) / 100
      },
      totalThrows: throws.length
    };
  } catch (error) {
    console.error('Error fetching player:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Start server
async function startServer() {
  await connectToMongo();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();


export function cleanup(match: Match): Match {
  // Group turns by player
  const turnsByPlayer = new Map<string, Turn[]>();

  for (const turn of match.turns) {
    if (!turnsByPlayer.has(turn.player)) {
      turnsByPlayer.set(turn.player, []);
    }
    turnsByPlayer.get(turn.player)!.push(turn);
  }

  // For each player, go in reverse and keep only the last occurrence of each currentThrowNumber
  const cleanedTurnsByPlayer = new Map<string, Turn[]>();

  for (const [player, turns] of turnsByPlayer.entries()) {
    const seenThrowNumbers = new Set<number>();
    const cleanedTurns: Turn[] = [];

    // Iterate in reverse
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];

      // Only keep if we haven't seen this throw number yet
      if (!seenThrowNumbers.has(turn.currentThrowNumber)) {

        const lastTurn = cleanedTurns[0];
        if (lastTurn && lastTurn.currentThrowNumber - 1 > turn.currentThrowNumber) {

          // bruh moment
          const missedTurnsAmount = (lastTurn.currentThrowNumber - 1) - turn.currentThrowNumber;

          if (missedTurnsAmount === 1) {
            const missedTurn: Turn = {
              ...turn,
              currentThrowNumber: turn.currentThrowNumber + 1,
              throws: [
                turn.throws[0],
                turn.throws[1],
                'miss'
              ]
            }

            seenThrowNumbers.add(missedTurn.currentThrowNumber);
            cleanedTurns.unshift(missedTurn);
          } else if (missedTurnsAmount === 2) {
            const missedTurn1: Turn = {
              ...turn,
              currentThrowNumber: turn.currentThrowNumber + 1,
              throws: [
                turn.throws[0],
                'miss'
              ]
            }

            const missedTurn2: Turn = {
              ...turn,
              currentThrowNumber: turn.currentThrowNumber + 2,
              throws: [
                turn.throws[0],
                'miss',
                'miss'
              ]
            }

            seenThrowNumbers.add(missedTurn1.currentThrowNumber);
            seenThrowNumbers.add(missedTurn2.currentThrowNumber);
            cleanedTurns.unshift(missedTurn2);
            cleanedTurns.unshift(missedTurn1);
          } else {
            const missedTurn1: Turn = {
              ...turn,
              currentThrowNumber: turn.currentThrowNumber + 1,
              throws: [
                'miss'
              ]
            }

            const missedTurn2: Turn = {
              ...turn,
              currentThrowNumber: turn.currentThrowNumber + 2,
              throws: [
                'miss',
                'miss'
              ]
            }

            const missedTurn3: Turn = {
              ...turn,
              currentThrowNumber: turn.currentThrowNumber + 3,
              throws: [
                'miss',
                'miss',
                'miss'
              ]
            }

            seenThrowNumbers.add(missedTurn1.currentThrowNumber);
            seenThrowNumbers.add(missedTurn2.currentThrowNumber);
            seenThrowNumbers.add(missedTurn3.currentThrowNumber);
            cleanedTurns.unshift(missedTurn3);
            cleanedTurns.unshift(missedTurn2);
            cleanedTurns.unshift(missedTurn1);
          }
        }
        seenThrowNumbers.add(turn.currentThrowNumber);
        cleanedTurns.unshift(turn); // Add to front to maintain original order
      }
    }

    cleanedTurnsByPlayer.set(player, cleanedTurns);
  }

  // Reconstruct the turns array by interleaving players in the original order
  const cleanedTurns: Turn[] = [];

  // Keep track of current position for each player
  const playerIndices = new Map<string, number>();
  for (const player of match.players) {
    playerIndices.set(player, 0);
  }

  // Iterate through original turns to maintain the interleaving pattern
  for (const originalTurn of match.turns) {
    const player = originalTurn.player;
    const playerTurns = cleanedTurnsByPlayer.get(player)!;
    const playerIndex = playerIndices.get(player)!;

    // Check if this original turn's currentThrowNumber matches the next cleaned turn
    if (playerIndex < playerTurns.length &&
      playerTurns[playerIndex].currentThrowNumber === originalTurn.currentThrowNumber) {
      cleanedTurns.push(playerTurns[playerIndex]);
      playerIndices.set(player, playerIndex + 1);
    }
  }

  return {
    ...match,
    turns: cleanedTurns
  };
}

console.log('vorher', someMatch.turns.filter(t => t.player === 'schwembini'));
console.log('cleaned up', cleanup(someMatch).turns.filter(t => t.player === 'schwembini'));
