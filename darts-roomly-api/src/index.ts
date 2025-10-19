import express, { Request, Response } from 'express';
import cors from "cors";
import { MongoClient, Db } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 8082;

const MONGO_URI = 'mongodb://192.168.1.170:27017/';
const DB_NAME = 'roomly-darts';
const COLLECTION_NAME = 'dart-players';

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

// GET /users/:name endpoint
app.get('/users/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const collection = db.collection(COLLECTION_NAME);
    const player = await collection.findOne({ name });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    return res.json(player);
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
