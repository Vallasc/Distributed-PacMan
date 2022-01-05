<script lang="ts">
	import Menu from './Menu.svelte';
	import Game  from './Game.svelte';
	import { WebrtcProvider } from 'y-webrtc'
	import * as Y from 'yjs'
    import { pacmanName } from '../store.js';

	const version = "version 0.0.4"

	console.log(version)

	const ydoc: Y.Doc = new Y.Doc({gc: true})
	const provider: WebrtcProvider = new WebrtcProvider( 'distribuited-pacman', ydoc)
	provider.maxConns = 10

</script>

{#if $pacmanName != ""}
	<Game {ydoc} {provider}></Game>
{/if}
<Menu {ydoc} {provider}></Menu>

<style>
</style>