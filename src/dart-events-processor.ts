import axios from 'axios';
import { HomeAssistantConfig } from './home-assistant.config.js';
import { AutodartsEventType } from './autodarts-events.types.js';

function getHomeAssistentRequestPayload(preset: string): string {
  return JSON.stringify({
    entity_id: HomeAssistantConfig.wledEntityId,
    option: preset,
  });
}

function getHomeAssistentAuthHeader(): { headers: { Authorization: string } } {
  return {
    headers: {
      Authorization: `Bearer ${HomeAssistantConfig.bearer}`,
    },
  };
}

function changeLightingPreset(presetName: string): Promise<void> {
  return axios.post(
    HomeAssistantConfig.selectOptionEndpointUrl,
    getHomeAssistentRequestPayload(presetName),
    getHomeAssistentAuthHeader()
  );
}

export async function processDartEvent(eventMessage: AutodartsEventType) {
  const { wledDartPresets } = HomeAssistantConfig;
  const { event, game } = eventMessage;
  const closeGameThreshold = 30;
  const highThrowThreshold = 80;

  switch (event) {
    case 'darts-thrown':
      if (Number(game.dartValue) >= highThrowThreshold) {
        await changeLightingPreset(wledDartPresets.HIGH_THROW);
      } else {
        await changeLightingPreset(wledDartPresets.IDLE);
      }
      break;
    case 'darts-pulled':
      if (Number(game.pointsLeft) <= closeGameThreshold) {
        await changeLightingPreset(wledDartPresets.CLOSE);
      } else {
        await changeLightingPreset(wledDartPresets.PLAYING);
      }
      break;
    case 'dart1-thrown':
    case 'dart2-thrown':
    case 'dart3-thrown':
      if (Number(game.pointsLeft) <= closeGameThreshold) {
        await changeLightingPreset(wledDartPresets.CLOSE);
      } else if (Number(game.dartValue) >= highThrowThreshold) {
        await changeLightingPreset(wledDartPresets.HIGH_THROW);
      }
      break;
    case 'game-started':
      await changeLightingPreset(wledDartPresets.IDLE);
      break;
    case 'match-won':
    case 'match-ended':
      await changeLightingPreset(wledDartPresets.WIN);
      setTimeout(async () => {
        await changeLightingPreset(wledDartPresets.WIN_IDLE);
      }, 3000);
      break;
    case 'busted':
      await changeLightingPreset(wledDartPresets.BUSTY);
      setTimeout(async () => {
        await changeLightingPreset(wledDartPresets.BUSTY_IDLE);
      }, 2000);
      break;
  }
}
