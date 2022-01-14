import type { BufferGeometry } from 'three'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import type { World } from './world'
import type { Pacman } from './pacman'
import { Mesh, Utils } from './utils'
import type { GameState } from './state'

export class Ghost {
    static readonly GHOST_SCALE = 0.162
    static readonly Z_OFFSET = -0.2
    static readonly GHOST_SPEED = 2
    //static readonly GHOST_RADIUS = Pacman.PACMAN_RADIUS * 1.1
    static loadedGeometry: BufferGeometry
    static readonly GHOST_MATERIAL = new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide })
    static readonly OTHER_GHOST_MATERIAL = new THREE.MeshBasicMaterial({ color: 'green', side: THREE.DoubleSide })



    public initialPosition: THREE.Vector3
    public pacmanTarget: string // Pacman Id
    public positionTarget: THREE.Vector3
    public state: number // chase = 0, frightned = 1, eat = 2
    public direction: THREE.Vector3
    public mesh: Mesh
    public id: string
    public exitHome: boolean

    constructor(id: string, position: THREE.Vector3, afterLoading: () => void = ()=>{}){
        if(Ghost.loadedGeometry == null){
            let stlLoader = new STLLoader()
            let self = this
            stlLoader.load(
                'misc/ghost.stl',
                (geometry) => {
                    Ghost.loadedGeometry = geometry
                    self.makeMesh(position)
                    afterLoading()
                },
                (xhr) => {},
                (error) => {
                    console.log(error)
                }
            ) 
        } else {
            this.makeMesh(position)
            afterLoading()
        }
        this.id = id
        this.direction = new THREE.Vector3(-1, 0, 0)
        this.state = 0
        this.pacmanTarget = null
        this.initialPosition = position.clone()
        this.exitHome = true
    }

    // Make 3d mesh
    public makeMesh(position: THREE.Vector3) {
        let dotMaterial = Ghost.GHOST_MATERIAL
        //dotMaterial.flatShading = false
        this.mesh = new Mesh(Ghost.loadedGeometry, dotMaterial)
        this.mesh.geometry.computeVertexNormals()
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

    public moveFake(delta: number, levelMap: World) {
        let currentPosition = new THREE.Vector3().copy(this.mesh.position).addScaledVector(this.direction, 0.5).round()
        let forwardWall = levelMap.isWall(currentPosition, true)
        if (!forwardWall) {
            this.mesh.translateOnAxis(this.direction, delta * Ghost.GHOST_SPEED)
            levelMap.wrapObject(this.mesh)
        }
    }

    // Update ghost position based on current state
    public move(delta: number, levelMap: World, state: GameState) {
        if(!this.pacmanTarget) return

        if(this.exitHome && Utils.distance(this.mesh.position, levelMap.exitGhostTarget) < 1)
            this.exitHome = false
        let pacman: Pacman
        if(this.exitHome) {
            this.positionTarget = levelMap.exitGhostTarget
        } else {
            // Get pacman target
            pacman = state.getPacmansMap().get(this.pacmanTarget)
            if(!pacman) {
                this.pacmanTarget = null
                return
            }
            this.positionTarget = pacman.mesh.position
        }
        let previousPosition = new THREE.Vector3().copy(this.mesh.position).addScaledVector(this.direction, 0.5).round()
        this.mesh.translateOnAxis(this.direction, delta * Ghost.GHOST_SPEED)
        let currentPosition = new THREE.Vector3().copy(this.mesh.position).addScaledVector(this.direction, 0.5).round()

        // If the ghost is transitioning from one cell to the next, see if they can turn.
        if (!currentPosition.equals(previousPosition)) {
            let leftTurn = new THREE.Vector3().copy(this.direction).applyAxisAngle(Utils.UP, Math.PI / 2)
            let rightTurn = new THREE.Vector3().copy(this.direction).applyAxisAngle(Utils.UP, -Math.PI / 2)

            let leftPosition = new THREE.Vector3().copy(this.mesh.position).add(leftTurn)
            let rightPosition = new THREE.Vector3().copy(this.mesh.position).add(rightTurn)

            let forwardWall = levelMap.isWall(currentPosition, this.exitHome)
            let leftWall = levelMap.isWall(leftPosition, this.exitHome)
            let rightWall = levelMap.isWall(rightPosition, this.exitHome)

            let distances : Array<[number, THREE.Vector3]> = []
            let minDistance: [number, THREE.Vector3] = [1000, this.direction]
            if(!leftWall) distances.push([Utils.distance(leftPosition, this.positionTarget), leftTurn])
            if(!rightWall) distances.push([Utils.distance(rightPosition, this.positionTarget), rightTurn])
            if(!forwardWall) distances.push([Utils.distance(currentPosition, this.positionTarget), this.direction])

            for(let d of distances)
                minDistance = d[0] < minDistance[0] ? d : minDistance
            let makeError = Math.floor(Math.random() * 5) == 0 // [0,5]
            if(makeError || (pacman && !pacman.isAlive) ) {
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
        obj["direction"] = [ this.direction.x, this.direction.y, this.direction.z]
        obj["initialPosition"] = [ this.initialPosition.x, this.initialPosition.y, this.initialPosition.z]
        obj["pacmanTarget"] = this.pacmanTarget
        obj["state"] = this.state
        obj["exitHome"] = this.exitHome
        return obj
    }

    // New ghost from plain js object
    public static fromObj(obj: any): Ghost {
        let position = new THREE.Vector3(obj["position"][0], obj["position"][1], obj["position"][2])
        let out = new Ghost(obj["id"], position)
        out.copyObj(obj)
        return out
    }

    public copyObj(obj: any) {    
        this.mesh.position.set(obj["position"][0], obj["position"][1], obj["position"][2])
        this.direction.set(obj["direction"][0], obj["direction"][1], obj["direction"][2])
        this.initialPosition.set(obj["initialPosition"][0], obj["initialPosition"][1], obj["initialPosition"][2])
        this.pacmanTarget = obj["pacmanTarget"]
        this.state = obj["state"]
        this.exitHome = obj["exitHome"]
    }
}