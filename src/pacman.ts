import * as THREE from "three"
import { AbstractType } from "yjs"
import type { KeyState } from "./key_state"
import type { LevelMap } from "./level_map"
import type { GameState } from "./state"
import { Utils } from "./utils"
import * as TWEEN from "@tweenjs/tween.js"


export class Pacman extends AbstractType<any>{
    static readonly PACMAN_SPEED = 2
    static readonly PACMAN_RADIUS = 0.4

    private mesh: THREE.Mesh
    private frames: Array<THREE.SphereGeometry>
    //private currentFrame: number
    // public color
    
    public id: string
    private distanceMoved: number
    public direction: THREE.Vector3
    public isMoving: boolean
    public frameCounter: number
    //public numDotsEaten: number
    //public atePellet: boolean
    private tweenAnimation: TWEEN.Tween<THREE.Vector3> | null
    public deletedFlag: number = 0

    constructor(name: string, position: THREE.Vector3) {
        super()
        // Create spheres with decreasingly small horizontal sweeps, in order
        // to create pacman "death" animation.
        let pacmanGeometries = new Array<THREE.SphereGeometry>()
        let numFrames = 40
        for (let i = 0; i < numFrames; i++) {
            let offset = (i / (numFrames - 1)) * Math.PI
            pacmanGeometries.push(new THREE.SphereGeometry(Pacman.PACMAN_RADIUS, 32, 32, offset, Math.PI * 2 - offset * 2))
            pacmanGeometries[i].rotateX(Math.PI / 2)
        }

        let pacmanMaterial = new THREE.MeshPhongMaterial({ color: 'yellow', side: THREE.DoubleSide })

        this.mesh = new THREE.Mesh(pacmanGeometries[0], pacmanMaterial)
        this.frames = pacmanGeometries
        //this.currentFrame = 0

        this.distanceMoved = 0

        // Initialize pacman facing to the left.
        this.mesh.position.copy(position)
        this.direction = new THREE.Vector3(-1, 0, 0)

        //this.numDotsEaten = 0
        this.id = name
        this.frameCounter = 0
        this.isMoving = false
        this.tweenAnimation = null
    }

    // Update pacman mesh simulating the eat movement
    public updateFrame() {
        // Show eating animation based on how much pacman has moved.
        let maxAngle = Math.PI / 4
        let angle = (this.distanceMoved * 2) % (maxAngle * 2)
        if (angle > maxAngle)
            angle = maxAngle * 2 - angle
        let frame = Math.floor(angle / Math.PI * this.frames.length)
    
        this.mesh.geometry = this.frames[frame]

        // Update rotation based on direction so that mouth is always facing forward.
        // The "mouth" part is on the side of the sphere, make it "look" up but
        // set the up direction so that it points forward.
        this.mesh.up.copy(this.direction).applyAxisAngle(Utils.UP, -Math.PI / 2)
        this.mesh.lookAt((new THREE.Vector3()).copy(this.mesh.position).add(Utils.UP))
    }

    // Used to predict movement of other players to avoid glitch due to poor connection
    public calculateFakeMovement(delta: number) {
        if(this.isMoving){
            this.mesh.translateOnAxis(Utils.LEFT, Pacman.PACMAN_SPEED * delta)
        }
    }

    // Elaborate key pressed and change pacman position
    public movePacman(delta: number, keys: KeyState, levelMap: LevelMap, state: GameState) {
    
        this.isMoving = false
        // Move based on current keys being pressed.
        if (keys.getKeyState('KeyW') || keys.getKeyState('ArrowUp')) {
            // W - move forward
            //pacman.translateOnAxis(pacman.direction, PACMAN_SPEED * delta)
            // Because we are rotating the object above using lookAt, "forward" is to the left.
            this.mesh.translateOnAxis(Utils.LEFT, Pacman.PACMAN_SPEED * delta)
            this.distanceMoved += Pacman.PACMAN_SPEED * delta
            this.isMoving = true
        }
        if (keys.getKeyState('KeyA') || keys.getKeyState('ArrowLeft')) {
            // A - rotate left
            this.direction.applyAxisAngle(Utils.UP, Math.PI / 2 * delta)
            this.isMoving = true
        }
        if (keys.getKeyState('KeyD') || keys.getKeyState('ArrowRight')) {
            // D - rotate right
            this.direction.applyAxisAngle(Utils.UP, -Math.PI / 2 * delta)
            this.isMoving = true
        }
        if (keys.getKeyState('KeyS') || keys.getKeyState('ArrowDown')) {
            // S - move backward
            this.mesh.translateOnAxis(Utils.LEFT, -Pacman.PACMAN_SPEED * delta)
            this.distanceMoved += Pacman.PACMAN_SPEED * delta
            this.isMoving = true
        }

        // Check for collision with walls
        let leftSide = this.mesh.position.clone().addScaledVector(Utils.LEFT, Pacman.PACMAN_RADIUS).round()
        let topSide = this.mesh.position.clone().addScaledVector(Utils.TOP, Pacman.PACMAN_RADIUS).round()
        let rightSide = this.mesh.position.clone().addScaledVector(Utils.RIGHT, Pacman.PACMAN_RADIUS).round()
        let bottomSide = this.mesh.position.clone().addScaledVector(Utils.BOTTOM, Pacman.PACMAN_RADIUS).round()
        if (levelMap.isWall(leftSide)) {
            this.mesh.position.x = leftSide.x + 0.5 + Pacman.PACMAN_RADIUS
        }
        if (levelMap.isWall(rightSide)) {
            this.mesh.position.x = rightSide.x - 0.5 - Pacman.PACMAN_RADIUS
        }
        if (levelMap.isWall(topSide)) {
            this.mesh.position.y = topSide.y - 0.5 - Pacman.PACMAN_RADIUS
        }
        if (levelMap.isWall(bottomSide)) {
            this.mesh.position.y = bottomSide.y + 0.5 + Pacman.PACMAN_RADIUS
        }
    
        let cell = levelMap.getAt(this.mesh.position)
    
        // Make pacman eat dots.
        /*if (cell && cell.isDot === true && cell.visible === true) {
            levelMap.removeAt(this.mesh.position)
            //this.numDotsEaten += 1
        }*/

        let dots = state.getDots()
        let x = Math.round(this.mesh.position.x), y = Math.round(this.mesh.position.y)
        let dot = state.getDot(x, y)
        if(dot != null){
            dot.pacmanId = this.id
            state.setDot(dot)
        }
    
        // Make pacman eat power pellets.
        //this.atePellet = false
        if (cell && cell.isPowerPellet === true && cell.visible === true) {
            levelMap.removeAt(this.mesh.position)
            //this.atePellet = true
    
            //killSound.play()
        }
    }

    // Get pacman position
    public getPosition(): THREE.Vector3 {
        return this.mesh.position
    }

    // Add mesh to 3d scene
    public addToScene(scene: THREE.Scene) {
        scene.add(this.mesh)
    }

    // Get plain js object
    public toPlainObj(): Object {
        let obj: any = {}
        obj["id"] = this.id
        obj["position"] = [ this.mesh.position.x, this.mesh.position.y, this.mesh.position.z]
        obj["direction"] = [ this.direction.x, this.direction.y, this.direction.z]
        obj["distanceMoved"] = this.distanceMoved
        return obj
    }

    // New pacman from plain js object
    public static fromObj(obj: any): Pacman {
        let position = new THREE.Vector3(obj["position"][0], obj["position"][1], obj["position"][2])
        let direction = new THREE.Vector3(obj["direction"][0], obj["direction"][1], obj["direction"][2])
        let out = new Pacman(obj["id"], position)
        out.direction = direction
        out.distanceMoved = obj["distanceMoved"]
        return out
    }

    // Copy from a js plain object
    public copyObj(obj: any) {
        if(this.tweenAnimation != null) {
            this.tweenAnimation.end()
            this.tweenAnimation.stop()
        } 
        this.tweenAnimation = new TWEEN.Tween(this.mesh.position)
                            .to(new THREE.Vector3(obj["position"][0], obj["position"][1], obj["position"][2]), 50)
                            .start()
        
        //this.mesh.position.copy(new THREE.Vector3(obj["position"][0], obj["position"][1], obj["position"][2]))
        this.direction.copy(new THREE.Vector3(obj["direction"][0], obj["direction"][1], obj["direction"][2]))
        this.distanceMoved = obj["distanceMoved"]
    }

    // Copy object if it has the same id
    public copyObjIfSameId(obj: any): boolean{
        if(obj["id"] == this.id){
            this.copyObj(obj)
            return true
        }
        return false
    }
}