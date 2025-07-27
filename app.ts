import axios from 'axios';
import { io } from 'socket.io-client';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const hoasEndpoint = `${process.env.HOME_ASSISTANT_ENDPOINT}/api/services/select/select_option`;
const hoasBearer = process.env.HOME_ASSISTANT_BEARER;

const DART_PRESETS = {
  NORMAL: 'Dart Normal',
  IDLE: 'Dart Idle',
  PLAYING: 'Dart Playing',
  CLOSE: 'Dart Close',
  BUSTY: 'Dart Busty',
  WIN: 'Dart Win',
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
const socket = io('wss://127.0.0.1:8079', {
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
    case 'dart3-thrown':
      await axios.post(
        hoasEndpoint,
        getHomeAssistentRequestPayload(DART_PRESETS.IDLE),
        getHomeAssistentAuthHeader()
      );
      break;
    case 'darts-pulled':
      await axios.post(
        hoasEndpoint,
        getHomeAssistentRequestPayload(DART_PRESETS.PLAYING),
        getHomeAssistentAuthHeader()
      );
      break;
    case 'game-started':
      await axios.post(
        hoasEndpoint,
        getHomeAssistentRequestPayload(DART_PRESETS.IDLE),
        getHomeAssistentAuthHeader()
      );
      break;
    case 'match-won':
    case 'match-ended':
      await axios.post(
        hoasEndpoint,
        getHomeAssistentRequestPayload(DART_PRESETS.WIN),
        getHomeAssistentAuthHeader()
      );
      setTimeout(async () => {
        await axios.post(
          hoasEndpoint,
          getHomeAssistentRequestPayload(DART_PRESETS.IDLE),
          getHomeAssistentAuthHeader()
        );
      }, 8000);
      break;
    case 'busted':
      await axios.post(
        hoasEndpoint,
        getHomeAssistentRequestPayload(DART_PRESETS.BUSTY),
        getHomeAssistentAuthHeader()
      );
      setTimeout(async () => {
        await axios.post(
          hoasEndpoint,
          getHomeAssistentRequestPayload(DART_PRESETS.IDLE),
          getHomeAssistentAuthHeader()
        );
      }, 2000);
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
