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

	const version = "1.5.6"

	console.log("version " + version)

	onDestroy(()=>{
		provider.disconnect()
	})

	const urlParams = new URLSearchParams(window.location.search)
    let roomId = urlParams.get("room");
	if( roomId == null ) {
		roomId = Utils.getRandomString()
		//urlParams.set("room", roomId)
		window.history.pushState(null, null, "?room=" + roomId)
	}
	console.log("Room id: " + roomId)

	const garbageCollector = true
	const ydoc: Y.Doc = new Y.Doc({gc: garbageCollector})
	const awareness = new awarenessProtocol.Awareness(ydoc)
	// Disable awareness
	awareness.destroy()
	const provider: WebrtcProvider = new WebrtcProvider( 'distribuited_pacman_' + roomId, ydoc, {
		signaling: ['wss://signaling.yjs.dev'],
		password: null,
		awareness: awareness,
		maxConns: GlobalConfig.MAX_PLAYERS,
		filterBcConns: true,
		peerOpts: {}
	})

</script>

{#if $pacmanName != ""}
	<Game {ydoc}></Game>
{/if}
<Menu {ydoc} {provider}></Menu>

<style>
</style>