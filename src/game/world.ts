import * as THREE from "three"
import { Ghost } from "./ghost"
import type { GameState } from "./state"
import { Mesh } from "./utils"
import * as  BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';


export class World {

    static readonly LEVEL = [
        '# # # # # # # # # # # # # # # # # # # # # # # # # # # #',
        '# . . . . . . . . . . . . # # . . . . . . . . . . . . #',
        '# . # # # # P # # # # # . # # . # # # # # P # # # # . #',
        '# o # # # # . # # # # # . # # . # # # # # . # # # # o #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# . . . . . . . . . . . . . . . . . . . . . . . . . . #',
        '# . # # # # . # # . # # # # # # # # . # # . # # # # . #',
        '# . # # # # . # # . # # # # # # # # . # # . # # # # . #',
        '# . . . . . . # # . . . . # # . . . . # # . . . . . . #',
        '# # # # # # P # # # # #   # #   # # # # # P # # # # # #',
        '          # . # # # # #   # #   # # # # # . #          ',
        '          # . # #           T         # # . #          ',
        '          # . # #   # # # X X # # #   # # . #          ',
        '# # # # # # . # #   #   G     G   #   # # . # # # # # #',
        '            .       #             #       .            ',
        '# # # # # # . # #   #   G     G   #   # # . # # # # # #',
        '          # P # #   # # # # # # # #   # # P #          ',
        '          # . # #                     # # . #          ',
        '          # . # #   # # # # # # # #   # # . #          ',
        '# # # # # # . # #   # # # # # # # #   # # . # # # # # #',
        '# . . . . . . . . . . . . # # . . . . . . . . . . . . #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# . . . # # P . . . . . . . . . . . . . . P # # . . . #',
        '# # # . # # . # # . # # # # # # # # . # # . # # . # # #',
        '# # # . # # . # # . # # # # # # # # . # # . # # . # # #',
        '# . . . . . . # # . . . . # # . . . . # # . . . . . . #',
        '# . # # # # # # # # # # . # # . # # # # # # # # # # . #',
        '# o # # # # # # # # # # . # # . # # # # # # # # # # o #',
        '# . . . . . . . . . . . . . . . . . . . . . . . . . . #',
        '# # # # # # # # # # # # # # # # # # # # # # # # # # # #']

    public bottom: number
    public top: number
    public left: number
    public right: number
    public centerX: number
    public centerY: number
    public numDots: number

    public exitGhostTarget: THREE.Vector3
    public ghostHomeTarget: THREE.Vector3

    public pacmanSpawn: Array<THREE.Vector3>
    public ghostColors: Array<string> = ["red", "cyan", "pink", "orange"]

    private map: Object


    constructor(scene: THREE.Scene, state: GameState) {
        let dotId = 0
        let ghostId = 0

        this.bottom = -(World.LEVEL.length - 1)
        this.top = this.left = this.right = 0
        this.numDots = 0

        this.pacmanSpawn = []
        this.map = {}
        let x : number, y : number
        for (let row = 0; row < World.LEVEL.length; row++) {
            // Set the coordinates of the map so that they match the
            // coordinate system for objects.
            y = -row

            this.map[y] = {}

            // Get the length of the longest row in the level definition.
            let length = Math.floor(World.LEVEL[row].length / 2)
            //map.right = Math.max(map.right, length - 1)
            this.right = Math.max(this.right, length)

            // Skip every second element, which is just a space for readability.
            for (let column = 0; column < World.LEVEL[row].length; column += 2) {
                x = Math.floor(column / 2)

                let cell = World.LEVEL[row][column]

                if (cell === '#') {
                    let wall = new Wall(x, y)
                    //wall.addToScene(scene)
                   // wallMeshs.push(wall.mesh)
                    this.map[y][x] = wall
                } else if (cell === 'X') {
                    let wall = new Wall(x, y, true)
                    //wall.addToScene(scene)
                    this.map[y][x] = wall
                } else if (cell === '.') {
                    // Add dot to global shared state
                    let dot = new Dot(dotId.toString(), new THREE.Vector3(x, y, 0))
                    state.initDot(dot)
                    dot.addToScene(scene)
                    dotId++
                    this.map[y][x] = dot
                } else if (cell === 'o') {
                    let dot = new Dot(dotId.toString(), new THREE.Vector3(x, y, 0), true)
                    state.initDot(dot)
                    dot.addToScene(scene)
                    dotId++
                    this.map[y][x] = dot
                } else if (cell === 'P') {
                    this.pacmanSpawn.push(new THREE.Vector3(x, y, 0))
                } else if (cell === 'G') {
                    this.ghostHomeTarget = new THREE.Vector3(x, y, 0)
                    let ghost = new Ghost(ghostId.toString(), new THREE.Vector3(x, y, 0), this.ghostColors[ghostId], ()=>{
                        ghost.addToScene(scene)
                        state.setGhost(ghost)
                    })
                    ghostId++
                } else if (cell === 'T'){
                    this.exitGhostTarget = new THREE.Vector3(x, y, 0)
                }
            }
        }

        this.centerX = (this.left + this.right) / 2
        this.centerY = (this.bottom + this.top) / 2

        Wall.addWallsToScene(scene)
    }

    public getAt(position: THREE.Vector3): any {
        let x = Math.round(position.x), y = Math.round(position.y)
        return this.map[y] && this.map[y][x]
    }

    public isWall(position: THREE.Vector3, isGhost: boolean = false) {
        let cell = this.getAt(position)
        return (!isGhost) ?
            ( cell instanceof Wall ) : // isPacman
            ( cell instanceof Wall  && !cell.isPassable) //isGhost
    }

    // Wrap object to map limit
    public wrapObject(object: THREE.Mesh) {
        if (object.position.x < this.left)
            object.position.x = this.right;
        else if (object.position.x > this.right)
            object.position.x = this.left;

        if (object.position.y > this.top)
            object.position.y = this.bottom;
        else if (object.position.y < this.bottom)
            object.position.y = this.top;
    }
}


class Wall {
    public static wallsGeometry = new Array<THREE.BoxBufferGeometry>();
    public static wallMaterial = new THREE.MeshLambertMaterial({ color: 'blue' })
    public isPassable: boolean

    constructor(x: number, y: number, isPassable: boolean = false){
        let wallGeometry = new THREE.BoxBufferGeometry(1, 1, 1)
    
        wallGeometry.translate(x, y, 0)
        if(!isPassable)
            Wall.wallsGeometry.push(wallGeometry)
        this.isPassable = isPassable
    }

    public static addWallsToScene(scene: THREE.Scene) {
        let merged = BufferGeometryUtils.mergeBufferGeometries(Wall.wallsGeometry)
        let mesh = new Mesh(merged, Wall.wallMaterial)
        mesh.matrixAutoUpdate = false
        mesh.updateMatrix()
        scene.add(mesh)
    }
}


export class Dot {
    static readonly DOT_RADIUS = 0.12
    static readonly DOT_RADIUS_POWER = Dot.DOT_RADIUS * 2

    public static material = new THREE.MeshLambertMaterial({ color: 'white' })
    public static power_geometry = new THREE.SphereBufferGeometry(Dot.DOT_RADIUS_POWER)
    public static geometry = new THREE.SphereBufferGeometry(Dot.DOT_RADIUS)


    private mesh: Mesh
    public id: string

    public pacmanId: string
    public isPowerDot: boolean

    constructor(id: string, position: THREE.Vector3, isPowerDot: boolean = false){
        this.isPowerDot = isPowerDot
        let dotGeometry = isPowerDot ? Dot.power_geometry : Dot.geometry
        let dotMaterial = Dot.material

        this.mesh = new Mesh(dotGeometry, dotMaterial)
        this.mesh.position.copy(position)
        this.id = id
        this.pacmanId = null
        this.mesh.isDot = true
        this.mesh.matrixAutoUpdate = false
        this.mesh.updateMatrix()
    }

    public setVisible(value: boolean){
        this.mesh.visible = value
    } 

    public getPosition(){
        return this.mesh.position
    } 

    public isVisible(){
        return this.pacmanId == null
    } 

    public addToScene(scene: THREE.Scene) {
        scene.add(this.mesh)
    }
}