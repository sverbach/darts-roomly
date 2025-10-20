import { Db } from 'mongodb';

interface DartEvent {
  _id?: any;
  event: string;
  player: string;
  timestamp: number;
  [key: string]: any;
}

interface DartPlayer {
  _id?: any;
  name: string;
  events?: DartEvent[];
  picture: string | null;
}

interface IngestionClock {
  _id?: any;
  lastIngestionTimestamp: number;
}

/**
  * Pushes the latest dart events to the respective player.
  **/
async function ingestPlayerDartEvents(db: Db): Promise<void> {
  console.log('Starting dart events ingestion...');

  // Step 1: Load the latest ingestion timestamp
  const ingestionClockCollection = db.collection<IngestionClock>('ingestion-clock');
  const clockDoc = await ingestionClockCollection.findOne({});
  const lastIngestionTimestamp = clockDoc?.lastIngestionTimestamp || 0;

  console.log(`Last ingestion timestamp: ${lastIngestionTimestamp} (${new Date(lastIngestionTimestamp).toISOString()})`);

  // Step 2: Query dart-events for new "darts-pulled" events
  const dartEventsCollection = db.collection<DartEvent>('dart-events');
  const newEvents = await dartEventsCollection
    .find({
      event: 'darts-pulled',
      timestamp: { $gt: lastIngestionTimestamp }
    })
    .sort({ timestamp: 1 })
    .toArray();

  console.log(`Found ${newEvents.length} new darts-pulled events to process`);

  if (newEvents.length === 0) {
    console.log('No new events to process. Exiting.');
    return;
  }

  // Step 3: Group events by player and update dart-players collection
  const dartPlayersCollection = db.collection<DartPlayer>('dart-players');
  const playerEventsMap = new Map<string, DartEvent[]>();

  // Group events by player
  for (const event of newEvents) {
    if (!playerEventsMap.has(event.player)) {
      playerEventsMap.set(event.player, []);
    }
    playerEventsMap.get(event.player)!.push(event);
  }

  console.log(`Processing events for ${playerEventsMap.size} unique players`);

  // Update each player's events
  for (const [playerName, events] of playerEventsMap.entries()) {
    console.log(`Processing ${events.length} events for player: ${playerName}`);

    // Get existing player or prepare new one
    const existingPlayer = await dartPlayersCollection.findOne({ name: playerName });

    if (existingPlayer) {
      // Create a Set of existing timestamps to avoid duplicates
      const existingTimestamps = new Set(
        existingPlayer.events?.map(e => e.timestamp) ?? []
      );

      // Filter out events that already exist
      const newUniqueEvents = events.filter(
        e => !existingTimestamps.has(e.timestamp)
      );

      if (newUniqueEvents.length > 0) {
        await dartPlayersCollection.updateOne(
          { name: playerName },
          { $push: { events: { $each: newUniqueEvents } } }
        );
        console.log(`Added ${newUniqueEvents.length} new events for player: ${playerName}`);
      } else {
        console.log(`No new unique events for player: ${playerName} (all were duplicates)`);
      }
    } else {
      // Create new player document
      await dartPlayersCollection.insertOne({
        name: playerName,
        events: events,
        picture: null
      });
      console.log(`Created new player: ${playerName} with ${events.length} events`);
    }
  }

  // Step 4: Update the ingestion clock with current timestamp
  const currentTimestamp = Date.now();
  await ingestionClockCollection.updateOne(
    {},
    { $set: { lastIngestionTimestamp: currentTimestamp } },
    { upsert: true }
  );

  console.log(`Updated ingestion clock to: ${currentTimestamp} (${new Date(currentTimestamp).toISOString()})`);
  console.log('Dart events ingestion completed successfully');
}

// Example usage:
// const client = new MongoClient('mongodb://localhost:27017');
// await client.connect();
// const db = client.db('your-database-name');
// await ingestDartEvents(db);
// await client.close();

export { ingestPlayerDartEvents };
