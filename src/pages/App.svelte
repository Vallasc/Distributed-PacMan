<script lang="ts">
	import Menu from './Menu.svelte'
	import Game  from './Game.svelte'
	import { WebrtcProvider } from 'y-webrtc'
	import * as awarenessProtocol from "y-protocols/awareness";
	import * as Y from 'yjs'
    import { pacmanName } from '../store.js'
	import { onDestroy } from 'svelte'

	const version = "1.1.6" // TODO check if other have same version

	console.log("version " + version)

	onDestroy(()=>{
		provider.disconnect()
	})

	const garbageCollector = true
	const ydoc: Y.Doc = new Y.Doc({gc: garbageCollector})
	const awareness = new awarenessProtocol.Awareness(ydoc)
	const provider: WebrtcProvider = new WebrtcProvider( 'distribuited-pacman', ydoc, {
		signaling: ['wss://signaling.yjs.dev'],
		password: null,
		awareness: awareness,
		maxConns: 10,
		filterBcConns: true,
		peerOpts: {}
	})


</script>

{#if $pacmanName != ""}
	<Game {ydoc} {provider}></Game>
{/if}
<Menu {ydoc} {provider}></Menu>

<style>
</style>