import * as THREE from "three"
import { Ghost } from "./ghost"
import type { GameState } from "./state"

export class World{

    static readonly LEVEL = [
        '# # # # # # # # # # # # # # # # # # # # # # # # # # # #',
        '# . . . . . . . . . . . . # # . . . . . . . . . . . . #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# o # # # # . # # # # # . # # . # # # # # . # # # # o #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# . . . . . . . . . . . . . . . . . . . . . . . . . . #',
        '# . # # # # . # # . # # # # # # # # . # # . # # # # . #',
        '# . # # # # . # # . # # # # # # # # . # # . # # # # . #',
        '# . . . . . . # # . . . . # # . . . . # # . . . . . . #',
        '# # # # # # . # # # # #   # #   # # # # # . # # # # # #',
        '          # . # # # # #   # #   # # # # # . #          ',
        '          # . # #                     # # . #          ',
        '          # . # #   # # # X X # # #   # # . #          ',
        '# # # # # # . # #   #     G   G   #   # # . # # # # # #',
        '            .       #   G   G     #       .            ',
        '# # # # # # . # #   #             #   # # . # # # # # #',
        '          # . # #   # # # # # # # #   # # . #          ',
        '          # . # #                     # # . #          ',
        '          # . # #   # # # # # # # #   # # . #          ',
        '# # # # # # . # #   # # # # # # # #   # # . # # # # # #',
        '# . . . . . . . . . . . . # # . . . . . . . . . . . . #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# o . . # # . . . . . . . P   . . . . . . . # # . . o #',
        '# # # . # # . # # . # # # # # # # # . # # . # # . # # #',
        '# # # . # # . # # . # # # # # # # # . # # . # # . # # #',
        '# . . . . . . # # . . . . # # . . . . # # . . . . . . #',
        '# . # # # # # # # # # # . # # . # # # # # # # # # # . #',
        '# . # # # # # # # # # # . # # . # # # # # # # # # # . #',
        '# . . . . . . . . . . . . . . . . . . . . . . . . . . #',
        '# # # # # # # # # # # # # # # # # # # # # # # # # # # #']

    private bottom: number
    private top: number
    private left: number
    private right: number
    private centerX: number
    private centerY: number

    private numDots: number
    public pacmanSpawn: THREE.Vector3
    public ghostSpawn: THREE.Vector3

    private map: any

    constructor(scene: THREE.Scene, state: GameState) {
        let dotId = 0
        let ghostId = 0


        this.bottom = -(World.LEVEL.length - 1)
        this.top = this.left = this.right = 0
        this.numDots = 0
        this.pacmanSpawn = null
        this.ghostSpawn = null

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
                let object : any = null

                if (cell === '#') {
                    let wall = new Wall(x, y)
                    wall.addToScene(scene)
                    this.map[y][x] = wall
                } else if (cell === 'X') {
                    let wall = new Wall(x, y, true)
                    wall.addToScene(scene)
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
                    this.pacmanSpawn = new THREE.Vector3(x, y, 0)
                } else if (cell === 'G') {
                    let ghost = new Ghost(ghostId.toString(), new THREE.Vector3(x, y, 0), ()=>{
                        ghost.addToScene(scene)
                        state.setGhost(ghost)
                    })
                    ghostId++
                    this.ghostSpawn = new THREE.Vector3(x, y, 0)
                }
            }
        }

        this.centerX = (this.left + this.right) / 2
        this.centerY = (this.bottom + this.top) / 2
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
    public isPassable: boolean
    private mesh: THREE.Mesh;

    constructor(x: number, y: number, isPassable: boolean = false){
        let wallGeometry = new THREE.BoxGeometry(1, 1, 1)
        let wallMaterial = new THREE.MeshLambertMaterial({ color: 'blue' })
        
        this.mesh = new THREE.Mesh(wallGeometry, wallMaterial)
        this.mesh.position.set(x, y, 0)
        this.isPassable = isPassable
        this.mesh.visible = !isPassable
    }

    public addToScene(scene: THREE.Scene) {
        scene.add(this.mesh)
    }
}


export class Dot {
    static readonly DOT_RADIUS = 0.1
    static readonly DOT_RADIUS_POWER = Dot.DOT_RADIUS * 2

    private mesh: THREE.Mesh
    public id: string

    public pacmanId: string
    public isPowerDot: boolean

    constructor(id: string, position: THREE.Vector3, isPowerDot: boolean = false){
        this.isPowerDot = isPowerDot
        let dotGeometry = isPowerDot ? new THREE.SphereGeometry(Dot.DOT_RADIUS_POWER) : new THREE.SphereGeometry(Dot.DOT_RADIUS)
        let dotMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 }) // Paech color

        this.mesh = new THREE.Mesh(dotGeometry, dotMaterial)
        this.mesh.position.copy(position)
        this.id = id
        this.pacmanId = null
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