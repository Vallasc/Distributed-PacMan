import * as THREE from "three"
import { Ghost } from "./ghost"
import type { Pacman } from "./pacman"
import { Mesh, Utils } from "./utils"
import type { World } from "./world"

export class Camera{
    private camera: THREE.PerspectiveCamera
    private targetPosition: THREE.Vector3
    private targetLookAt: THREE.Vector3
    private lookAtPosition: THREE.Vector3
    private pacman: Pacman

    constructor(renderer: THREE.WebGLRenderer, pacman: Pacman){
        this.pacman = pacman
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000)
        this.camera.up = (new THREE.Vector3()).copy(Utils.UP)
        this.targetPosition = (new THREE.Vector3()).copy(pacman.mesh.position).addScaledVector(Utils.UP, 5).addScaledVector(pacman.direction, -3)
        this.targetLookAt = (new THREE.Vector3()).copy(pacman.mesh.position).add(pacman.direction)
        this.lookAtPosition = (new THREE.Vector3()).copy(this.targetLookAt)

        window.onresize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
        }
    }

    public updateCamera(delta: number, lost: boolean) {
        if( !lost){
            // Place camera above and behind pacman, looking towards direction of pacman.
            this.targetPosition.copy(this.pacman.mesh.position).addScaledVector(Utils.UP, 5).addScaledVector(this.pacman.direction, -3)
            this.targetLookAt.copy(this.pacman.mesh.position).add(this.pacman.direction)
        } else {
            // After losing, move camera to look down at pacman's body from above.
            this.targetPosition = this.pacman.mesh.position.clone().addScaledVector(Utils.UP, 20);
            this.targetLookAt = this.pacman.mesh.position.clone().addScaledVector(this.pacman.direction, 0.01);
        }
        // Move camera slowly during win/lose animations.
        //let cameraSpeed = (lost || won) ? 1 : 10
        let cameraSpeed = 1
        this.camera.position.lerp(this.targetPosition, delta * cameraSpeed)
        this.lookAtPosition.lerp(this.targetLookAt, delta * cameraSpeed)
        this.camera.lookAt(this.lookAtPosition)
    }

    public render(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        try{
            renderer.render(scene, this.camera)
        } catch (e){
            console.log(e)
        }
    }
}

export class HUDCamera{
    private camera: THREE.OrthographicCamera

    constructor(map: World) {
        var halfWidth = (map.right - map.left) / 2, halfHeight = (map.top - map.bottom) / 2;
        this.camera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 1, 100);
        this.camera.position.copy(new THREE.Vector3(map.centerX, map.centerY, 10));
        this.camera.lookAt(new THREE.Vector3(map.centerX, map.centerY, 0));
    }

    public render(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
        // Increase size of pacman and dots in HUD to make them easier to see.
        scene.children.forEach((object)=>{
            let casted = object as Mesh
            if (casted.isDot)
                object.scale.set(1.7, 1.7, 1.7)
            if(casted.isPacman){
                object.scale.set(2, 2, 2)
                object.translateZ(1)
            }
            if(casted.isGhost)
                object.scale.set(Ghost.GHOST_SCALE * 2, Ghost.GHOST_SCALE * 2, Ghost.GHOST_SCALE * 2)
        })

        // Only render in the bottom left 200x200 square of the screen.
        renderer.setScissorTest(true);
        renderer.setScissor(10, 10, 200, 200)
        renderer.setViewport(10, 10, 200, 200)
        try{
            renderer.render(scene, this.camera)
        } catch (e){
            console.log(e)
        }
        renderer.setScissorTest(false);

        // Reset scales after rendering HUD.
        scene.children.forEach((object)=>{
            let casted = object as Mesh
            if (casted.isPacman || casted.isDot)
                object.scale.set(1, 1, 1)
            if(casted.isPacman)
                object.translateZ(-1)
            if(casted.isGhost)
                object.scale.set(Ghost.GHOST_SCALE, Ghost.GHOST_SCALE, Ghost.GHOST_SCALE)
        })
    }

    
}