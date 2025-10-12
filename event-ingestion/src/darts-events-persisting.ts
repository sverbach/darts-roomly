import { Db, MongoClient, ServerApiVersion } from "mongodb";

let database: Db;
// Replace the placeholder with your Atlas connection string
const uri = "mongodb://192.168.1.170:27017/";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
}
);

export async function setupDatabase() {
  await client.connect();
  database = client.db("roomly-darts");
  console.log(`Connected to MongoDb database ${database.databaseName}`);
}

export async function disposeDatabase() {
  await client.close();
  database = undefined;
  console.log(`Disconnected from MongoDb database`);
}

export async function persistEvent(event: any) {
  const result = await database.collection("events-log").insertOne(event);
  console.log(`Event persisted with the _id: ${result.insertedId}`);
}
