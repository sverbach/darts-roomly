import { AutodartsEventType } from './autodarts-events.types.js';

const autodartsEventNames = [
  'busted',
  'match-won',
  'match-ended',
  'darts-pulled',
  'darts-thrown',
  'dart1-thrown',
  'dart2-thrown',
  'dart3-thrown',
  'game-started',
];

export function isAutodartsEvent(event: any): event is AutodartsEventType {
  return autodartsEventNames.includes(event.event);
}
