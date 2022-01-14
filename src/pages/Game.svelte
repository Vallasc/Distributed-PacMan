<script lang="ts">
    import type * as Y from 'yjs'
    import { Camera, HUDCamera } from '../game/camera'
    import { Game } from '../game/game'
    import { KeyState } from '../game/keyboard'
    import { World } from '../game/world'
    import { Pacman } from '../game/pacman'
    import { GameState } from '../game/state'
    import { pacmanName, pacmanId, globalState } from '../store.js'
    import { onDestroy } from 'svelte'
    import type { WebrtcProvider } from 'y-webrtc'
    import { Ghost } from '../game/ghost';
    import * as THREE from 'three';
    
    export let ydoc: Y.Doc
    export let provider: WebrtcProvider

    console.log("Game created")

    onDestroy(() => {
        document.body.removeChild(renderer.domElement)
    })

    provider.awareness.on("change", ()=>{
		//game.checkOfflinePacmans(provider, state)
		console.log(provider.awareness.getStates())
	})

    let score = 0
    let lives = 3

    let game = new Game()
    let keys = new KeyState()
    let renderer = game.createRenderer()
    let scene = game.createScene()
    
    let state = new GameState(ydoc)
    let map = new World(scene, state)
    let pacman =  new Pacman($pacmanId, $pacmanName, provider.awareness.clientID, map.pacmanSpawn)
    state.setCurrentPacman(pacman)
    globalState.set(state)
    pacman.addToScene(scene)
    
    let camera = new Camera(renderer, pacman)
    let hudCamera = new HUDCamera(map)
    
    let frameCounter = 0
    let recomputeGhostTargetFrame = 60 + Math.floor(Math.random() * 60)

    let isGameStarted = false


    let interval = setInterval(() => {
        isGameStarted = state.checkIfAllPlaying()
        if(isGameStarted)
            clearInterval(interval)
    }, 100)
    // Main game loop
    game.gameLoop( (delta, now) => {

        // Update local state
        state.updatePacmanLocal(scene)
        state.updateGhostsLocal()
        state.updateDotsLocal()

        if(isGameStarted && pacman.isAlive){
            pacman.move(delta, keys, map)
            pacman.eatDots(state)
        }
        // Update other pacman frames
        for( let p of state.getPacmansList()){
            p.update(pacman, now)
        }
        // Update pacam camera
        camera.updateCamera(delta, !pacman.isAlive)

        ydoc.transact(()=>{
            // Set current pacman state
            state.setPacman(pacman)

            // Check offline clients
            if(frameCounter % 60 == 0){
                game.checkOfflinePacmans(provider, state)
            }
            // Compute target for necessary ghosts
            if(frameCounter % recomputeGhostTargetFrame == 0){
                game.computeGhostTarget(state)
            }

            // Update ghosts position
            if(isGameStarted){
                for( let g of state.getGhosts()) {
                    if(g.pacmanTarget && g.pacmanTarget == pacman.id) {
                        g.mesh.material = Ghost.OTHER_GHOST_MATERIAL
                        g.move(delta, map, state)
                        state.setGhost(g)
                    } else {
                        g.mesh.material = Ghost.GHOST_MATERIAL
                    }
                    
                    // Mitigates the delay caused by a bad internet connection
                    moveFakeGhost(g, delta)
                    pacman.checkGhostCollision(g, now)
                }
            }
        })

        // Render main view
        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height)
        camera.render(renderer, scene)
    
        // Render HUD
        hudCamera.render(renderer, scene)

        score = state.getScore()
        frameCounter++
    })

    let lastGhostFreezePositions = new Map<string, THREE.Vector3>()
    let lastGhostFakePositions = new Map<string, THREE.Vector3>()
    function moveFakeGhost(ghost: Ghost, delta: number){
        let lastFreezePosition = lastGhostFreezePositions.get(ghost.id)
        let lastFakePosition = lastGhostFakePositions.get(ghost.id)
        if(!lastFreezePosition){
            lastFreezePosition = new THREE.Vector3()
            lastGhostFreezePositions.set(ghost.id, lastFreezePosition)
        }
        if(!lastFakePosition){
            lastFakePosition = new THREE.Vector3()
            lastGhostFakePositions.set(ghost.id, lastFakePosition)
        }

        if(lastFreezePosition.equals(ghost.mesh.position)){
            ghost.mesh.position.copy(lastFakePosition)
            ghost.moveFake(delta, map)
            lastFakePosition.copy(ghost.mesh.position)
        } else {
            lastFreezePosition.copy(ghost.mesh.position)
            lastFakePosition.copy(ghost.mesh.position)
        }
    }

    /*setInterval(()=>{
        //console.log(Array.from(state.getPacmans()))
        console.log(Array.from(state.getGhosts()))
        //console.log("states")
        //console.log(provider.awareness.getStates())
        //console.log(provider.awareness.getLocalState())

    }, 1000)*/
</script>

<div class="score-box">
    <div>
        <div class="element">
            SCORE
        </div>
        <div class="element">
            {score}
        </div>
    </div>
    <div>
        <div class="element">
            LIVES
        </div>
        <div class="element">
            {lives}
        </div>
    </div>
</div>

<style>
    .score-box {
        position: absolute;
        padding: 14px;
        right: 10px;
        top: 10px;
        background-color: #000000d6;
        color: #FFF;
        z-index: 2;
        display: flex;
        flex-direction: row;
        align-content: center;
        justify-content: space-around;
        align-items: center;
        font-size: 20px;
        border-radius: 20px;
        border-color: #FFF;
        border-width: 2px;
        border-style: solid;
    }

    .element {
        padding: 8px;
        text-align: center;
    }
</style>