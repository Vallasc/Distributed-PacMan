import type { BufferGeometry } from 'three'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import type { World } from './world'
import { Pacman } from './pacman'
import { Utils } from './utils'

export class Ghost {
    static readonly GHOST_SCALE = 0.162
    static readonly Z_OFFSET = -0.2
    static readonly GHOST_SPEED = 1.5
    static readonly GHOST_RADIUS = Pacman.PACMAN_RADIUS * 1.1
    static loadedGeometry: BufferGeometry

    public initialPosition: THREE.Vector3
    public pacmanTarget: string // Pacman Id
    public state: number // chase = 0, frightned = 1, eat = 2
    public direction: THREE.Vector3
    private mesh: THREE.Mesh
    public id: string


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
    }

    // Make 3d mesh
    public makeMesh(position: THREE.Vector3) {
        let dotMaterial = new THREE.MeshPhongMaterial({ color: 'red', side: THREE.DoubleSide })
        dotMaterial.flatShading = false
        this.mesh = new THREE.Mesh(Ghost.loadedGeometry, dotMaterial)
        this.mesh.geometry.computeVertexNormals()
        this.mesh.position.set(position.x, position.y, position.z + Ghost.Z_OFFSET)
        this.mesh.scale.set(Ghost.GHOST_SCALE, Ghost.GHOST_SCALE, Ghost.GHOST_SCALE)
    }

    // Set visible property
    public setVisible(value: boolean){
        this.mesh.visible = value
    } 

    // Get ghost position
    public getPosition(){
        return this.mesh.position
    } 

    // Add ghost mesh to 3d scene
    public addToScene(scene: THREE.Scene) {
        scene.add(this.mesh)
    }

    // Update ghost position based on current state
    public moveGhost(delta: number, levelMap: World) {
        var previousPosition = new THREE.Vector3()
        var currentPosition = new THREE.Vector3()
        var leftTurn = new THREE.Vector3()
        var rightTurn = new THREE.Vector3()

        previousPosition.copy(this.mesh.position).addScaledVector(this.direction, 0.5).round()
        this.mesh.translateOnAxis(this.direction, delta * Ghost.GHOST_SPEED)
        currentPosition.copy(this.mesh.position).addScaledVector(this.direction, 0.5).round()

        // If the ghost is transitioning from one cell to the next, see if they can turn.
        if (!currentPosition.equals(previousPosition)) {
            leftTurn.copy(this.direction).applyAxisAngle(Utils.UP, Math.PI / 2)
            rightTurn.copy(this.direction).applyAxisAngle(Utils.UP, -Math.PI / 2)

            var forwardWall = levelMap.isWall(currentPosition, true)
            var leftWall = levelMap.isWall(currentPosition.copy(this.mesh.position).add(leftTurn), true)
            var rightWall = levelMap.isWall(currentPosition.copy(this.mesh.position).add(rightTurn), true)

            if (!leftWall || !rightWall) {
                // If the ghsot can turn, randomly choose one of the possible turns.
                var possibleTurns = []
                if (!forwardWall) possibleTurns.push(this.direction)
                if (!leftWall) possibleTurns.push(leftTurn)
                if (!rightWall) possibleTurns.push(rightTurn)

                if (possibleTurns.length === 0)
                    throw new Error('A ghost got stuck!')

                var newDirection = possibleTurns[Math.floor(Math.random() * possibleTurns.length)]
                this.direction.copy(newDirection)

                // Snap ghost to center of current cell and start moving in new direction.
                this.mesh.position.round().addScaledVector(this.direction, delta)
            }
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
        this.mesh.position.copy(new THREE.Vector3(obj["position"][0], obj["position"][1], obj["position"][2]))
        this.direction.copy(new THREE.Vector3(obj["direction"][0], obj["direction"][1], obj["direction"][2]))
        this.initialPosition = new THREE.Vector3(obj["initialPosition"][0], obj["initialPosition"][1], obj["initialPosition"][2])
        this.pacmanTarget = obj["pacmanTarget"]
        this.state = obj["state"]
    }
}