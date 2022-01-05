import type * as Y from 'yjs'
import { Pacman } from './pacman'
import type * as THREE from "three"
import type { Dot } from './dot'
import type { Ghost } from './ghost'
import { writable } from 'svelte/store';
//import * as TWEEN from "@tweenjs/tween.js"

export const pacmans = writable(new Array<Pacman>());

export class GameState {

    private pacmanDelIndex: number
    public pacmansShared: Y.Map<Object> // Shared Map<pacman_id, pacman_object>
    public pacmansLocal: Map<string, Pacman>

    public ghostsShared: Y.Map<Object> // Shared Map<ghost_id, ghost_object>
    public ghostsLocal: Map<string, Ghost>

    public dotsShared: Y.Map<string> // Shared Map<dot_id, pacman_id>
    //public dotsLocal: Map<string, Dot> // Map<dot_id, Dot>
    public dotsMap: any

    public currentPacman: Pacman

    constructor(ydoc: Y.Doc){        

        this.pacmansShared = ydoc.getMap('pacmans')
        this.pacmansLocal = new Map<string, Pacman>()

        this.ghostsShared = ydoc.getMap('ghosts')
        this.ghostsLocal = new Map<string, Ghost>()

        this.dotsShared = ydoc.getMap('dots')
        this.dotsMap = {}

        this.pacmanDelIndex = 0
        this.currentPacman = null
    }

    public setCurrentPacman(currentPacman: Pacman){
        this.currentPacman = currentPacman
    }
    
    public updatePacmanLocal(scene: THREE.Scene) {
        this.pacmanDelIndex++;
        this.pacmansShared.forEach( (value: Object, key: string) => {
            let pLocal = this.pacmansLocal.get(key)
            if(pLocal != null) {
                if(this.currentPacman && this.currentPacman.id != pLocal.id){
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
                pacman.addToScene(scene)
            }
        })
        // Delete pacman on local and update store
        for( let id in this.pacmansLocal ){
            let local = this.pacmansLocal.get(id)
            if(local[1] != this.pacmanDelIndex)
                this.pacmansLocal.delete(id)
        }
        //TWEEN.update();
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
        for (const y in this.dotsMap) {
            for (const x in this.dotsMap[y]) {
                let dot: Dot = this.dotsMap[y][x]
                let pacmanId = this.dotsShared.get(dot.id)
                if( pacmanId ){
                    dot.setVisible(false)
                } else {
                    dot.setVisible(true)
                }
            }
        }
    }
    public initDot(dot: Dot) {
        // Add to map
        let x = dot.getPosition().x
        let y = dot.getPosition().y
        if(! this.dotsMap.hasOwnProperty(y)) {
            this.dotsMap[y] = {}
        }
        this.dotsMap[y][x] = dot
    }

    // Update dot state
    public updateDotShared(dot: Dot) {
        if (dot.pacmanId) {
            this.dotsShared.set(dot.id, dot.pacmanId)
        }
    }

    public getDot(x: number, y: number): Dot | null {
        try{
            return this.dotsMap[y][x]
        } catch (e) {
            console.log(e)
            return null
        }
    }

    public checkIfAllPlaying(): boolean {
        let out = true
        this.pacmansShared.forEach( (value: Object, key: string) => {
            if(value["isPlaying"] == false) 
                out = false
        })
        return out
    }

    public setCurrentPacmanPlaying(value: boolean) {
        this.currentPacman.isPlaying = value
        this.setPacman(this.currentPacman)
    }
}