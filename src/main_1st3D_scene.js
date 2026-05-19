import * as THREE from 'three'
const scene = new THREE.Scene()

const camera= new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100)

camera.position.z = 3


const renderer= new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth,window.innerHeight)
const geometry = new THREE.SphereGeometry(1,32,32)
const material= new THREE.MeshStandardMaterial({color: 0xff0000, metalness: 1, roughness: 0.3})
const sphere = new THREE.Mesh(geometry,material)

const torusgeo = new THREE.TorusGeometry(1, 0.4, 16, 100)
const torus = new THREE.Mesh(torusgeo,material)

const isohedgeo = new THREE.IcosahedronGeometry(1, 0)
const isohed= new THREE.Mesh(isohedgeo,material)

const boxgeo = new THREE.BoxGeometry(1,1,1)
const box= new THREE.Mesh(boxgeo,material)



const directionallight= new THREE.DirectionalLight( 0xfcc603, 10)
directionallight.position.set(1,1,1)

const ambientlight= new THREE.AmbientLight( 0xffffff, 0.1)
scene.add(box)
scene.add(directionallight)
scene.add(ambientlight)

function animate(){
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

document.body.appendChild(renderer.domElement)
animate()




window.addEventListener('resize',() => {
  camera.aspect= window.innerWidth/window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth,window.innerHeight)
})

