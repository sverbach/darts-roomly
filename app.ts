import axios from 'axios';
import { io } from 'socket.io-client';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const hoasEndpoint = `${process.env.HOME_ASSISTANT_ENDPOINT}/api/services/select/select_option`;
const hoasBearer = process.env.HOME_ASSISTANT_BEARER;

const DART_PRESETS = {
  IDLE: 'Dart Idle',
  PLAYING: 'Dart Playing',
  HIGH_THROW: 'Dart High Throw',
  CLOSE: 'Dart Close',
  BUSTY: 'Dart Busty',
  BUSTY_IDLE: 'Dart Busty Idle',
  WIN: 'Dart Win',
  WIN_IDLE: 'Dart Win Idle',
};
const entityId = 'select.mc_0_wled_roof_preset';
function getHomeAssistentRequestPayload(preset: string): string {
  return JSON.stringify({
    entity_id: entityId,
    option: preset,
  });
}

function getHomeAssistentAuthHeader(): { headers: { Authorization: string } } {
  return {
    headers: {
      Authorization: `Bearer ${hoasBearer}`,
    },
  };
}

function changeLightingPreset(presetName: string): Promise<void> {
  return axios.post(
    hoasEndpoint,
    getHomeAssistentRequestPayload(presetName),
    getHomeAssistentAuthHeader()
  );
}

console.log(
  '###################################################################'
);
console.log('       WELCOME TO DARTS-ROOMLY');
console.log(
  `       Home Assistant Server: ${process.env.HOME_ASSISTANT_ENDPOINT}`
);
console.log(
  '###################################################################'
);
const socket = io('wss://192.168.1.141:8079', {
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

socket.on('message', async (body) => {
  console.log(JSON.stringify(body, null, 2));

  switch (body.event) {
    case 'darts-thrown':
      const { dartValue } = body.game;
      if (!isNaN(dartValue) && Number(dartValue) >= 50) {
        await changeLightingPreset(DART_PRESETS.HIGH_THROW);
      } else {
        await changeLightingPreset(DART_PRESETS.IDLE);
      }
      break;
    case 'darts-pulled':
      await changeLightingPreset(DART_PRESETS.PLAYING);
      break;
    case 'game-started':
      await changeLightingPreset(DART_PRESETS.IDLE);
      break;
    case 'match-won':
    case 'match-ended':
      await changeLightingPreset(DART_PRESETS.WIN);
      setTimeout(async () => {
        await changeLightingPreset(DART_PRESETS.WIN_IDLE);
      }, 3000);
      setTimeout(async () => {
        await changeLightingPreset(DART_PRESETS.IDLE);
      }, 10000);
      break;
    case 'busted':
      await changeLightingPreset(DART_PRESETS.BUSTY);
      setTimeout(async () => {
        await changeLightingPreset(DART_PRESETS.BUSTY_IDLE);
      }, 2000);
      setTimeout(async () => {
        await changeLightingPreset(DART_PRESETS.IDLE);
      }, 10000);
      break;
  }
});

const app = express();
const PORT = 3000;

app.get('/health', (_req, res) => {
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`healthcheck is running on port ${PORT}`);
});
