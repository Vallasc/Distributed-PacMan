import * as THREE from "three"

export class Utils {
    static readonly UP = new THREE.Vector3(0, 0, 1)
    static readonly LEFT = new THREE.Vector3(-1, 0, 0)
    static readonly TOP = new THREE.Vector3(0, 1, 0)
    static readonly RIGHT = new THREE.Vector3(1, 0, 0)
    static readonly BOTTOM = new THREE.Vector3(0, -1, 0)
}