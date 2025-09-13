import { io } from 'socket.io-client';
import express from 'express';
import dotenv from 'dotenv';
import chalk from 'chalk';
import boxen from 'boxen';
import { processDartEvent } from './dart-events-processor.js';
import { isAutodartsEvent } from './autodarts-events.js';
dotenv.config();

const title = `
  ${chalk.black.bold('DARTS-ROOMLY 🤖🤖')}\n
  ${chalk.black.bold('Home Assistant Server: ' + chalk.white(process.env.HOME_ASSISTANT_ENDPOINT_URL))}\n
  ${chalk.black.bold('Home Assistant Bearer: ' + chalk.white(process.env.HOME_ASSISTANT_BEARER))}\n
  ${chalk.black.bold('Home Assistant WLED Entity: ' + chalk.white(process.env.HOME_ASSISTANT_WLED_ENTITY_ID))}\n
  ${chalk.black.bold('Dart Event WS SocketIO Server: ' + chalk.white(process.env.SOCKET_IO_ENDPOINT))}\n`;

const welcome = boxen(title, {
  padding: 1,
  margin: 1,
  borderStyle: 'double',
  borderColor: 'black',
});

console.log(welcome);

const socket = io(`wss://${process.env.SOCKET_IO_ENDPOINT}`, {
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

socket.on('connect', () => {
  console.log('connected!');
});

socket.on('disconnect', (event) => {
  console.log('closed!', JSON.stringify(event, null, 2));
});

socket.on('message', async (event) => {
  if (isAutodartsEvent(event)) {
    await processDartEvent(event);
  }
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
