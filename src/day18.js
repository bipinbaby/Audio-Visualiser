import *as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,100)
camera.position.z=3

const renderer= new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth,window.innerHeight)
//renderer.setClearColor(0x0a0a0a)
scene.background = new THREE.Color(0x0a0a0a)

const textureLoader = new THREE.TextureLoader()
const texture = textureLoader.load('/1.jpg')
const material = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000,
     emissiveIntensity: 1 })

const boxgeo = new THREE.BoxGeometry(2,2,2)
const box = new THREE.Mesh(boxgeo,material)
const directionallight= new THREE.DirectionalLight( 0xffffff, 1)
directionallight.position.set(1,2,1)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene,camera))
const bloompass = new UnrealBloomPass( new THREE.Vector2(window.innerWidth,window.innerHeight),1.5,0.9,0.1)
composer.addPass(bloompass)

scene.add(box)
scene.add(directionallight)

function animate(){
requestAnimationFrame(animate)
//renderer.render(scene,camera)
composer.render()
}

animate()
document.body.appendChild(renderer.domElement)
window.addEventListener('resize',()=>{
    camera.aspect= window.innerWidth/window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth,window.innerHeight)

})


document.getElementById('bloom').addEventListener('input',(e)=>{bloompass.strength=parseFloat(e.target.value)})