<script lang="ts">
	import Menu from './Menu.svelte'
	import Game  from './Game.svelte'
	import { WebrtcProvider } from 'y-webrtc'
	import * as awarenessProtocol from "y-protocols/awareness";
	import * as Y from 'yjs'
    import { pacmanName } from '../store.js'
	import { onDestroy } from 'svelte'
	import { GlobalConfig } from '../game/global_config';
	import { Utils } from '../game/utils';
    import Test from './Test.svelte';

	const version = "1.5.6"

	console.log("version " + version)

	onDestroy(()=>{
		provider.disconnect()
	})

	const urlParams = new URLSearchParams(window.location.search)
    let roomId = urlParams.get("room");
	if( roomId == null ) {
		roomId = Utils.getRandomString()
		window.history.pushState(null, null, "?room=" + roomId)
	}
	console.log("Room id: " + roomId)

	const garbageCollector = true
	const ydoc: Y.Doc = new Y.Doc({gc: garbageCollector})
	const awareness = new awarenessProtocol.Awareness(ydoc)

	let password = roomId
	if (location.protocol !== 'https:') {
    	password = null
}
	const provider: WebrtcProvider = new WebrtcProvider( 'distributed_pacman_' + roomId, ydoc, {
		signaling: ['wss://signaling.yjs.dev'],
		password: password,
		awareness: awareness,
		maxConns: GlobalConfig.MAX_PLAYERS,
		filterBcConns: true,
		peerOpts: {
			config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]}
		}
	})


	console.log(provider)
	let debug : boolean = urlParams.get("debug") === "true";

	/*provider.awareness.on('update', value => {
		console.log(provider.awareness.states.keys())
	})*/

</script>

{#if debug}
	<Test provider={provider}></Test>
{/if}

{#if $pacmanName != ""}
	<Game {ydoc}></Game>
{/if}
<Menu {ydoc} {provider}></Menu>

<style>
</style>