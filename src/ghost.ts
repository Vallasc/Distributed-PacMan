import type { BufferGeometry } from 'three'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'

export class Ghost {
    static readonly GHOST_SCALE = 0.162
    static readonly Z_OFFSET = -0.2
    static loadedGeometry: BufferGeometry

    private mesh: THREE.Mesh
    public id: string


    constructor(id: string, position: THREE.Vector3, afterLoading: () => void = ()=>{}){
        if(Ghost.loadedGeometry == null){
            let stlLoader = new STLLoader();
            let self = this
            stlLoader.load(
                'misc/ghost.stl',
                (geometry) => {
                    Ghost.loadedGeometry = geometry
                    self.makeMesh(position)
                    afterLoading()
                },
                (xhr) => {
                    console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
                },
                (error) => {
                    console.log(error)
                }
            ) 
        } else {
            this.makeMesh(position)
            afterLoading()
        }
        this.id = id
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
    public updateGhost() {

    }

    // Get plain js object
    public toPlainObj(): Object {
        let obj: any = {}
        obj["id"] = this.id
        obj["position"] = [ this.mesh.position.x, this.mesh.position.y, this.mesh.position.z]
        return obj
    }

    // New pacman from plain js object
    public static fromObj(obj: any): Ghost {
        let position = new THREE.Vector3(obj["position"][0], obj["position"][1], obj["position"][2])
        let direction = new THREE.Vector3(obj["direction"][0], obj["direction"][1], obj["direction"][2])
        let out = new Ghost(obj["id"], position)

        return out
    }
}