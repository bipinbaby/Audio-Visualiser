import * as THREE from 'three'
const scene = new THREE.Scene()

const camera= new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100)

camera.position.z = 3


const renderer= new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth,window.innerHeight)
const geometry = new THREE.SphereGeometry(1,32,32)
const material= new THREE.MeshBasicMaterial({color: 0xff0000})
const sphere = new THREE.Mesh(geometry,material)
scene.add(sphere)

function animate(){
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()
document.body.appendChild(renderer.domElement)

window.addEventListener('resize',() => {
  camera.aspect= window.innerWidth/window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth,window.innerHeight)
})

