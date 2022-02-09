import * as THREE from "three"
import type { Pacman } from "./pacman"
import type { GameState } from "./state"
export class Game {
    public deadPacmans = new Map<Pacman, number>()
    private pacmansClock = new Map<string, [number, number]>() // [clock, retryCount]

    public createRenderer() {
        let renderer = new THREE.WebGLRenderer({
          antialias: false,
          powerPreference: "high-performance",
          //"highp", "mediump" or "lowp"
          precision: "lowp",
          alpha: false,
          stencil: false
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

    public gameLoop(callback : (delta: number, now: number, fps: number) => any) {
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

            let ret = callback(animationDelta, animationSeconds, now)

            if(!ret)
                requestAnimationFrame(render)
        }
        requestAnimationFrame(render)
    }

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
        if(assignablePacmans.size == 0) return

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

        let minGhostPerPacman = Math.floor(ghostsSize / assignablePacmans.size)
        assignablePacmans.forEach((value) => {
            // Max ghosts excedeed
            recomputeGhosts = recomputeGhosts || value[1] < minGhostPerPacman 
        })

        if(recomputeGhosts) {
            let toPrint = "Compute Ghosts targets\n"
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
                toPrint += "\tghost" + ghost.id + "\t -> " + randomPacman.name + "\n"
            }
            console.log(toPrint)
            state.updateGhostsShared()
        }
    }

    public checkOfflinePacmans(state: GameState, isGameStarted: boolean) {
        for( let p of state.getPacmansList()){
            if(p.id != state.currentPacman.id && p.isOnline) {
                if(this.pacmansClock.get(p.id) == null) {
                    this.pacmansClock.set(p.id, [p.clock, 0]);
                    console.log("New Pacman " + p.name + ", status online")
                }
                
                let pclock = this.pacmansClock.get(p.id)
                if(p.clock == pclock[0] && isGameStarted) { // Offline - not updating ui
                    //if(pclock[1] <= 0){
                        //pclock[1] = 3
                        p.isOnline = false
                        //state.setPacman(p)
                        if(isGameStarted)
                            state.setPacman(p)
                        console.log("Lost Pacman " + p.name + ", status offline")
                    //} 
                    /*else {
                        pclock[1]--
                    }*/
                }
                pclock[0] = p.clock
            }
        }
    }

    public printGhostsTarget(state: GameState){
        let toPrint = "Ghosts\n"
        for(let ghost of state.getGhosts()){
                let pacmanName = (ghost.pacmanTarget)
                        ? state.getPacman(ghost.pacmanTarget).name
                        : "null"
                toPrint += "\tghost" + ghost.id + "\t -> " + pacmanName + "\n"
            }
            console.log(toPrint)
    }

    public printPacmans(state: GameState){
        let toPrint = "Pacmans\n"
        for(let pacman of state.getPacmansList()){
                toPrint += "\t" + pacman.name + ",\t\tonline: " +  pacman.isOnline + 
                            ",\tplaying: " + pacman.isPlaying + "\n"
            }
            console.log(toPrint)
    }

    public findNewDeadPacman(state: GameState, frameCounter: number){
        let newDeadPacman = new Array<Pacman>()
        for(let pacman of state.getDeadPacmans()) {
            if(!this.deadPacmans.get(pacman))
                this.deadPacmans.set(pacman, frameCounter)
            if(this.deadPacmans.get(pacman) == frameCounter)
                newDeadPacman.push(pacman)
        }
        return  newDeadPacman
    }
}