import { Writable, writable } from 'svelte/store'
import type { GameState } from './game/state'

export const pacmanName: Writable<string> = writable("")
export const pacmanId: Writable<string> = writable("")
export const globalState: Writable<null | GameState> = writable(null)
export const mute: Writable<boolean> = writable(false)
export const disconnectSignal: Writable<boolean> = writable(true)