<script lang="ts">
    import type * as Y from 'yjs'
    import { slide } from 'svelte/transition'
    import { quintInOut } from 'svelte/easing'
    import { pacmanName, pacmanId, globalState } from '../store'
    import { Utils } from '../game/utils'
    import type { Pacman } from '../game/pacman'
    import Loading from './Loading.svelte'
    import type { WebrtcProvider } from 'y-webrtc'

    export let ydoc: Y.Doc
    export let provider: WebrtcProvider

    const gameEndAudio = new Audio("./audio/intermission.mp3")

    // States
    // Show game screen if all other players are ready
    let hideMenu = false
    let insertName = true
    let pressStart = false
    let errorGameStarted = false

    let pName: string
    let pacmanList: Array<Pacman> = new Array<Pacman>()
    let scores: Array<[Pacman, number]> = new Array<[Pacman, number]>()

    // Update game state
	let gameState: Y.Map<any> = ydoc.getMap('game_state')
    let gameAlreadyStarted = false

    let gameStarted = false
    let gameEnded = false

    // Close connection when a tab loose focus
    document.onvisibilitychange = () => {
        if (document.visibilityState === "hidden" && gameStarted && !gameEnded) {
            closeConnection()
            hideMenu = false
            if( $globalState != null )
                $globalState.setGameEnded(true)
        }
    }

    let wWidth: number = window.innerWidth
    let wHeight: number = window.innerHeight

    window.addEventListener("resize", () => {
        wWidth = window.innerWidth
        wHeight = window.innerHeight
    })

    let mainInterval = setInterval(() => {
        // Check if game is started
		let value: boolean = gameState.get("game_started")
		if( value ) {
			gameAlreadyStarted = value
            if(gameAlreadyStarted && insertName){
                closeConnection()
            }

            if($globalState != null){
                // Check if all players are ready
                if(!gameStarted){
                    gameStarted = $globalState.checkIfAllPlaying()
                    if(gameStarted){
                        console.log("Game started")
                        hideMenu = true
                    }
                }

                // Check if game is ended
                if(!gameEnded){
                    gameEnded = $globalState.checkGameEnded()
                    if(gameEnded){
                        console.log("Game Ended")
                        calcScores()
                        clearInterval(mainInterval)

                        hideMenu = false
                        provider.disconnect()
                        gameEndAudio.play()
                    }
                }
            }
		}
	}, 1000)

    function calcScores(){
        scores.length = 0
        for(let p of $globalState.getPacmansList()){
            if(p.isPlaying){
                let score = $globalState.getScore(p)
                scores.push([p, score])
            }
        }
        scores.sort((p1, p2) => p2[1] - p1[1] )
        scores = scores // for svelte
    }

    function closeConnection(){
        errorGameStarted = true
        provider.disconnect()
    }

    function handleSubmitName(e) {
        e.preventDefault()
        if( !gameAlreadyStarted ){
            updatePacmanList()
            pacmanName.set(pName)
            pacmanId.set(Utils.genRandomId())
            insertName = false
            pressStart = true
        } else {
            closeConnection()
        }
	}

    let intervalPacmanList: any;
    function updatePacmanList(){
        intervalPacmanList = setInterval(() => {
            if($globalState != null){
                pacmanList = new Array<Pacman>()
                for(let p of $globalState.getPacmansList()){
                    if(p.isOnline)
                        pacmanList.push(p)
                }
                pacmanList = pacmanList // for svelte reactivity
            }
        }, 200)
    }

    function startGame(){
        clearInterval(intervalPacmanList)
	    gameState.set("game_started", true)
        $globalState.setCurrentPacmanPlaying(true)
        pressStart = false
    }

</script>

{#if !hideMenu}
    <div class = "init" 
        transition:slide={{delay: 400, duration: 700, easing: quintInOut }}
        style = "width: {wWidth + "px"}; height: {wHeight + "px"}">
        <img src="./img/pacman_logo.png" alt="pacman logo">
        {#if errorGameStarted}
            <div style="height:50px;"/>
            <h1>Game already started</h1>
            <h3>Try another time</h3>
        {:else if insertName}
            <div style="height:40px;"/>
            <h1>Insert your nickname</h1>
            <form class="nick-insert" on:submit={handleSubmitName}>
                <input type="text" maxlength="10" minlength="2" bind:value={pName}/>
                <div style="width:10px;"/>
                <button class="game-start" >GO</button>
            </form>
        {:else if pressStart}
            <div style="height:30px;"/>
            <button on:click={()=>{startGame()}} class="game-start">START GAME</button>
            <div style="height:30px;"/>
            <h1>Players</h1>
            <div class="pacman-list">
                {#each pacmanList as pacman}
                    <div class="text-box">
                        {pacman.name} {#if $pacmanId == pacman.id}(YOU){/if}
                    </div>
                {/each}
            </div>
        {:else if gameEnded}
            <div style="height:30px;"/>
            {#if scores[0][0].id == $pacmanId && scores.length > 1}
                <h1>YOU WON</h1>
            {:else}
                <h1>YOU LOST</h1>
            {/if}
            <div style="height:30px;"/>
            <h1>HIGH SCORES</h1>
            <div class="pacman-list">
                {#each scores as pacman, i}
                    <div class="list-row">
                        <div class="text-box">
                           {i == 0 ? (i+1) + "ST" : 
                            i == 1 ? (i+1) + "ND" : 
                            i == 2 ? (i+1) + "RD" : (i+1) + "TH"}
                        </div>
                        <div class="text-box">
                            {pacman[0].name} {#if $pacmanId == pacman[0].id}(YOU){/if}
                        </div>
                        <div class="text-box">
                            {pacman[1]}
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div style="height:50px;"/>
            <h1>Waiting other players</h1>
            <Loading></Loading>
        {/if}
        <div style="flex:1;"/>
        <div class="credits">Credits: @Vallac</div>
    </div>
{/if}

<style>
    .init {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: #ffdf00;
        display: flex;
        flex-direction: column;
        align-content: center;
        align-items: center;
        z-index: 5;
    }

    .init img {
        margin-top: 20px;
        width: clamp(200px, 40%, 700px);
    }

    .pacman-list {
        width: 100%;
        overflow-y: scroll;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    h1 {
        margin-top: 20px;
        text-align: center;
        font-size: clamp(16px, 3vw, 30px);
    }

    .text-box {
        margin-top: 10px;
        margin-bottom: 10px;
        text-align: center;
        font-size: clamp(12px, 2vw, 26px);
    }

    .list-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: min(50%, 700px);
    }
    
    .game-start {
        background-color: #fcc73f;
        border: 4px solid #231f20;
        border-radius: 10px;
        box-shadow: 5px 5px #ee2a29;
        color: #231f20;
        cursor: pointer;
        font-size: clamp(16px, 3vw, 30px);
        outline: none;
        padding: 16px;
        text-align: center;
        margin-top: 30px;
        margin-bottom: 30px;
    }

    .game-start:active {
        box-shadow: none;
        transform: translateX(5px) translateY(5px);
    }

    input[type=text] {
        width: clamp(300px, 40%, 700px);
        padding: 16px;
        display: inline-block;
        border: 4px solid rgba(0, 0, 0, 0.534);
        border-radius: 10px;
        background-color: transparent;
        box-sizing: border-box;
        font-size: clamp(16px, 3vw, 30px);
    }

    input[type=text]:focus {
        outline: none; 
        border: 4px solid #000;
    }

    .nick-insert {
        height: 80px;
        display: flex;
        justify-content: center;
        align-items: center;
        align-content: center;
    }

    .credits {
        font-size: clamp(10px, 2vw, 20px);
        margin-bottom: 24px;
    }
 </style>