export const HomeAssistantConfig = {
  selectOptionEndpointUrl: `${process.env.HOME_ASSISTANT_ENDPOINT_URL}/api/services/select/select_option`,
  bearer: process.env.HOME_ASSISTANT_BEARER,
  wledDartPresets: {
    IDLE: 'Dart Idle',
    PLAYING: 'Dart Playing',
    HIGH_THROW: 'Dart High Throw',
    CLOSE: 'Dart Close',
    BUSTY: 'Dart Busty',
    BUSTY_IDLE: 'Dart Busty Idle',
    WIN: 'Dart Win',
    WIN_IDLE: 'Dart Win Idle',
  },
  wledEntityId: 'select.mc_0_wled_roof_preset',
};
