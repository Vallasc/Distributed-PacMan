import * as THREE from "three"
import type { WebrtcProvider } from "y-webrtc"
import type { Ghost } from "./ghost"
import { Pacman } from "./pacman"
import type { GameState } from "./state"
import type { World } from "./world"
export class Game {

    static readonly GHOST_SPEED = Pacman.PACMAN_SPEED - 1
    static readonly GHOST_RADIUS = Pacman.PACMAN_RADIUS * 1.25

    public createRenderer() {
        let pixelRatio = window.devicePixelRatio
        let AA = true
        if (pixelRatio > 1) {
          AA = false
        }
        
        let renderer = new THREE.WebGLRenderer({
          antialias: AA,
          //"high-performance", "low-power" or "default"
          powerPreference: "high-performance",
          //"highp", "mediump" or "lowp"
          precision: "lowp"
        })

        renderer.setClearColor('black', 1.0)
        renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(renderer.domElement)
        // Reduce resolution for performance
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
                //setTimeout(render, 0)
        }
        requestAnimationFrame(render)
        //setTimeout(render, 0)
    }

    // return map<pacmanId, [Pacman, ghostNumber]
    private computeAssignablePacmans(pacmansMap: Map<string, Pacman>): Map<string, [Pacman, number]> {
        let assignablePacmans = new Map<string, [Pacman, number]>()
        for(let p of pacmansMap){
            if(p[1].isOnline){
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

    public checkOfflinePacmans(provider: WebrtcProvider, state: GameState){
        let connected = provider.awareness.getStates()
        //console.log(connected)
        for( let p of state.getPacmansList()){
            if(p.peerId != state.currentPacman.peerId){
                if(p.isOnline){
                    p.isOnline = connected.has(p.peerId)
                    state.setPacman(p)
                    //console.log("Pacman " + p.name + " status online: " + p.isOnline)
                }
            } else { // It's me, i'm alive
                p.isOnline = true
                state.setPacman(p)
            }
        }
    }

    public lastGhostFreezePositions = new Map<string, THREE.Vector3>()
    public lastGhostFakePositions = new Map<string, THREE.Vector3>()
    public moveFakeGhost(ghost: Ghost, delta: number, map: World){
        let lastFreezePosition = this.lastGhostFreezePositions.get(ghost.id)
        let lastFakePosition = this.lastGhostFakePositions.get(ghost.id)
        if(!lastFreezePosition){
            lastFreezePosition = new THREE.Vector3()
            this.lastGhostFreezePositions.set(ghost.id, lastFreezePosition)
        }
        if(!lastFakePosition){
            lastFakePosition = new THREE.Vector3()
            this.lastGhostFakePositions.set(ghost.id, lastFakePosition)
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
}