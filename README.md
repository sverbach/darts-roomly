# DARTS-ROOMLY 🤖🤖

Running DARTS-ROOMLY will consume autodarts event and select WLED presets based on the game state.

## Setup

> Make sure you have [darts-caller](https://github.com/lbormann/darts-caller) running.

> Setup the WLED presets. Make sure you have all the WLED defined in `src/home-assistant.config.ts` in your home assistant.

> Create a `.env` file, based on the `.env.example` file (use a long-lived bearer token for HomeAssistant).

> Install dependencies (first launch only)

```bash
npm i
```

> Start the app

```bash
npm start
```
