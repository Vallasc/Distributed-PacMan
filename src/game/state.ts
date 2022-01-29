import type * as Y from 'yjs'
import { Pacman } from './pacman'
import type * as THREE from "three"
import type { Dot } from './world'
import type { Ghost } from './ghost'
import { writable } from 'svelte/store';
import { GlobalConfig } from './global_config'

export const pacmans = writable(new Array<Pacman>());

export class GameState {
    private ydoc: Y.Doc
    private gameState: Y.Map<any>

    private pacmansOrdered: Y.Array<string> // Array<pacman_id>
    private pacmansShared: Y.Map<Object> // Shared Map<pacman_id, pacman_object>
    private pacmansLocal: Map<string, Pacman>

    private ghostsShared: Y.Map<Object> // Shared Map<ghost_id, ghost_object>
    private ghostsLocal: Map<string, Ghost>
    private ghostPacmanEat: Y.Array<string> // Array<ghost_id-pacman_id>

    private dotsShared: Y.Map<string> // Shared Map<dot_id, pacman_id>
    private dotsMap: any

    public currentPacman: Pacman
    public currentPacmanScore: number
    public allPacmanDied: boolean

    public dotsNumber: number
    public dotsEaten: number
    public powerDotsEaten: number
    public lastPowerDotsEaten: number
    public gameEnded: boolean
    public deadPacmans: Map<string, Pacman>

    constructor(ydoc: Y.Doc){
        this.ydoc =ydoc    
        this.gameState = ydoc.getMap('game_state')

        this.pacmansOrdered = ydoc.getArray('pacmans_array')
        this.pacmansShared = ydoc.getMap('pacmans_map')
        this.pacmansLocal = new Map<string, Pacman>()

        this.ghostsShared = ydoc.getMap('ghosts_map')
        this.ghostPacmanEat = ydoc.getArray('ghosts_pacman_eat')
        this.ghostsLocal = new Map<string, Ghost>()

        this.dotsShared = ydoc.getMap('dots_map')
        this.dotsMap = {}

        this.currentPacman = null
        this.currentPacmanScore = 0
        this.dotsNumber = 0
        this.dotsEaten = 0
        this.powerDotsEaten = 0
        this.lastPowerDotsEaten = 0
        this.gameEnded = false
        this.deadPacmans = new Map<string, Pacman>()
    }

    public setCurrentPacman(currentPacman: Pacman){
        this.currentPacman = currentPacman
        this.setPacman(currentPacman)
        this.pacmansOrdered.push([currentPacman.id])
    }
    
    public updatePacmanLocal(scene: THREE.Scene) {
        this.allPacmanDied = true;
        this.pacmansShared.forEach( (value: Object, key: string) => {
            let pLocal = this.pacmansLocal.get(key)
            if(pLocal != null) {
                if(this.currentPacman && this.currentPacman.id != pLocal.id){
                    // Update pacman object
                    pLocal.copyObjIfSameId(value)
                    if(!pLocal.nLives && !this.deadPacmans.get(pLocal.id))
                        this.deadPacmans.set(pLocal.id, pLocal)
                }
            } else { 
                // Add new pacman object
                pLocal = Pacman.fromObj(value)
                pLocal.makeTextNick()
                this.pacmansLocal.set(key, pLocal)
                // Add pacman to scene
                pLocal.addToScene(scene, this.currentPacman)
            }
            this.allPacmanDied = this.allPacmanDied && (pLocal.nLives === 0 || !pLocal.isOnline) 
        })

    }
    public setPacman(pacman: Pacman) {
        this.pacmansShared.set(pacman.id, pacman.toPlainObj())
        this.pacmansLocal.set(pacman.id, pacman)
    }

    public getPacman(id: string): Pacman {
        return this.pacmansLocal.get(id)
    }

    public getPacmansList(): IterableIterator<Pacman> {
        return this.pacmansLocal.values()
    }
    public getPacmansMap(): Map<string, Pacman> {
        return this.pacmansLocal
    }

    public getDeadPacmans() {
        return this.deadPacmans.values()
    }

    public getPacmanIndex(pacman: Pacman): number {
        let pArray = this.pacmansOrdered.toArray()
        for(let i = 0; i < pArray.length; i++) {
            if(pArray[i] === pacman.id) {
                return i;
            }
        }
        return -1;
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

    public setPacmanEatGhost(pacman: Pacman, ghost: Ghost) {
        this.ghostPacmanEat.push([ghost.id + '___' + pacman.id])
    }

    public getNumGhostEaten(pacman: Pacman) {
        let counter = 0
        for(let gp of this.ghostPacmanEat.toArray()){
            let pacmanId = gp.split('___')[1]
            if(pacman.id === pacmanId)
                counter++
        }
        return counter
    }

    public setScatterMode(mode: boolean) {
        this.gameState.set("scatterMode", mode)
    }

    public getScatterMode(): boolean {
        let result = this.gameState.get("scatterMode")
        if(result != null)
            return result
        else
            return false
    }

    public updateDotsLocal() {
        this.currentPacmanScore = 0
        this.dotsEaten = 0
        this.powerDotsEaten = 0
        for (const y in this.dotsMap) {
            for (const x in this.dotsMap[y]) {
                let dot: Dot = this.dotsMap[y][x]
                let pacmanId = this.dotsShared.get(dot.id)
                // Eaten dot
                if( pacmanId ){
                    this.dotsEaten++
                    dot.setVisible(false)
                    dot.pacmanId = pacmanId
                    if(pacmanId === this.currentPacman.id)
                        if(dot.isPowerDot)
                            this.currentPacmanScore += GlobalConfig.SCORE_POWER_DOT
                        else
                            this.currentPacmanScore += GlobalConfig.SCORE_DOT
                    if( dot.isPowerDot )
                        this.powerDotsEaten++
                } else {
                    dot.setVisible(true)
                }
            }
        }
    }

    // Update dot state
    public updateDotShared(dot: Dot) {
        if (dot.pacmanId) {
            this.dotsShared.set(dot.id, dot.pacmanId)
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

    public getDot(x: number, y: number): Dot | null {
        if(!this.dotsMap[y] || !this.dotsMap[y][x])
            return null
        return this.dotsMap[y][x]
    }

    public isPowerDotEaten(): boolean {
        let result = this.powerDotsEaten != this.lastPowerDotsEaten
        this.lastPowerDotsEaten = this.powerDotsEaten
        return result
    }

    public checkIfAllPlaying(): boolean {
        let out = true
        this.pacmansShared.forEach( (value: Object, key: string) => {
            if(!value["isPlaying"] && value["isOnline"])
                out = out && false 
        })
        return out
    }

    public checkGameEnded(): boolean {
        return this.allPacmanDied || (this.dotsEaten == this.dotsNumber) || this.gameEnded
        //return this.allPacmanDied || (this.dotsEaten >= 5)
    }

    public setGameEnded(value: boolean) {
        this.gameEnded= value
    }

    public setCurrentPacmanPlaying(value: boolean) {
        this.currentPacman.isPlaying = value
        this.setPacman(this.currentPacman)
    }

    public getScore(pacman: Pacman = this.currentPacman): number {
        if(pacman == this.currentPacman)
            return this.currentPacmanScore + this.getNumGhostEaten(pacman) * GlobalConfig.SCORE_GHOST
            
        let score: number = 0
        for (const y in this.dotsMap) {
            for (const x in this.dotsMap[y]) {
                let dot: Dot = this.dotsMap[y][x]
                let pacmanId = this.dotsShared.get(dot.id)
                if( pacmanId == pacman.id ){
                    if(dot.isPowerDot)
                        score += GlobalConfig.SCORE_POWER_DOT
                    else
                        score += GlobalConfig.SCORE_DOT
                }
            }
        }
        score += this.getNumGhostEaten(pacman) * GlobalConfig.SCORE_GHOST
        return score
    }
}