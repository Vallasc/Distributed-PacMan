<script lang="ts">
    import type * as Y from 'yjs'
    import { Camera, HUDCamera } from '../game/camera'
    import { Game } from '../game/logic'
    import { World } from '../game/world'
    import { Pacman } from '../game/pacman'
    import { GameState } from '../game/state'
    import { pacmanName, pacmanId, globalState } from '../store'
    import type { WebrtcProvider } from 'y-webrtc'
    import { KeyState } from '../game/keyboard';
    import { GlobalConfig } from '../game/global_config';
    
    export let ydoc: Y.Doc

    console.log("Game created")

    const gameStartAudio = new Audio("./audio/game_start.mp3")

    let score = 0
    let lives = 3

    let keys = new KeyState()
    let state = new GameState(ydoc)

    let game = new Game()
    let renderer = game.createRenderer()
    let scene = game.createScene()
    globalState.set(state)

    let map = new World(scene, state)
    let pacman =  new Pacman($pacmanId, $pacmanName)
    state.setCurrentPacman(pacman)
    pacman.addToScene(scene, pacman)
    
    let camera = new Camera(renderer, pacman)
    let hudCamera = new HUDCamera(map)
    let deadPacmans = new Array<Pacman>()
        
    let frameCounter = 0
    let isGameStarted = false

    let scatterTimer
    let lastScatterMode = false

    let interval = setInterval(() => {
        let started = state.checkIfAllPlaying()
        if(started) {
            let pId = state.getPacmanIndex(pacman)
            pacman.setPosition(map.pacmanSpawn[pId])
            clearInterval(interval)
            gameStartAudio.play()
            setTimeout( () => {
                isGameStarted = true

                setTimeout(() => {
                    game.printGhostsTarget(state)
                    game.printPacmans(state)
                }, 3000)

            }, GlobalConfig.START_TIME )
        }
    }, 100)

    // Main game loop
    game.gameLoop( (delta, now) => {
        ydoc.transact(() => {
            // Update local state
            state.updatePacmanLocal(scene)
            state.updateGhostsLocal()
            state.updateDotsLocal()

            if(state.isPowerDotEaten()) {
                console.log("SCATTER MODE")
                state.setScatterMode(true)
            }

            let scatterMode = state.getScatterMode()
            if( scatterMode && !lastScatterMode ) {
                clearTimeout(scatterTimer)
                scatterTimer = setTimeout( () => {
                    state.setScatterMode(false)
                }, GlobalConfig.SCATTER_TIME )
            }
            lastScatterMode = scatterMode

            if(isGameStarted && pacman.isAlive) {
                pacman.move(delta, keys, map)
                pacman.eatDot(state)
            }

            // Update other pacman frames
            for( let p of state.getPacmansList()) {
                p.update(pacman, now)
            }
            // Update pacam camera
            camera.updateCamera(delta, !pacman.isAlive)

            // Check offline clients
            // Compute target for necessary ghosts
            if(frameCounter % 60 == 0) {
                game.checkOfflinePacmans(state)
                game.computeGhostTarget(state)
            }

            if(frameCounter % 180 == 0) {
                deadPacmans = game.findNewDeadPacman(state, frameCounter)
                deadPacmans = deadPacmans
            }

            // Update ghosts position
            if(isGameStarted) {
                for( let g of state.getGhosts()) {
                    g.updateMaterial(scatterMode, state)
                    // Update only ghosts that are mine
                    if(g.pacmanTarget && g.pacmanTarget == pacman.id) {
                        g.move(delta, map, pacman, scatterMode)
                        state.setGhost(g)
                    }
                    
                    // Mitigates the delay caused by a bad internet connection
                    //game.moveFakeGhost(g, delta, map)
                    if(!state.checkGameEnded()) {
                        pacman.checkGhostCollision(g, state)
                        g.playAudio(pacman, scatterMode)
                    }
                }
            }

            // Current pacman is online

            pacman.isOnline = pacman.nLives != 0
            pacman.clock = frameCounter
            // Set current pacman state
            state.setPacman(pacman)
        })

        // Render main view
        renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height)
        camera.render(renderer, scene)
    
        // Render HUD
        hudCamera.render(renderer, scene)

        score = state.getScore()
        lives = pacman.nLives
        frameCounter++

        return false
    })

</script>

{#if deadPacmans.length}
    <div class="offline-box">
        {#each deadPacmans as pacman}
            <div class="element-offline">
                PacMan {pacman.name} is dead
            </div>  
        {/each}    
    </div>
{/if}
<div class="score-box">
    <div>
        <div class="element-score">
            SCORE
        </div>
        <div class="element-score">
            {score}
        </div>
    </div>
    <div>
        <div class="element-score">
            LIVES
        </div>
        <div class="element-score">
            {lives}
        </div>
    </div>
</div>

<style>
    .score-box {
        position: absolute;
        padding: 8px;
        right: 10px;
        top: 10px;
        background-color: #0000008c;
        z-index: 2;
        display: flex;
        flex-direction: row;
        align-content: center;
        justify-content: space-around;
        align-items: center;
        border-radius: 16px;
        border-color: #FFF;
        border-width: 4px;
        border-style: solid;
    }

    .offline-box {
        position: absolute;
        padding: 8px;
        left: 10px;
        top: 10px;
        background-color: #0000008c;
        color: #FFF;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-content: center;
        justify-content: space-around;
        align-items: center;
        border-radius: 16px;
        border-color: #FFF;
        border-width: 4px;
        border-style: solid;
    }

    .element-score {
        padding-top: 8px;
        padding-bottom: 8px;
        padding-left: 10px;
        padding-right: 10px;
        text-align: center;
        font-size: clamp(10px, 1.5vw, 22px);
        color: #FFF;
    }

    .element-offline {
        padding-top: 8px;
        padding-bottom: 8px;
        padding-left: 10px;
        padding-right: 10px;
        text-align: center;
        font-size: clamp(10px, 1.5vw, 22px);
        color: #FFF;
    }
</style>