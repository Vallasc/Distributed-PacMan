<script lang="ts">
    import type * as Y from 'yjs'
    import { Camera } from '../game/camera';
    import { Game } from '../game/game'
    import { KeyState } from '../game/key_state';
    import { LevelMap } from '../game/level_map';
    import { Pacman } from '../game/pacman';
    import { GameState } from '../game/state';
    import { pacmanName, pacmanId, globalState } from '../store.js';
    import { onMount, onDestroy } from 'svelte';
    import type { WebrtcProvider } from 'y-webrtc';
    
    export let ydoc: Y.Doc
    export let provider: WebrtcProvider

    console.log("Game created")

    onMount(() => {
    })
    onDestroy(() => {
        document.body.removeChild(renderer.domElement)
        //clearInterval(interval)
    })

    let game = new Game()
    let keys = new KeyState()
    let renderer = game.createRenderer()
    let scene = game.createScene()
    
    let state = new GameState(ydoc)
    let map = new LevelMap(scene, state)
    let pacman =  new Pacman($pacmanId, $pacmanName, provider.room.peerId, map.pacmanSpawn)
    state.setCurrentPacman(pacman)
    globalState.set(state)
    pacman.addToScene(scene)
    
    let camera = new Camera(renderer, pacman)
    
    //let hudCamera = game.createHudCamera(map)
    
    let frameCounter = 0
    // Main game loop
    game.gameLoop( (delta) => {
        // Update local list of pacman
        state.updatePacmanLocal(scene)
        state.updateDotsLocal()
    
        pacman.movePacman(delta, keys, map, state)
        pacman.updateFrame()
    
        camera.updateCamera(delta)
    
        // Set my pacman state
        state.setPacman(pacman)
    
        // Update other pacman frames
        for( let p of state.getPacmans()){
            if(p.id != pacman.id){
                p.updateFrame()
                //p.calculateFakeMovement(delta)
            }
        }
        // Render main view
        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height)
        renderer.render(scene, camera.get())
    
        // Render HUD
        //renderHud(renderer, hudCamera, scene)

        if(frameCounter % 30 == 0){
            controlOfflinePacmans()
        }
        frameCounter++
    })
    
    function controlOfflinePacmans(){
        let connected = provider.room.bcConns
        for( let p of state.getPacmans()){
            if(p.peerId != pacman.peerId && p.isOnline && !connected.has(p.peerId)){
                p.isOnline = false
                state.setPacman(p)
                console.log("Offline pacman " + p.name)
            }
        }
    }

    /*setInterval(()=>{
        console.log(Array.from(state.getPacmans()))
    }, 1000)*/
</script>