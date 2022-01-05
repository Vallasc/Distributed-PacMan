<script lang="ts">
    import type * as Y from 'yjs'
    import { slide } from 'svelte/transition';
    import { quintInOut } from 'svelte/easing';
    import { pacmanName, pacmanId, globalState } from '../store.js';
    import { Utils } from '../game/utils.js';
    import type { Pacman } from '../game/pacman.js';
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

    // Update game state
	let gameState: Y.Map<any> = ydoc.getMap('game_state')
    let gameStarted = false
	gameState.observeDeep(() => {
		let value: boolean = gameState.get("game_started")
		// control if not null and not false
		if( value ) {
			gameStarted = value
            if(gameStarted && insertName){
                closeConnection()
            }
		}
	})

    function closeConnection(){
        errorGameStarted = true
        provider.disconnect()
    }

    function handleSubmitName(e) {
        e.preventDefault()
        if( !gameStarted ){
            updatePacmanList()
            pacmanName.set(pName)
            pacmanId.set(Utils.genRandomId())
            insertName = false
            pressStart = true
        } else {
            closeConnection()
        }
	}

    let interval: any;
    function updatePacmanList(){
        interval = setInterval(() => {
            if($globalState != null){
                pacmanList = Array.from($globalState.getPacmans())
                pacmanList = pacmanList // for svelte reactivity
            }
        }, 200)
    }

    function startGame(){
        clearInterval(interval)
	    gameState.set("game_started", true)
        $globalState.setCurrentPacmanPlaying(true)
        pressStart = false
        isAllready()
    }

    function isAllready(){
        interval = setInterval(() => {
            if($globalState != null){
                hideMenu = $globalState.checkIfAllPlaying()
                if(hideMenu){
                    clearInterval(interval)
                }
            }
        }, 100)
    }

</script>

{#if !hideMenu}
    <div class="init" transition:slide={{delay: 200, duration: 600, easing: quintInOut }}>
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
                <button class="game-start" >Go</button>
            </form>
        {:else if pressStart}
            <button on:click={()=>{startGame()}} class="game-start">Start game</button>
            <h1>Players</h1>
            <div class="pacman-list">
                {#each pacmanList as pacman}
                    <div class="pacman-name">
                        {pacman.name}
                        {#if $pacmanId == pacman.id}(YOU){/if}
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
        width: clamp(300px, 40%, 700px);
    }

    .pacman-list {
        width: 100%;
        overflow-y: scroll;
    }

    h1 {
        margin-top: 20px;
        text-align: center;
        font-size: clamp(16px, 3vw, 30px);
    }

    .pacman-name {
        margin-top: 8px;
        margin-bottom: 8px;
        text-align: center;
        font-size: clamp(12px, 2vw, 26px);
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
        padding: 18px;
        display: inline-block;
        border: 3px solid #000;
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