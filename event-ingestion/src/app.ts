import { io } from 'socket.io-client';
import express from 'express';
import dotenv from 'dotenv';
import chalk from 'chalk';
import boxen from 'boxen';
import { processDartEvent } from './dart-events-processor.js';
import { isAutodartsEvent } from './autodarts-events.js';
import yargs from 'yargs';
import { hideBin } from "yargs/helpers";
import { disposeDatabase, persistEvent, setupDatabase } from './darts-events-persisting.js';

dotenv.config();

const argv = await yargs(hideBin(process.argv))
  .option(
    'server',
    {
      alias: 's',
      description: 'IPADDR:PORT of the server emitting autodart events',
      type: "string",
      demandOption: true
    }
  )
  .option(
    'board',
    {
      alias: 'b',
      description: 'Board id which is being played on',
      type: "string",
      demandOption: true
    }
  )
  .option(
    'lighting',
    {
      alias: 'l',
      description: 'Should change lightning?',
      type: "boolean",
      demandOption: true
    }
  )
  .help()
  .alias('h', 'help')
  .parse();

const title = `
  ${chalk.black.bold('DARTS-ROOMLY 🤖🤖')}\n
  ${chalk.black.bold('Home Assistant Server: ' + chalk.white(process.env.HOME_ASSISTANT_ENDPOINT_URL))}\n
  ${chalk.black.bold('Home Assistant Bearer: ' + chalk.white(process.env.HOME_ASSISTANT_BEARER))}\n
  ${chalk.black.bold('Home Assistant WLED Entity: ' + chalk.white(process.env.HOME_ASSISTANT_WLED_ENTITY_ID))}\n
  ${chalk.black.bold('Board ID: ' + chalk.white(argv.board))}\n
  ${chalk.black.bold('Dart Event WS SocketIO Server: ' + chalk.white(argv.server))}\n`;

const welcome = boxen(title, {
  padding: 1,
  margin: 1,
  borderStyle: 'double',
  borderColor: 'black',
});

console.log(welcome);

const socket = io(`wss://${argv.server}`, {
  transports: ['websocket'],
  rejectUnauthorized: false,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 5000,
  timeout: 3000,
});

socket.on('connect_error', (event) => {
  console.error('error', JSON.stringify(event, null, 2));
});

socket.on('connect', async () => {
  console.log('connected!');
  await setupDatabase();
});

socket.on('disconnect', async (event) => {
  console.log('closed!', JSON.stringify(event, null, 2));
  await disposeDatabase();
});

socket.on('message', async (event) => {
  if (isAutodartsEvent(event) && argv.lighting) {
    await processDartEvent(event);
  }

  await persistEvent({ ...event, timestamp: Date.now(), boardId: argv.board });
});

const app = express();
const PORT = 3000;

app.get('/health', (_req, res) => {
  res.sendStatus(200);
});

app.listen(PORT, () => {
  const healthcheckMessage = `${chalk.white.bold('Healthcheck is running on port:')} ${chalk.green.bold(PORT)}`;
  const healthcheckMessageBoxed = boxen(healthcheckMessage, {
    padding: 1,
    margin: 1,
    borderStyle: 'double',
    borderColor: 'black',
  });
  console.log(healthcheckMessageBoxed);
});
