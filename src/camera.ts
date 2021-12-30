import * as THREE from "three"
import type { Pacman } from "./pacman"
import { Utils } from "./utils"

export class Camera{
    private camera: THREE.PerspectiveCamera
    private targetPosition: THREE.Vector3
    private targetLookAt: THREE.Vector3
    private lookAtPosition: THREE.Vector3

    constructor(){
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000)
        this.camera.up.copy(Utils.UP)
        this.targetPosition = new THREE.Vector3()
        this.targetLookAt = new THREE.Vector3()
        this.lookAtPosition = new THREE.Vector3()
    }

    public updateCamera(delta: number, pacman: Pacman) {
        // Place camera above and behind pacman, looking towards direction of pacman.
        this.targetPosition.copy(pacman.getPosition()).addScaledVector(Utils.UP, 5).addScaledVector(pacman.direction, -3)
        this.targetLookAt.copy(pacman.getPosition()).add(pacman.direction)
    
        // Move camera slowly during win/lose animations.
        //let cameraSpeed = (lost || won) ? 1 : 10
        let cameraSpeed = 1
        this.camera.position.lerp(this.targetPosition, delta * cameraSpeed)
        this.lookAtPosition.lerp(this.targetLookAt, delta * cameraSpeed)
        this.camera.lookAt(this.lookAtPosition)
    }

    public get(): THREE.PerspectiveCamera {
        return this.camera;
    }
}