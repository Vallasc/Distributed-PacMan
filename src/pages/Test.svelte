<script lang="ts">
    import type { WebrtcProvider } from "y-webrtc";
    import { globalState, disconnectSignal } from '../store'

    export let provider: WebrtcProvider
    
    let transparent = false;
    let disconnect = false;
    let disconnectAfterStarted = true;

    function disconnectPeer() {
        console.log("Disconnect: " + disconnect)
        if(disconnect) {
            try{
                provider.disconnect()
            } catch (e) {
                console.log(e)
            }
        }
    }

    function transparentPacman() {
        console.log("Transparent: " + transparent)
        if($globalState) {
            $globalState.currentPacman.transparentMode = transparent
            $globalState.setPacman($globalState.currentPacman)
        }
    }


    $: disconnect, disconnectPeer()
    $: transparent, transparentPacman()
    $: $disconnectSignal = disconnectAfterStarted, 
                            console.log("Disconnect signal server after start: " + disconnectAfterStarted)
</script>

<div class="bottom-box">
    <div>
        <input type="checkbox" name="transaprent" bind:checked={transparent}>
        <label for="scales">Transparent mode</label>
    </div>
    <div>
        <input type="checkbox"  name="disconnect-peer" bind:checked={disconnect}>
        <label for="scales">Disconnect peer</label>
    </div>
    <div>
        <input type="checkbox"  name="disconnect-signal" bind:checked={disconnectAfterStarted}>
        <label for="scales">Disconnect signal</label>
    </div>
</div>

<style>
    .bottom-box {
        position: absolute;
        padding: 8px;
        right: 10px;
        bottom: 10px;
        background-color: #0000008c;
        color: #FFF;
        z-index: 100;
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
</style>