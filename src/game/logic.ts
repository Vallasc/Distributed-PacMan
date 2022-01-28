import * as THREE from "three"
import type { Pacman } from "./pacman"
import type { GameState } from "./state"
export class Game {
    public createRenderer() {
        let renderer = new THREE.WebGLRenderer({
          antialias: false,
          //"high-performance", "low-power" or "default"
          powerPreference: "low-power",
          //"highp", "mediump" or "lowp"
          precision: "lowp"
        })

        renderer.setClearColor('black', 1.0)
        renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(renderer.domElement)
        return renderer
    }

    public createScene() {
        let scene = new THREE.Scene()

        // Add lighting
        scene.add(new THREE.AmbientLight(0x888888))
        let light = new THREE.SpotLight('white', 0.5)
        light.position.set(0, 0, 50)
        scene.add(light)


        return scene
    }


    public gameLoop(callback : (delta: number, now: number) => any) {
        let previousFrameTime = window.performance.now()

        // How many seconds the animation has progressed in total.
        let animationSeconds = 0

        let render = () => {
            let now = window.performance.now()
            let animationDelta = (now - previousFrameTime) / 1000
            previousFrameTime = now

            // requestAnimationFrame will not call the callback if the browser
            // isn't visible, so if the browser has lost focus for a while the
            // time since the last frame might be very large. This could cause
            // strange behavior (such as objects teleporting through walls in
            // one frame when they would normally move slowly toward the wall
            // over several frames), so make sure that the delta is never too
            // large.
            animationDelta = Math.min(animationDelta, 1/30)

            // Keep track of how many seconds of animation has passed.
            animationSeconds += animationDelta

            let ret = callback(animationDelta, animationSeconds)

            if(!ret)
                requestAnimationFrame(render)
        }
        requestAnimationFrame(render)
    }

    // return map<pacmanId, [Pacman, ghostNumber]
    private computeAssignablePacmans(pacmansMap: Map<string, Pacman>): Map<string, [Pacman, number]> {
        let assignablePacmans = new Map<string, [Pacman, number]>()
        for(let p of pacmansMap){
            if(p[1].isOnline && p[1].isPlaying){
                assignablePacmans.set(p[0], [p[1], 0])
            }
        }
        return assignablePacmans;
    }

    public computeGhostTarget(state: GameState){
        let pacmansMap = state.getPacmansMap()
        let ghosts = Array.from(state.getGhosts())
        let ghostsSize = 0
        let recomputeGhosts = false
        let assignablePacmans = this.computeAssignablePacmans(pacmansMap)

        // Clean ghosts state
        // Remove from assignable all pacmans that are already assigned and are alive
        for(let ghost of ghosts){
            if(ghost.pacmanTarget){
                let pacman = assignablePacmans.get(ghost.pacmanTarget)
                if(pacman){
                    pacman[1]++
                } else {
                    ghost.pacmanTarget = null
                    recomputeGhosts = true
                }
            } else {
                recomputeGhosts = true
            }
            ghostsSize++
        }

        let maxGhostPerPacman = Math.ceil(ghostsSize / assignablePacmans.size)
        assignablePacmans.forEach((value) => {
            // Max ghosts excedeed
            if(value[1] > maxGhostPerPacman){
                recomputeGhosts = true
            }
        })
        if(recomputeGhosts) {
            let toPrint = "| Ghosts targets\n"
            for(let ghost of ghosts){
                if(assignablePacmans.size == 0 )
                    assignablePacmans = this.computeAssignablePacmans(pacmansMap)

                let assignablePList = Array.from(assignablePacmans.values())
                if(assignablePList.length == 0)
                    return
                let randomIndex = Math.floor(Math.random() * assignablePList.length)
                let randomPacman: Pacman = assignablePList.at(randomIndex)[0]
                assignablePacmans.delete(randomPacman.id)
                ghost.pacmanTarget = randomPacman.id
                toPrint += "| ghost" + ghost.id + "\t -> " + randomPacman.name + "\n"
            }
            console.log(toPrint)
            state.updateGhostsShared()
        }
    }

    /*public checkOfflinePacmans(provider: WebrtcProvider, state: GameState){
        let connected = provider.awareness.getStates()
        //console.log(connected)
        for( let p of state.getPacmansList()){
            if(p.peerId != state.currentPacman.peerId){
                if(p.isOnline){
                    p.isOnline = connected.has(p.peerId)
                    state.setPacman(p)
                    console.log("Pacman " + p.name + " status online: " + p.isOnline)
                }
            }
        }
    }*/

    private pacmansClock = new Map<string, number>()

    public checkOfflinePacmans(state: GameState) {
        for( let p of state.getPacmansList()){
            if(p.id != state.currentPacman.id && p.isOnline) {
                if(this.pacmansClock.get(p.id) == null) {
                    this.pacmansClock.set(p.id, p.clock);
                    console.log("New Pacman " + p.name + ", status online")
                }
                    
                if(p.clock == this.pacmansClock.get(p.id)) { // Offline - not updating ui
                    p.isOnline = false
                    state.setPacman(p)
                    if( p.isPlaying )
                        console.log("Lost Pacman " + p.name + ", status offline")
                }
                // console.log("Clock " + p.clock + ", CLock last " + this.pacmansClock.get(p.id))
                // console.log("Pacman " + p.name + " status online: " + p.isOnline)
                this.pacmansClock.set(p.id, p.clock);
            }
        }
    }
}