import type { MeshBasicMaterial } from "three"
import * as THREE from "three"

export class Utils {
    static readonly UP = new THREE.Vector3(0, 0, 1)
    static readonly LEFT = new THREE.Vector3(-1, 0, 0)
    static readonly TOP = new THREE.Vector3(0, 1, 0)
    static readonly RIGHT = new THREE.Vector3(1, 0, 0)
    static readonly BOTTOM = new THREE.Vector3(0, -1, 0)

    public static genRandomId(): string {
        let random = ""
        for( let i = 0; i < 5; i++ )
            random += Utils.getRandomString()
        return random
    }

    public static getRandomString(): string {
        return Math.random().toString(36).substring(8, 15)
    }

    public static distance(object1: THREE.Vector3, object2: THREE.Vector3) {
        let difference = new THREE.Vector3()
        // Calculate difference between objects' positions.
        difference.copy(object1).sub(object2)

        return difference.length()
    }
}

export class Mesh extends THREE.Mesh {
    isPacman: boolean = false
    isGhost: boolean = false
    isWall: boolean = false
    isDot: boolean = false

    constructor(geometry?: THREE.SphereGeometry | THREE.BufferGeometry, 
        material?: THREE.MeshPhongMaterial | THREE.MeshLambertMaterial | MeshBasicMaterial){
        super(geometry, material)
    }

}