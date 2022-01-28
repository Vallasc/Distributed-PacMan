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
    
    let frameCounter = 0
    let recomputeGhostTargetFrame = Math.floor(Math.random() * 60)
    let isGameStarted = false

    let scatterTimer

    let interval = setInterval(() => {
        let started = state.checkIfAllPlaying()
        if(started) {
            let pId = state.getPacmanIndex(pacman)
            pacman.setPosition(map.pacmanSpawn[pId])
            clearInterval(interval)
            gameStartAudio.play()
            setTimeout( () => isGameStarted = true, GlobalConfig.START_TIME )
        }
    }, 100)


    // Main game loop
    game.gameLoop( (delta, now) => {
        ydoc.transact(()=>{
            // Update local state
            state.updatePacmanLocal(scene)
            state.updateGhostsLocal()
            state.updateDotsLocal()

            if(state.isPowerDotEaten()){
                console.log("SCATTER MODE")
                state.setScatterMode(true)
                clearTimeout(scatterTimer)
                scatterTimer = setTimeout( () => {
                    state.setScatterMode(false)
                }, GlobalConfig.SCATTER_TIME )
            }

            let scatterMode = state.getScatterMode()

            if(isGameStarted && pacman.isAlive){
                pacman.move(delta, keys, map)
                pacman.eatDot(state)
            }

            // Update other pacman frames
            for( let p of state.getPacmansList()){
                p.update(pacman, now)
            }
            // Update pacam camera
            camera.updateCamera(delta, !pacman.isAlive)

            // Check offline clients
            if(frameCounter % 60 == 0){
                game.checkOfflinePacmans(state)
            }
            // Compute target for necessary ghosts
            if(frameCounter % recomputeGhostTargetFrame == 0){
                game.computeGhostTarget(state)
            }

            // Update ghosts position
            if(isGameStarted){
                for( let g of state.getGhosts()) {
                    g.updateMaterial(scatterMode, state)
                    // Update only ghosts that are mine
                    if(g.pacmanTarget && g.pacmanTarget == pacman.id) {
                        g.move(delta, map, pacman, scatterMode)
                        state.setGhost(g)
                    }
                    
                    // Mitigates the delay caused by a bad internet connection
                    //game.moveFakeGhost(g, delta, map)
                    if(!state.checkGameEnded()){
                        pacman.checkGhostCollision(g, state)
                        g.playAudio(pacman, scatterMode)
                    }
                }
            }

            // Current pacman is online
            pacman.isOnline = true
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

        return /*state.checkGameEnded() && isGameStarted*/ false
    })

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
        padding: 8px;
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
        border-radius: 16px;
        border-color: #FFF;
        border-width: 4px;
        border-style: solid;
    }

    .element {
        padding-top: 8px;
        padding-bottom: 8px;
        padding-left: 10px;
        padding-right: 10px;
        text-align: center;
        font-size: clamp(12px, 2vw, 26px);
    }
</style>