import express, { Request, Response } from 'express';
import cors from "cors";
import { MongoClient, Db } from 'mongodb';
import cron from 'node-cron';
import { ingestPlayerDartEvents } from './ingest-player-dart-events.js';
import { DartPlayer } from './models.js';

const app = express();
const PORT = process.env.PORT || 8082;

// const MONGO_URI = 'mongodb://192.168.1.170:27017/';
const MONGO_URI = 'mongodb://localhost:27017/';
const DB_NAME = 'roomly-darts';
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
    ingestPlayerDartEvents(db);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

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

// cron job
cron.schedule("* * 23 * * *", () => {
  ingestPlayerDartEvents(db);
});

