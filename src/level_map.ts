import * as THREE from "three"
import { Dot } from "./dot"
import { Ghost } from "./ghost"
import type { GameState } from "./state"

export class LevelMap{

    static readonly PELLET_RADIUS = Dot.DOT_RADIUS * 2
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
        '          # . # #         G           # # . #          ',
        '          # . # #   # # # # # # # #   # # . #          ',
        '# # # # # # . # #   #             #   # # . # # # # # #',
        '            .       #             #       .            ',
        '# # # # # # . # #   #             #   # # . # # # # # #',
        '          # . # #   # # # # # # # #   # # . #          ',
        '          # . # #                     # # . #          ',
        '          # . # #   # # # # # # # #   # # . #          ',
        '# # # # # # . # #   # # # # # # # #   # # . # # # # # #',
        '# . . . . . . . . . . . . # # . . . . . . . . . . . . #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# . # # # # . # # # # # . # # . # # # # # . # # # # . #',
        '# o . . # # . . . G . . . P   . . . . . . . # # . . o #',
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


        this.bottom = -(LevelMap.LEVEL.length - 1)
        this.top = this.left = this.right = 0
        this.numDots = 0
        this.pacmanSpawn = null
        this.ghostSpawn = null

        this.map = {}
        let x : number, y : number
        for (let row = 0; row < LevelMap.LEVEL.length; row++) {
            // Set the coordinates of the map so that they match the
            // coordinate system for objects.
            y = -row

            this.map[y] = {}

            // Get the length of the longest row in the level definition.
            let length = Math.floor(LevelMap.LEVEL[row].length / 2)
            //map.right = Math.max(map.right, length - 1)
            this.right = Math.max(this.right, length)

            // Skip every second element, which is just a space for readability.
            for (let column = 0; column < LevelMap.LEVEL[row].length; column += 2) {
                x = Math.floor(column / 2)

                let cell = LevelMap.LEVEL[row][column]
                let object = null

                if (cell === '#') {
                    object = this.createWall()
                } else if (cell === '.') {
                    // Add dot to global shared state
                    let dot = new Dot(dotId.toString(), new THREE.Vector3(x, y, 0))
                    state.initDot(dot)
                    dot.addToScene(scene)
                    dotId++
                } else if (cell === 'o') {
                    let dot = new Dot(dotId.toString(), new THREE.Vector3(x, y, 0), true)
                    state.initDot(dot)
                    dot.addToScene(scene)
                    dotId++
                } else if (cell === 'P') {
                    this.pacmanSpawn = new THREE.Vector3(x, y, 0)
                } else if (cell === 'G') {
                    let ghost = new Ghost(ghostId.toString(), new THREE.Vector3(x, y, 0), ()=>{
                        ghost.addToScene(scene)
                    })
                    ghostId++
                    this.ghostSpawn = new THREE.Vector3(x, y, 0)
                }

                if (object !== null) {
                    object.position.set(x, y, 0)
                    this.map[y][x] = object
                    scene.add(object)
                }
            }
        }

        this.centerX = (this.left + this.right) / 2
        this.centerY = (this.bottom + this.top) / 2
    }

    public getAt(position: THREE.Vector3) {
        let x = Math.round(position.x), y = Math.round(position.y)
        return this.map[y] && this.map[y][x]
    }

    public isWall(position: THREE.Vector3) {
        let cell = this.getAt(position)
        return cell && cell.isWall === true
    }

    public removeAt(position: THREE.Vector3) {
        let x = Math.round(position.x), y = Math.round(position.y)
        if (this.map[y] && this.map[y][x]) {
            // Don't actually remove, just make invisible.
            this.map[y][x].visible = false
        }
    }

    public createWall() {
        let wallGeometry = new THREE.BoxGeometry(1, 1, 1)
        let wallMaterial = new THREE.MeshLambertMaterial({ color: 'blue' })
        
        let wall: any = new THREE.Mesh(wallGeometry, wallMaterial)
        wall.isWall = true

        return wall
    }

    public createPowerPellet() {
        let pelletGeometry = new THREE.SphereGeometry(LevelMap.PELLET_RADIUS, 12, 8)
        let pelletMaterial = new THREE.MeshPhongMaterial({ color: 0xFFDAB9 }) // Paech color

        let pellet: any = new THREE.Mesh(pelletGeometry, pelletMaterial)
        pellet.isPowerPellet = true

        return pellet
    }
}