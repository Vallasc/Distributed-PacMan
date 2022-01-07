import * as THREE from "three"
import type { WebrtcProvider } from "y-webrtc"
import { Pacman } from "./pacman"
import type { GameState } from "./state"
export class Game {

    // Constants
    // =========
    static readonly GHOST_SPEED = 1.5
    static readonly GHOST_RADIUS = Pacman.PACMAN_RADIUS * 1.25

    public createRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true })
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

    public createHudCamera(map) {
        let halfWidth = (map.right - map.left) / 2, halfHeight = (map.top - map.bottom) / 2

        let hudCamera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 1, 100)
        hudCamera.position.copy(new THREE.Vector3(map.centerX, map.centerY, 10))
        hudCamera.lookAt(new THREE.Vector3(map.centerX, map.centerY, 0))

        return hudCamera
    }

    public renderHud(renderer, hudCamera, scene) {
        // Increase size of pacman and dots in HUD to make them easier to see.
        scene.children.forEach(function (object) {
            if (object.isWall !== true)
                object.scale.set(2.5, 2.5, 2.5)
        })

        // Only render in the bottom left 200x200 square of the screen.
        renderer.enableScissorTest(true)
        renderer.setScissor(10, 10, 200, 200)
        renderer.setViewport(10, 10, 200, 200)
        renderer.render(scene, hudCamera)
        renderer.enableScissorTest(false)

        // Reset scales after rendering HUD.
        scene.children.forEach(function (object) {
            object.scale.set(1, 1, 1)
        })
    }


    // Generic functions
    // =================
    public distance(object1, object2) {
        let difference = new THREE.Vector3()
        // Calculate difference between objects' positions.
        difference.copy(object1.position).sub(object2.position)

        return difference.length()
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

            callback(animationDelta, animationSeconds)

            requestAnimationFrame(render)
        }
        requestAnimationFrame(render)
    }

    private computeAssignablePacmans(pacmansMap: Map<string, Pacman>): Map<string, Pacman> {
        let assignablePacmans = new Map<string, Pacman>()
        for(let p of pacmansMap){
            if(p[1].isOnline){
                assignablePacmans.set(p[0], p[1])
            }
        }
        return assignablePacmans;
    }

    public computeGhostTarget(state: GameState, overwrite: boolean = false){

        let pacmansMap = state.getPacmansMap()
        let ghosts = state.getGhosts()

        let assignablePacmans = this.computeAssignablePacmans(pacmansMap)
        // Remove from assignable all pacmans that are already assigned and are good
        for(let ghost of ghosts){
            if(overwrite){
                ghost.pacmanTarget = null
            }
            if(ghost.pacmanTarget){
                let pacman = pacmansMap.get(ghost.pacmanTarget)
                if(pacman && pacman.isOnline){ // good
                    assignablePacmans.delete(pacman.id)                    
                } else {
                    ghost.pacmanTarget = null
                }
            }
        }

        ghosts = state.getGhosts()
        for(let ghost of ghosts){
            // If there is less pacmans than ghosts assign multiple 
            if(!ghost.pacmanTarget){
                if(assignablePacmans.size == 0 )
                    assignablePacmans = this.computeAssignablePacmans(pacmansMap)
                let assignablePList = Array.from(assignablePacmans.values())
                let randomIndex = Math.floor(Math.random() * assignablePList.length)
                let randomPacman: Pacman = assignablePList.at(randomIndex)
                assignablePacmans.delete(randomPacman.id)
                ghost.pacmanTarget = randomPacman.id
                console.log("New pacman assigned to ghost" + ghost.id + "->" + randomPacman.name)
            }
        }

        state.updateGhostsShared()
    }

    public controlOfflinePacmans(provider: WebrtcProvider, state: GameState){
        let connected = provider.room.bcConns
        console.log(provider.room.peerId)
        console.log(connected)
        for( let p of state.getPacmansList()){
            /*if(!connected.has(p.peerId)){
                console.log("Peer list non ha  " + p.name)
                console.log("Peer list non ha  " + p.peerId)
            }*/
            /*if(p.peerId != pacman.peerId && p.isOnline && !connected.has(p.peerId)){
                p.isOnline = false
                state.setPacman(p)
                console.log("Offline pacman " + p.name)
                console.log("Offline pacman " + p.name)
            }*/
        }
    }
}