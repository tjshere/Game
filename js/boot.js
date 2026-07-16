// Temporary boot: preserves pre-account behavior until the login screen lands.
import { startGame, rehydrate } from "./main.js";
import { load } from "./save.js";

startGame(rehydrate(load(localStorage)));
