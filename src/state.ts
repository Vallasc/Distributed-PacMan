import { WebrtcProvider } from 'y-webrtc'
import * as Y from 'yjs'
import { Pacman } from './pacman'
import type * as THREE from "three"
import { Dot } from './dot'
import type { Ghost } from './ghost'
import * as TWEEN from "@tweenjs/tween.js"

export class GameState {

    private pacmanDelIndex: number
    private scene: THREE.Scene
    public pacmansShared: Y.Map<Object> // Shared Map<pacman_id, pacman_object>
    public pacmansLocal: Map<string, Pacman>

    public ghostsShared: Y.Map<Object> // Shared Map<ghost_id, ghost_object>
    public ghostsLocal: Map<string, Ghost>

    public dotsShared: Y.Map<string> // Shared Map<dot_id, pacman_id>
    public dotsLocal: Map<string, Dot> // Map<dot_id, Dot>
    public dotsMap: any

    constructor( scene : THREE.Scene ){
        const ydoc: Y.Doc = new Y.Doc({gc: true})
        const provider = new WebrtcProvider( 'distribuited-pacman', ydoc )

        this.pacmansShared = ydoc.getMap('pacmans')
        this.pacmansLocal = new Map<string, Pacman>()

        this.pacmanDelIndex = 0
        this.scene = scene

        this.ghostsShared = ydoc.getMap('ghosts')
        this.ghostsLocal = new Map<string, Ghost>()

        this.dotsShared = ydoc.getMap('dots')
        this.dotsLocal = new Map<string, Dot>()
        this.dotsMap = {}

    }
    
    public updatePacmanLocal(thisPacmanId: String) {
        this.pacmanDelIndex++;
        this.pacmansShared.forEach( (value: Object, key: string) => {
            let pLocal = this.pacmansLocal.get(key)
            if(pLocal != null) {
                if(thisPacmanId != pLocal.id){
                    // Update pacman object
                    pLocal.copyObjIfSameId(value)
                    pLocal.deletedFlag = this.pacmanDelIndex
                }
            } else { 
                // Add new pacman object
                let pacman = Pacman.fromObj(value)
                pacman.deletedFlag = this.pacmanDelIndex
                this.pacmansLocal.set(key, pacman)
                // Add pacman to scene
                pacman.addToScene(this.scene)
            }
        })
        // Delete pacman on local
        for( let id in this.pacmansLocal ){
            let local = this.pacmansLocal.get(id)
            if(local[1] != this.pacmanDelIndex)
                this.pacmansLocal.delete(id)
        }
        TWEEN.update();
    }
    public setPacman(pacman: Pacman) {
        this.pacmansShared.set(pacman.id, pacman.toPlainObj())
        this.pacmansLocal.set(pacman.id, pacman)
    }
    public getPacmans(): IterableIterator<Pacman> {
        return this.pacmansLocal.values()
    }

    public updateGhostsLocal() {
    }
    public setGhost(ghost: Ghost) {
        this.ghostsShared.set(ghost.id, ghost.toPlainObj())
        this.ghostsLocal.set(ghost.id, ghost)
    }
    public getGhosts(): IterableIterator<Ghost> {
        return this.ghostsLocal.values()
    }

    public updateDotsLocal() {
        for(let dot of this.dotsLocal.values()){
            let pacmanId = this.dotsShared.get(dot.id)
            dot.pacmanId = pacmanId
            // Dot assigned to a pacman
            if( pacmanId != Dot.DOT_NONE_PACMAN && pacmanId != undefined ){
                dot.setVisible(false)
            } else {
                dot.setVisible(true)
            }

        }
    }
    public initDot(dot: Dot) {
        let pacmanId = this.dotsShared.get(dot.id)
        if( pacmanId == null) {
            this.dotsShared.set(dot.id, dot.pacmanId)
            this.dotsLocal.set(dot.id, dot)

            // Add to map
            let x = dot.getPosition().x
            let y = dot.getPosition().y
            if(! this.dotsMap.hasOwnProperty(y)) {
                this.dotsMap[y] = {}
            }
            this.dotsMap[y][x] = dot
        }
    }
    public setDot(dot: Dot) { // First run set pacmanId to "none"

        if (dot.pacmanId != Dot.DOT_NONE_PACMAN) {
            this.dotsShared.set(dot.id, dot.pacmanId)
            this.dotsLocal.set(dot.id, dot)
        }
    }
    public getDots(): IterableIterator<Dot> {
        return this.dotsLocal.values()
    }
    public getDot(x: number, y: number): Dot | null {
        try{
            return this.dotsMap[y][x]
        } catch (e) {
            console.log(e)
            return null
        }
    }
}