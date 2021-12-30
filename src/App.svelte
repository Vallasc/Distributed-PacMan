<script lang="ts">
import { onMount } from 'svelte'
import * as THREE from 'three'
import { Camera } from './camera';
import { Game } from './game'
import { KeyState } from './key_state';
import { LevelMap } from './level_map';
import { Pacman } from './pacman';
import { GameState } from './state';
import { Utils } from './utils';

//main()
console.log("version 0.0.3")
let game = new Game()
let keys = new KeyState()
let renderer = game.createRenderer()
let scene = game.createScene()

let state = new GameState(scene)

let map = new LevelMap(scene, state)
let camera = new Camera()
let pacman =  new Pacman(Date.now().toString(), map.pacmanSpawn)
pacman.addToScene(scene)

//let hudCamera = game.createHudCamera(map)
let remove = []

let frameCounter = 0
// Main game loop
game.gameLoop( (delta) => {
	// Update local list of pacman
	state.updatePacmanLocal(pacman.id)
	state.updateDotsLocal()

	pacman.movePacman(delta, keys, map, state)
	pacman.updateFrame()

	camera.updateCamera(delta, pacman)

	// Set my pacman state
	state.setPacman(pacman)

	// Update other pacman frames
	for( let p of state.getPacmans()){
		if(p.id != pacman.id){
			p.updateFrame()
			p.calculateFakeMovement(delta)
		}
	}

	if(frameCounter % 5 == 0){

	}
	// Render main view
	renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height)
	renderer.render(scene, camera.get())

	// Render HUD
	//renderHud(renderer, hudCamera, scene)
	frameCounter++;
})

setInterval(() => {
	//console.log(state.getPacmans())
	//state.setPacman(pacman)
	//state.updatePacmanState()
}, 300)

</script>

<div class="init">

</div>

<style>
.init {
	width: 100%;
}

</style>