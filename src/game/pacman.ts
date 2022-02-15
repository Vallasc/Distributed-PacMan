import * as THREE from "three"
import type { KeyState } from "./keyboard"
import type { World } from "./world"
import type { GameState } from "./state"
import { Mesh, Utils } from "./utils"
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import JsonFont from "../font/Press_Start_2P_Regular.json";
import type { Ghost } from "./ghost"
import { mute } from '../store'

export class Pacman {
    static readonly PACMAN_SPEED = 3
    static readonly PACMAN_RADIUS = 0.4

    static readonly PACMAN_ONLINE_MATERIAL = new THREE.MeshLambertMaterial({ color: '#ffe400', side: THREE.DoubleSide })
    static readonly PACMAN_OFFLINE_MATERIAL = new THREE.MeshLambertMaterial({ color: 'gray', side: THREE.DoubleSide })

    static readonly TIME_AFTER_DIE = 8000
    static readonly EAT_DOT1_AUDIO = new Audio("./audio/dot_1.mp3")
    static readonly EAT_DOT2_AUDIO = new Audio("./audio/dot_2.mp3")
    static readonly DEATH_AUDIO = new Audio("./audio/death.mp3")
    static readonly EXTRA_LIFE_AUDIO = new Audio("./audio/extra_life.mp3")
    static readonly EAT_GHOST_AUDIO = new Audio("./audio/eat_ghost.mp3")
    static readonly POWER_UP_AUDIO = new Audio("./audio/power_up.mp3")


    public id: string
    public name: string
    public peerId: number

    // true if the player press start button
    public isPlaying: boolean
    // true if the player has tab open
    public isOnline: boolean

    // true if the pacman is alive
    public isAlive: boolean
    public nLives: number
    public lostTime: number

    public transparentMode: boolean = false

    public mesh: Mesh
    public textMesh: THREE.Mesh
    public dieTextMesh: THREE.Mesh
    public gameOverTextMesh: THREE.Mesh
    public static frames: Array<THREE.SphereBufferGeometry>
    // public color

    public distanceMoved: number
    public direction: THREE.Vector3
    public clock: number

    // Vector utils
    private leftSide = new THREE.Vector3()
    private topSide = new THREE.Vector3()
    private rightSide = new THREE.Vector3()
    private bottomSide = new THREE.Vector3()
    private lookAt = new THREE.Vector3()

        
    constructor(id: string, name: string, nLives: number) {
        this.id = id
        this.name = name
        this.isPlaying = false
        this.isOnline = true

        // Create spheres with decreasingly small horizontal sweeps, in order
        // to create pacman "death" animation.
        if(!Pacman.frames){
            Pacman.frames = new Array<THREE.SphereBufferGeometry>()
            let numFrames = 40
            for (let i = 0; i < numFrames; i++) {
                let offset = (i / (numFrames - 1)) * Math.PI
                Pacman.frames.push(new THREE.SphereBufferGeometry(Pacman.PACMAN_RADIUS, 24, 24, offset, Math.PI * 2 - offset * 2))
                Pacman.frames[i].rotateX(Math.PI / 2)
            }
        }

        let pacmanMaterial = Pacman.PACMAN_ONLINE_MATERIAL

        this.mesh = new Mesh(Pacman.frames[0], pacmanMaterial)
        this.distanceMoved = 0

        // Initialize pacman facing to the left.
        //this.mesh.position.copy(position)
        this.direction = new THREE.Vector3().copy(Utils.BOTTOM)
        
        this.makeYouDieText()
        this.makeGameOverText()

        this.isAlive = true
        this.nLives = nLives
        this.lostTime = -1
        this.mesh.isPacman = true
        this.clock = 0
        Pacman.EAT_DOT1_AUDIO.onended = () => Pacman.EAT_DOT2_AUDIO.play()
    }

    public static setMute(mute: boolean) {
        Pacman.EAT_DOT1_AUDIO.muted = mute
        Pacman.EAT_DOT2_AUDIO.muted = mute
        Pacman.DEATH_AUDIO.muted = mute
        Pacman.EXTRA_LIFE_AUDIO.muted = mute
        Pacman.EAT_GHOST_AUDIO.muted = mute
        Pacman.POWER_UP_AUDIO.muted = mute
    }

    public setPosition(position: THREE.Vector3){
        this.mesh.position.copy(position)
    }

    // Update pacman mesh simulating the eat movement
    public update(currentPacman: Pacman, timeNow: number) {
        // Animate model
        let frame: number

        if (this.nLives != 0) {
            if(!this.isAlive){
                if(this.lostTime == -1)
                    this.lostTime = timeNow
                // if pacman got eaten, show dying animation
                let angle = (timeNow - this.lostTime) * Math.PI / 2
                frame = Math.min(Pacman.frames.length - 1, Math.floor(angle / Math.PI * Pacman.frames.length))
            } else {
                this.lostTime = -1
                // show eating animation based on how much pacman has moved
                let maxAngle = Math.PI / 4
                let angle = (this.distanceMoved * 2) % (maxAngle * 2)
                if (angle > maxAngle)
                    angle = maxAngle * 2 - angle
                frame = Math.floor(angle / Math.PI * Pacman.frames.length)
            }
        } else {
            frame = 0
        }
        if(!this.isOnline)
            frame = 0

        this.mesh.geometry = Pacman.frames[frame]

        // Update rotation based on direction so that mouth is always facing forward.
        // The "mouth" part is on the side of the sphere, make it "look" up but
        // set the up direction so that it points forward.
        this.mesh.up.copy(this.direction).applyAxisAngle(Utils.UP, -Math.PI / 2)
        this.mesh.lookAt((new THREE.Vector3()).copy(this.mesh.position).add(Utils.UP))

        if(!this.isOnline || this.nLives == 0 ){
            this.mesh.material = Pacman.PACMAN_OFFLINE_MATERIAL
            if(this.textMesh){
                this.textMesh.material = Pacman.PACMAN_OFFLINE_MATERIAL
            }
        } else {
            this.mesh.material = Pacman.PACMAN_ONLINE_MATERIAL
            if(this.textMesh){
                this.textMesh.material = Pacman.PACMAN_ONLINE_MATERIAL
            }
        }

        // Update text mesh
        if(this.textMesh){
            // Position text just above pacman.
            this.textMesh.position.copy(this.mesh.position).add(Utils.UP)
            // Rotate text so that it faces same direction as pacman.
            this.textMesh.up.copy(currentPacman.direction)
            this.textMesh.lookAt(this.lookAt.copy(this.textMesh.position).add(Utils.UP))
            this.textMesh.rotateX(Math.PI/2)
            this.textMesh.visible = this.isAlive
        }

        if(this.dieTextMesh && currentPacman.id == this.id){
            // Position text just above pacman.
            this.dieTextMesh.position.copy(this.mesh.position).add(Utils.UP)
            // Rotate text so that it faces same direction as pacman.
            this.dieTextMesh.up.copy(currentPacman.direction)
            this.dieTextMesh.lookAt(this.dieTextMesh.position.clone().add(Utils.UP))
            this.dieTextMesh.translateZ(9)
            this.dieTextMesh.visible = !this.isAlive && !(this.nLives == 0)
        }

        if(this.gameOverTextMesh && currentPacman.id == this.id){
            // Position text just above pacman.
            this.gameOverTextMesh.position.copy(this.mesh.position).add(Utils.UP)
            // Rotate text so that it faces same direction as pacman.
            this.gameOverTextMesh.up.copy(currentPacman.direction)
            this.gameOverTextMesh.lookAt(this.gameOverTextMesh.position.clone().add(Utils.UP))
            this.gameOverTextMesh.translateZ(9)
            this.gameOverTextMesh.visible = !this.isAlive && (this.nLives == 0)
        }
    }

    // Elaborate key pressed and change pacman position
    public move(delta: number, keys: KeyState, levelMap: World) {
    
        // Move based on current keys being pressed.
        if (keys.getKeyState('KeyW') || keys.getKeyState('ArrowUp')) {
            // W - move forward
            // Because we are rotating the object above using lookAt, "forward" is to the left.
            this.mesh.translateOnAxis(Utils.LEFT, Pacman.PACMAN_SPEED * delta)
            this.distanceMoved += Pacman.PACMAN_SPEED * delta
        }
        if (keys.getKeyState('KeyA') || keys.getKeyState('ArrowLeft')) {
            // A - rotate left
            this.direction.applyAxisAngle(Utils.UP, Math.PI / 2 * delta)
        }
        if (keys.getKeyState('KeyD') || keys.getKeyState('ArrowRight')) {
            // D - rotate right
            this.direction.applyAxisAngle(Utils.UP, -Math.PI / 2 * delta)
        }
        if (keys.getKeyState('KeyS') || keys.getKeyState('ArrowDown')) {
            // S - move backward
            this.mesh.translateOnAxis(Utils.LEFT, -Pacman.PACMAN_SPEED * delta)
            this.distanceMoved += Pacman.PACMAN_SPEED * delta
        }

        // Check for collision with walls
        this.leftSide.copy( this.mesh.position ).addScaledVector(Utils.LEFT, Pacman.PACMAN_RADIUS).round()
        this.topSide.copy( this.mesh.position ).addScaledVector(Utils.TOP, Pacman.PACMAN_RADIUS).round()
        this.rightSide.copy( this.mesh.position ).addScaledVector(Utils.RIGHT, Pacman.PACMAN_RADIUS).round()
        this.bottomSide.copy( this.mesh.position ).addScaledVector(Utils.BOTTOM, Pacman.PACMAN_RADIUS).round()

        if (levelMap.isWall(this.leftSide)) {
            this.mesh.position.x = this.leftSide.x + 0.5 + Pacman.PACMAN_RADIUS
        }
        if (levelMap.isWall(this.rightSide)) {
            this.mesh.position.x = this.rightSide.x - 0.5 - Pacman.PACMAN_RADIUS
        }
        if (levelMap.isWall(this.topSide)) {
            this.mesh.position.y = this.topSide.y - 0.5 - Pacman.PACMAN_RADIUS
        }
        if (levelMap.isWall(this.bottomSide)) {
            this.mesh.position.y = this.bottomSide.y + 0.5 + Pacman.PACMAN_RADIUS
        }

        // Wrap packman to level map
        levelMap.wrapObject(this.mesh)
    
    }

    public eatDot(state: GameState){
        let x = Math.round(this.mesh.position.x), y = Math.round(this.mesh.position.y)
        let dot = state.getDot(x, y)
        if(dot && !dot.pacmanId) {
            dot.pacmanId = this.id
            state.updateDotShared(dot)
            Pacman.EAT_DOT1_AUDIO.play()
            if(dot.isPowerDot)
                setTimeout(() => Pacman.POWER_UP_AUDIO.play(), 1000)
        }
    }

    public checkGhostCollision(ghost: Ghost, state: GameState) {
        if(!this.transparentMode && this.isAlive &&
            Utils.distance(this.mesh.position, ghost.mesh.position) < Pacman.PACMAN_RADIUS*2){

            if( !state.getScatterMode() ){
                console.log("YOU DIED")
                this.nLives--
                this.isAlive = false
                if(this.nLives != 0){
                    setTimeout(()=>{
                        this.isAlive = true
                        Pacman.EXTRA_LIFE_AUDIO.play()
                    }, Pacman.TIME_AFTER_DIE)
                }
                Pacman.DEATH_AUDIO.play()
            } else if( !ghost.isEaten ) {
                console.log("GHOST EAT")
                state.setPacmanEatGhost(this, ghost)
                ghost.setGhostEaten(true, state)
                Pacman.EAT_GHOST_AUDIO.play()
                setTimeout(() => Pacman.POWER_UP_AUDIO.play(), 1000)
            }
        }
    }

    // Add mesh to 3d scene
    public addToScene(scene: THREE.Scene, currentPacman: Pacman) {
        scene.add(this.mesh)
        if(this.textMesh)
            scene.add(this.textMesh)
        if(currentPacman.id == this.id){
            scene.add(this.dieTextMesh)
            scene.add(this.gameOverTextMesh)
        }
    }

    public makeText(text: string, size: number, height: number, color: THREE.ColorRepresentation): THREE.Mesh {
        let textMaterial = new THREE.MeshPhongMaterial({color: color})
        // Show 3D text banner.
        let loader = new FontLoader()
        let font = loader.parse(JsonFont)

        let textGeometry = new TextGeometry(text, {
            font: font,
            size: size,
            height: height
        })

        let textMesh = new THREE.Mesh(textGeometry, textMaterial)
        let center = new THREE.Vector3()
        textMesh.geometry.computeBoundingBox()
        textMesh.geometry.boundingBox.getCenter(center)
        textMesh.geometry.center()
        return textMesh
    }

    public makeTextNick() {
        this.textMesh = this.makeText(this.name, 0.18, 0.05, "yellow")
    }

    public makeYouDieText() {
        this.dieTextMesh = this.makeText("YOU DIED", 0.7, 0.2, "red")
    }

    public makeGameOverText() {
        this.gameOverTextMesh = this.makeText("GAME OVER", 0.8, 0.2, "red")
    }

    // Get plain js object
    public toPlainObj(): Object {
        let obj: any = {}
        obj["id"] = this.id
        obj["name"] = this.name
        obj["peerId"] = this.peerId
        obj["position"] = [ this.mesh.position.x, this.mesh.position.y, this.mesh.position.z]
        obj["direction"] = [ this.direction.x, this.direction.y, this.direction.z]
        obj["distanceMoved"] = this.distanceMoved
        obj["isPlaying"] = this.isPlaying
        obj["isOnline"] = this.isOnline
        obj["isAlive"] = this.isAlive
        obj["nLives"] = this.nLives
        obj["clock"] = this.clock
        return obj
    }

    // New pacman from plain js object
    public static fromObj(obj: any): Pacman {
        let out = new Pacman(obj["id"], obj["name"], obj["nLives"])
        out.copyObj(obj)
        return out
    }

    // Copy from a js plain object
    public copyObj(obj: any) {    
        this.mesh.position.set(obj["position"][0], obj["position"][1], obj["position"][2])
        this.direction.set(obj["direction"][0], obj["direction"][1], obj["direction"][2])
        this.distanceMoved = obj["distanceMoved"]
        this.isPlaying = obj["isPlaying"]
        this.isOnline = obj["isOnline"]
        this.isAlive = obj["isAlive"]
        this.nLives = obj["nLives"]
        this.clock = obj["clock"]
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