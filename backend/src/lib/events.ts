import { EventEmitter } from "events";

export const liveFeedEmitter = new EventEmitter();

// Max listeners setup to avoid memory leaks warning under high volume
liveFeedEmitter.setMaxListeners(100);
