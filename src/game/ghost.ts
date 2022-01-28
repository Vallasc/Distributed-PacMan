import type { BufferGeometry } from 'three'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { Dot, World } from './world'
import type { Pacman } from './pacman'
import { Mesh, Utils } from './utils'
import type { GameState } from './state'

export class Ghost {
    static readonly GHOST_SCALE = 0.162
    static readonly Z_OFFSET = -0.2
    static readonly GHOST_SPEED = 2
    static readonly GHOST_SPEED_EATEN = Ghost.GHOST_SPEED * 2
    static readonly SCATTER_MATERIAL_1 = new THREE.MeshBasicMaterial({ color: 'white', side: THREE.DoubleSide })
    static readonly SCATTER_MATERIAL_2 = new THREE.MeshBasicMaterial({ color: 'blue', side: THREE.DoubleSide })
    static readonly SCATTER_MATERIAL_EAT = new THREE.MeshBasicMaterial({ color: 'white', side: THREE.DoubleSide })
    static readonly SIREN_DISTANCE = 5
    static readonly SIREN_AUDIO = new Audio("./audio/siren_1.mp3")
    static readonly EYES_AUDIO = new Audio("./audio/eyes.mp3")

    static LOADED_GEOMETRY: BufferGeometry
    static readonly EATEN_GEOMETRY: THREE.SphereGeometry = new THREE.SphereGeometry(Dot.DOT_RADIUS);

    public scatterMaterialCounter: number
    public material: THREE.MeshPhongMaterial
    public color: THREE.ColorRepresentation
    public initialPosition: THREE.Vector3
    public pacmanTarget: string // Pacman Id
    public isEaten: boolean

    public positionTarget: THREE.Vector3
    public direction: THREE.Vector3
    public mesh: Mesh
    public id: string
    public exitHome: boolean

    constructor(id: string, position: THREE.Vector3, color: THREE.ColorRepresentation, afterLoading: () => void = ()=>{}){
        if(Ghost.LOADED_GEOMETRY == null){
            let stlLoader = new STLLoader()
            let self = this
            stlLoader.load(
                'misc/ghost.stl',
                (geometry) => {
                    Ghost.LOADED_GEOMETRY = geometry
                    self.makeMesh(position, color)
                    afterLoading()
                },
                (xhr) => {},
                (error) => {
                    console.log(error)
                }
            ) 
        } else {
            this.makeMesh(position, color)
            afterLoading()
        }
        this.color = color
        this.id = id
        this.direction = new THREE.Vector3(-1, 0, 0)
        this.pacmanTarget = null
        this.initialPosition = position.clone()
        this.exitHome = true
        this.scatterMaterialCounter = 0
        this.isEaten = false
        Ghost.SIREN_AUDIO.currentTime = 5
        Ghost.EYES_AUDIO.currentTime = 5
    }

    // Make 3d mesh
    public makeMesh(position: THREE.Vector3, color: THREE.ColorRepresentation) {
        this.material = new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide })
        this.mesh = new Mesh(Ghost.LOADED_GEOMETRY, this.material)
        this.mesh.position.set(position.x, position.y, position.z + Ghost.Z_OFFSET)
        this.mesh.scale.set(Ghost.GHOST_SCALE, Ghost.GHOST_SCALE, Ghost.GHOST_SCALE)
        this.mesh.isGhost = true
    }

    // Set visible property
    public setVisible(value: boolean) {
        this.mesh.visible = value
    } 

    // Get ghost position
    public getPosition() {
        return this.mesh.position
    } 

    // Add ghost mesh to 3d scene
    public addToScene(scene: THREE.Scene) {
        scene.add(this.mesh)
    }

    public setGhostEaten(value: boolean, state: GameState){
        this.isEaten = value;
        state.setGhost(this)
    }

    public updateMaterial(scatterMode: boolean, state: GameState) {
        if(scatterMode) {
            if(!this.isEaten){
                if(this.scatterMaterialCounter++ % 20 < 10)
                    this.mesh.material = Ghost.SCATTER_MATERIAL_1
                else
                    this.mesh.material = Ghost.SCATTER_MATERIAL_2
                this.mesh.scale.set(Ghost.GHOST_SCALE, Ghost.GHOST_SCALE, Ghost.GHOST_SCALE)
            } else {
                this.mesh.material = Ghost.SCATTER_MATERIAL_EAT
                this.mesh.geometry = Ghost.EATEN_GEOMETRY
                this.mesh.scale.set(1, 1, 1)
            }
        } else {
            this.mesh.material = this.material
            this.mesh.geometry = Ghost.LOADED_GEOMETRY
            if(this.isEaten)
                this.setGhostEaten(false, state)
            this.mesh.scale.set(Ghost.GHOST_SCALE, Ghost.GHOST_SCALE, Ghost.GHOST_SCALE)
        }
    }

    public playAudio( pacmanTarget: Pacman, scatterMode: boolean ) {
        if(scatterMode && this.isEaten){
            this.playEyesAudio()
        } else {
            this.playSirenAudio(pacmanTarget)
        }
    }

    private playSirenAudio( pacmanTarget: Pacman ) {
        if(Utils.distance(this.mesh.position, pacmanTarget.mesh.position) < Ghost.SIREN_DISTANCE 
            && Ghost.SIREN_AUDIO.ended) {
            Ghost.SIREN_AUDIO.play()
        }
    }

    private playEyesAudio() {
        if(Ghost.EYES_AUDIO.ended) {
            Ghost.EYES_AUDIO.play()
        }
    }

    // Update ghost position based on current state
    public move(delta: number, levelMap: World, pacmanTarget: Pacman, scatterMode: boolean) {
        if(!this.pacmanTarget || this.pacmanTarget != pacmanTarget.id) return

        if(this.exitHome && !scatterMode) {
            this.positionTarget = levelMap.exitGhostTarget
        } else if(scatterMode) {
            this.positionTarget = levelMap.ghostHomeTarget
            this.exitHome = true
        } else {
            this.positionTarget = pacmanTarget.mesh.position
        }

        if(this.exitHome && Utils.distance(this.mesh.position, levelMap.exitGhostTarget) < 1)
            this.exitHome = false

        let previousPosition = new THREE.Vector3().copy(this.mesh.position).addScaledVector(this.direction, 0.5).round()
        let ghostSpeed = this.isEaten ? Ghost.GHOST_SPEED_EATEN : Ghost.GHOST_SPEED
        this.mesh.translateOnAxis(this.direction, delta * ghostSpeed)
        let currentPosition = new THREE.Vector3().copy(this.mesh.position).addScaledVector(this.direction, 0.5).round()

        // If the ghost is transitioning from one cell to the next, see if they can turn.
        if (!currentPosition.equals(previousPosition)) {
            let leftTurn = new THREE.Vector3().copy(this.direction).applyAxisAngle(Utils.UP, Math.PI / 2)
            let rightTurn = new THREE.Vector3().copy(this.direction).applyAxisAngle(Utils.UP, -Math.PI / 2)

            let leftPosition = new THREE.Vector3().copy(this.mesh.position).add(leftTurn)
            let rightPosition = new THREE.Vector3().copy(this.mesh.position).add(rightTurn)

            let forwardWall = levelMap.isWall(currentPosition, this.exitHome )
            let leftWall = levelMap.isWall(leftPosition, this.exitHome )
            let rightWall = levelMap.isWall(rightPosition, this.exitHome )

            let distances : Array<[number, THREE.Vector3]> = []
            let minDistance: [number, THREE.Vector3] = [1000, this.direction]
            if(!leftWall) distances.push([Utils.distance(leftPosition, this.positionTarget), leftTurn])
            if(!rightWall) distances.push([Utils.distance(rightPosition, this.positionTarget), rightTurn])
            if(!forwardWall) distances.push([Utils.distance(currentPosition, this.positionTarget), this.direction])

            for(let d of distances)
                minDistance = d[0] < minDistance[0] ? d : minDistance

            let makeError = Math.floor(Math.random() * 9) < 3 /* [0,9] */ && !scatterMode
            if(makeError || (pacmanTarget && !pacmanTarget.isAlive) ) {
                let index = Math.floor(Math.random() * distances.length)
                this.direction.copy(distances[index][1])
            } else {
                this.direction.copy(minDistance[1])
            }
            // Snap ghost to center of current cell and start moving in new direction.
            this.mesh.position.round().addScaledVector(this.direction, delta)
        }
        levelMap.wrapObject(this.mesh)
    }

    // Get plain js object
    public toPlainObj(): Object {
        let obj: any = {}
        obj["id"] = this.id
        obj["position"] = [ this.mesh.position.x, this.mesh.position.y, this.mesh.position.z]
        obj["color"] = this.color
        obj["direction"] = [ this.direction.x, this.direction.y, this.direction.z]
        obj["initialPosition"] = [ this.initialPosition.x, this.initialPosition.y, this.initialPosition.z]
        obj["pacmanTarget"] = this.pacmanTarget
        obj["isEaten"] = this.isEaten
        obj["exitHome"] = this.exitHome
        return obj
    }

    // New ghost from plain js object
    public static fromObj(obj: any): Ghost {
        let position = new THREE.Vector3(obj["position"][0], obj["position"][1], obj["position"][2])
        let out = new Ghost(obj["id"], position, obj["color"])
        out.copyObj(obj)
        return out
    }

    public copyObj(obj: any) {    
        this.mesh.position.set(obj["position"][0], obj["position"][1], obj["position"][2])
        this.direction.set(obj["direction"][0], obj["direction"][1], obj["direction"][2])
        this.initialPosition.set(obj["initialPosition"][0], obj["initialPosition"][1], obj["initialPosition"][2])
        this.pacmanTarget = obj["pacmanTarget"]
        this.isEaten = obj["isEaten"]
        this.exitHome = obj["exitHome"]
    }
}