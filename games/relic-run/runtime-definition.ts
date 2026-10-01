import {parseChanceGame} from '@rarefriends/friendsdk/game';
import config from './game.json';
// Required SDK frame metadata. Its chance actions are not used by this game.
// The actual expedition economy is documented in economy.json and the game UI.
export const runtimeDefinition=parseChanceGame(config);
