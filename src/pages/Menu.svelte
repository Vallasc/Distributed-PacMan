<script lang="ts">
    import type * as Y from 'yjs'
    import { slide } from 'svelte/transition'
    import { quintInOut } from 'svelte/easing'
    import { pacmanName, pacmanId, globalState } from '../store.js'
    import { Utils } from '../game/utils.js'
    import { Pacman } from '../game/pacman.js'
    import Loading from './Loading.svelte'
    import type { WebrtcProvider } from 'y-webrtc'

    export let ydoc: Y.Doc
    export let provider: WebrtcProvider

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
                        provider.disconnect()
                        clearInterval(mainInterval)
                        setTimeout(() => {
                            hideMenu = false
                        }, Pacman.TIME_AFTER_DIE)
                    }
                }
            }

		}

	}, 1000)

    function calcScores(){
        scores.length = 0
        for(let p of $globalState.getPacmansList()){
            let score = $globalState.getScore(p)
            scores.push([p, score])
        }
        scores.sort((p1, p2) => p1[1] - p2[1] )
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
                pacmanList = Array.from($globalState.getPacmansList())
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
    <div class="init" transition:slide={{delay: 200, duration: 700, easing: quintInOut }}>
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
            <div style="height:20px;"/>
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
            <div style="height:20px;"/>
            <h1>YOU WON</h1>
            <div style="height:30px;"/>
            <h1>HIGH SCORES</h1>
            <div class="pacman-list">
                {#each scores as pacman}
                    <div class="list-row">
                        <div class="text-box">
                           1ST
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
 </style>