<script lang="ts">
    import type * as Y from 'yjs'
    import { Camera, HUDCamera } from '../game/camera'
    import { Game } from '../game/logic'
    import { World } from '../game/world'
    import { Pacman } from '../game/pacman'
    import { GameState } from '../game/state'
    import { pacmanName, pacmanId, globalState, mute } from '../store'
    import { KeyState } from '../game/keyboard';
    import { GlobalConfig } from '../game/global_config';
    import { Ghost } from '../game/ghost';
    
    export let ydoc: Y.Doc

    console.log("Pacman name: " + $pacmanName)
    console.log("Game created")

    const gameStartAudio = new Audio("./audio/game_start.mp3")
    $: gameStartAudio.muted = $mute
    $: Pacman.setMute($mute)
    $: Ghost.setMute($mute)

    let score = 0
    let lives  = [true, true, true]

    let keys = new KeyState()
    let state = new GameState(ydoc)

    let game = new Game()
    let renderer = game.createRenderer()
    let scene = game.createScene()

    let map = new World(scene, state)
    let pacman =  new Pacman($pacmanId, $pacmanName, lives.length)
    state.setCurrentPacman(pacman)
    $globalState = state

    pacman.addToScene(scene, pacman)
    
    let camera = new Camera(renderer, pacman)
    let hudCamera = new HUDCamera(map)
    let deadPacmans = new Array<Pacman>()
        
    let frameCounter = 0
    let isGameStarted = false

    let scatterTimer
    let lastScatterMode = false

    let interval = setInterval(() => {
        if(state.checkIfStarted()) {
            console.log("Started true")
            clearInterval(interval)

            setTimeout(() => {
                let pId = state.getPacmanIndex(pacman)
                pacman.setPosition(map.pacmanSpawn[pId])

                gameStartAudio.play()
                // Start game after START_TIME
                setTimeout( () => {
                    isGameStarted = true
                    // Prtin pacman, ghosts report
                    setTimeout(() => {
                        game.printGhostsTarget(state)
                        game.printPacmans(state)
                    }, 2000)

                }, GlobalConfig.START_TIME )
            }, GlobalConfig.BEFORE_START_TIME )
        }
    }, 200)

    let lastTimeCheckOffline = window.performance.now()
    let lastTimeComputeGhost = window.performance.now()
    let lastTimeNewDeadPacman = window.performance.now()

    // Main game loop
    game.gameLoop( (delta, aniamtionTime, now) => {

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
            if( scatterMode && !lastScatterMode ) { // TODO
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
            for( let p of state.getPacmansList() ){
                p.update(pacman, aniamtionTime)
            }
            // Update pacam camera
            camera.updateCamera(delta, !pacman.isAlive)

            // Check offline clients
            // Compute target for necessary ghosts
            if(now - lastTimeCheckOffline > 2000 ) { // each second
                lastTimeCheckOffline = now
                //console.log("CheckOffline");
                game.checkOfflinePacmans(state, isGameStarted)
            }
            
            if(now - lastTimeComputeGhost > 1000) {
                lastTimeComputeGhost = now
                //console.log("ComputeGhost");
                game.computeGhostTarget(state)
            }

            if(now - lastTimeNewDeadPacman > 3000) {
                lastTimeNewDeadPacman = now
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
        if(lives.length != pacman.nLives) {
            lives = new Array(pacman.nLives)
        }

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
            <div class="blank-image"/>
            {#each lives as _}
                <img src="./img/pacman.svg" alt="pacman life"/>
            {/each}
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

    .element-score img {
        height:clamp(10px, 1.5vw, 22px);
        margin-left: 3px;
        margin-right: 3px;
    }

    .blank-image {
        height:clamp(10px, 1.5vw, 22px); 
        display: inline-block;
    }
</style>