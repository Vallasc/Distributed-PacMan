import * as THREE from "three"

export class Dot {
    static readonly DOT_RADIUS = 0.1
    static readonly DOT_RADIUS_POWER = Dot.DOT_RADIUS * 2
    static readonly DOT_NONE_PACMAN = "NONE"

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
        this.pacmanId = Dot.DOT_NONE_PACMAN
    }

    public setVisible(value: boolean){
        this.mesh.visible = value
    } 

    public getPosition(){
        return this.mesh.position
    } 

    public isVisible(){
        return this.pacmanId == Dot.DOT_NONE_PACMAN
    } 

    public addToScene(scene: THREE.Scene) {
        scene.add(this.mesh)
    }
}