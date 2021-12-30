import * as THREE from "three"
import { Pacman } from "./pacman"
export class Game {

    // Constants
    // =========
    static readonly GHOST_SPEED = 1.5
    static readonly GHOST_RADIUS = Pacman.PACMAN_RADIUS * 1.25

    public createRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setClearColor('black', 1.0)
        renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(renderer.domElement)

        return renderer
    }

    public createScene() {
        let scene = new THREE.Scene()

        // Add lighting
        scene.add(new THREE.AmbientLight(0x888888))
        let light = new THREE.SpotLight('white', 0.5)
        light.position.set(0, 0, 50)
        scene.add(light)


        return scene
    }

    public createHudCamera(map) {
        let halfWidth = (map.right - map.left) / 2, halfHeight = (map.top - map.bottom) / 2

        let hudCamera = new THREE.OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 1, 100)
        hudCamera.position.copy(new THREE.Vector3(map.centerX, map.centerY, 10))
        hudCamera.lookAt(new THREE.Vector3(map.centerX, map.centerY, 0))

        return hudCamera
    }

    public renderHud(renderer, hudCamera, scene) {
        // Increase size of pacman and dots in HUD to make them easier to see.
        scene.children.forEach(function (object) {
            if (object.isWall !== true)
                object.scale.set(2.5, 2.5, 2.5)
        })

        // Only render in the bottom left 200x200 square of the screen.
        renderer.enableScissorTest(true)
        renderer.setScissor(10, 10, 200, 200)
        renderer.setViewport(10, 10, 200, 200)
        renderer.render(scene, hudCamera)
        renderer.enableScissorTest(false)

        // Reset scales after rendering HUD.
        scene.children.forEach(function (object) {
            object.scale.set(1, 1, 1)
        })
    }

    public createGhost(scene, position) {
        let ghostGeometry = new THREE.SphereGeometry(Game.GHOST_RADIUS, 16, 16)

        // Give each ghost it's own material so we can change the colors of individual ghosts.
        let ghostMaterial = new THREE.MeshPhongMaterial({ color: 'red' })
        let ghost: any = new THREE.Mesh(ghostGeometry, ghostMaterial)
        ghost.isGhost = true
        ghost.isWrapper = true
        ghost.isAfraid = false

        // Ghosts start moving left.
        ghost.position.copy(position)
        ghost.direction = new THREE.Vector3(-1, 0, 0)

        scene.add(ghost)
    }

    // Make object wrap to other side of map if it goes out of bounds.
    public wrapObject(object, map) {
        if (object.position.x < map.left)
            object.position.x = map.right
        else if (object.position.x > map.right)
            object.position.x = map.left

        if (object.position.y > map.top)
            object.position.y = map.bottom
        else if (object.position.y < map.bottom)
            object.position.y = map.top
    }




    // Generic functions
    // =================
    public distance(object1, object2) {
        let difference = new THREE.Vector3()
        // Calculate difference between objects' positions.
        difference.copy(object1.position).sub(object2.position)

        return difference.length()
    }

    public gameLoop(callback : (delta: number, now: number) => any) {
        let previousFrameTime = window.performance.now()

        // How many seconds the animation has progressed in total.
        let animationSeconds = 0

        let render = function () {
            let now = window.performance.now()
            let animationDelta = (now - previousFrameTime) / 1000
            previousFrameTime = now

            // requestAnimationFrame will not call the callback if the browser
            // isn't visible, so if the browser has lost focus for a while the
            // time since the last frame might be very large. This could cause
            // strange behavior (such as objects teleporting through walls in
            // one frame when they would normally move slowly toward the wall
            // over several frames), so make sure that the delta is never too
            // large.
            animationDelta = Math.min(animationDelta, 1/30)

            // Keep track of how many seconds of animation has passed.
            animationSeconds += animationDelta

            callback(animationDelta, animationSeconds)

            requestAnimationFrame(render)
        }

        requestAnimationFrame(render)
    }
}