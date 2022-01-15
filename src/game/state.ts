import type * as Y from 'yjs'
import { Pacman } from './pacman'
import type * as THREE from "three"
import type { Dot } from './world'
import type { Ghost } from './ghost'
import { writable } from 'svelte/store';

export const pacmans = writable(new Array<Pacman>());

export class GameState {
    private pacmansShared: Y.Map<Object> // Shared Map<pacman_id, pacman_object>
    private pacmansLocal: Map<string, Pacman>

    private ghostsShared: Y.Map<Object> // Shared Map<ghost_id, ghost_object>
    private ghostsLocal: Map<string, Ghost>

    private dotsShared: Y.Map<string> // Shared Map<dot_id, pacman_id>
    private dotsMap: any

    public currentPacman: Pacman
    public currentPacmanScore: number
    public allPacmanDied: boolean

    public dotsNumber: number
    public dotsEaten: number

    constructor(ydoc: Y.Doc){        
        this.pacmansShared = ydoc.getMap('pacmans')
        this.pacmansLocal = new Map<string, Pacman>()

        this.ghostsShared = ydoc.getMap('ghosts')
        this.ghostsLocal = new Map<string, Ghost>()

        this.dotsShared = ydoc.getMap('dots')
        this.dotsMap = {}

        //this.pacmanDelIndex = 0
        this.currentPacman = null
        this.currentPacmanScore = 0
        this.dotsNumber = 0
        this.dotsEaten = 0
    }

    public setCurrentPacman(currentPacman: Pacman){
        this.currentPacman = currentPacman
    }
    
    public updatePacmanLocal(scene: THREE.Scene) {
        this.allPacmanDied = true;
        this.pacmansShared.forEach( (value: Object, key: string) => {
            let pLocal = this.pacmansLocal.get(key)
            if(pLocal != null) {
                if(this.currentPacman && this.currentPacman.id != pLocal.id){
                    // Update pacman object
                    pLocal.copyObjIfSameId(value)
                }
            } else { 
                // Add new pacman object
                pLocal = Pacman.fromObj(value)
                pLocal.makeTextNick()
                this.pacmansLocal.set(key, pLocal)
                // Add pacman to scene
                pLocal.addToScene(scene, this.currentPacman)
            }
            this.allPacmanDied = this.allPacmanDied && (pLocal.nLives == 0 || !pLocal.isOnline) 
        })

    }
    public setPacman(pacman: Pacman) {
        this.pacmansShared.set(pacman.id, pacman.toPlainObj())
        this.pacmansLocal.set(pacman.id, pacman)
    }
    public getPacmansList(): IterableIterator<Pacman> {
        return this.pacmansLocal.values()
    }
    public getPacmansMap(): Map<string, Pacman> {
        return this.pacmansLocal
    }

    public updateGhostsLocal() {
        this.ghostsShared.forEach( (value: Object, key: string) => {
            let gLocal = this.ghostsLocal.get(key)
            if(gLocal){
                gLocal.copyObj(value)
            }
        })
    }

    public updateGhostsShared() {
        this.ghostsLocal.forEach((ghost)=>{
            this.ghostsShared.set(ghost.id, ghost.toPlainObj())
        })
    }

    public setGhost(ghost: Ghost) {
        this.ghostsShared.set(ghost.id, ghost.toPlainObj())
        this.ghostsLocal.set(ghost.id, ghost)
    }

    public getGhosts(): IterableIterator<Ghost> {
        return this.ghostsLocal.values()
    }

    public updateDotsLocal() {
        this.currentPacmanScore = 0
        this.dotsEaten = 0
        for (const y in this.dotsMap) {
            for (const x in this.dotsMap[y]) {
                let dot: Dot = this.dotsMap[y][x]
                let pacmanId = this.dotsShared.get(dot.id)
                if( pacmanId ){
                    this.dotsEaten++
                    dot.setVisible(false)
                    dot.pacmanId = pacmanId
                    if(pacmanId === this.currentPacman.id)
                        this.currentPacmanScore += 100
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
        this.dotsNumber++
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
            if(!value["isPlaying"] && value["isOnline"])
                out = false
        })
        return out
    }

    public checkGameEnded(): boolean {
        return this.allPacmanDied || (this.dotsEaten == this.dotsNumber)
        //return this.allPacmanDied || (this.dotsEaten == 5)
    }

    public setCurrentPacmanPlaying(value: boolean) {
        this.currentPacman.isPlaying = value
        this.setPacman(this.currentPacman)
    }

    public getScore(pacman: Pacman = this.currentPacman): number {
        if(pacman == this.currentPacman)
            return this.currentPacmanScore
            
        let score: number = 0
        for (const y in this.dotsMap) {
            for (const x in this.dotsMap[y]) {
                let dot: Dot = this.dotsMap[y][x]
                let pacmanId = this.dotsShared.get(dot.id)
                if( pacmanId === pacman.id ){
                    score += 100
                }
            }
        }
        return score
    }
}