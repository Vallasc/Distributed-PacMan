<script lang="ts">
    import type * as Y from 'yjs'
    import { Camera } from '../game/camera'
    import { Game } from '../game/game'
    import { KeyState } from '../game/keyboard'
    import { World } from '../game/world'
    import { Pacman } from '../game/pacman'
    import { GameState } from '../game/state'
    import { pacmanName, pacmanId, globalState } from '../store.js'
    import { onMount, onDestroy } from 'svelte'
    import type { WebrtcProvider } from 'y-webrtc'
    
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
    let map = new World(scene, state)
    let pacman =  new Pacman($pacmanId, $pacmanName, provider.room.peerId, map.pacmanSpawn)
    state.setCurrentPacman(pacman)
    globalState.set(state)
    pacman.addToScene(scene)
    
    let camera = new Camera(renderer, pacman)
    
    //let hudCamera = game.createHudCamera(map)
    
    let frameCounter = 0
    let recomputeGhostTargetFrame = Math.floor(Math.random() * 60)
    // Main game loop
    game.gameLoop( (delta) => {
        // Update local state
        state.updatePacmanLocal(scene)
        state.updateGhostsLocal()
        state.updateDotsLocal()
    
        pacman.movePacman(delta, keys, map, state)
        // Update other pacman frames
        for( let p of state.getPacmansList()){
            p.updateFrame(pacman)
        }
        // Update pacam camera
        camera.updateCamera(delta)
        // Set current pacman state
        state.setPacman(pacman)

        // Compute target for necessary ghosts
        if(frameCounter % recomputeGhostTargetFrame == 0){
            game.computeGhostTarget(state, frameCounter == 0)
        }
        // Update ghosts position
        for( let g of state.getGhosts()){
            if(g.pacmanTarget && g.pacmanTarget == pacman.id){
                g.moveGhost(delta, map)
                state.setGhost(g)
            }
        }

        // Render main view
        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height)
        renderer.render(scene, camera.get())
    
        // Render HUD
        //renderHud(renderer, hudCamera, scene)

        if(frameCounter % 30 == 0){
            game.controlOfflinePacmans(provider, state)
        }
        frameCounter++
    })

    /*setInterval(()=>{
        //console.log(Array.from(state.getPacmans()))
        console.log(Array.from(state.getGhosts()))
    }, 1000)*/
</script>