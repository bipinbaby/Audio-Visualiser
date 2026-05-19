import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'


// create scene
const scene = new THREE.Scene()
// create camera
const camera= new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100)
//move camera back
camera.position.z = 3

// creating rendered
const renderer= new THREE.WebGLRenderer()


//setting the render canvas to the page
renderer.setSize(window.innerWidth,window.innerHeight)

// creating sphere geometry
const geometry = new THREE.SphereGeometry(1,32,32)
//const material= new THREE.MeshStandardMaterial({color: 0xff0000, metalness: 1, roughness: 0.3})


// creating material 
const material = new THREE.ShaderMaterial({
  vertexShader:`
  varying vec2 vUv;
  uniform float uTime;
  void main(){
      vUv = uv;
      vec3 displaced = position + normal * sin(position.y*8.0+ uTime)*0.15;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);

      }
  `,
  fragmentShader:`
    varying vec2 vUv;
    uniform vec3 uColor;
    
    void main(){
      gl_FragColor = vec4(uColor,1.0);      
    }
  `,
  uniforms:{
    uTime: {value:0.0},
    uColor : {value: new THREE.Color(0x00aaff)},
  }
  
})

const raycast= new THREE.Raycaster()
const mousepos = new THREE.Vector2()
// mouse.x=(event.clientX/window.innerWidth)*2-1, mouse.y=-(event.clientY/window.innerHeight)*2+1 
//gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0); to be used in the fragment shader


const clock= new THREE.Clock() 

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
scene.add(sphere)
scene.add(directionallight)
scene.add(ambientlight)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor=0.05
controls.minDistance=2
controls.maxDistance =10


function animate(){
  material.uniforms.uTime.value = clock.getElapsedTime()
  controls.update()
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


window.addEventListener('click', (event)=> {
  //material.uniforms.uColor.value.set(Math.random(),Math.random(),Math.random())
  mousepos.x=(event.clientX/window.innerWidth)*2-1
  mousepos.y = -(event.clientY/window.innerHeight)*2+1
  raycast.setFromCamera(mousepos, camera)
  const intersects= raycast.intersectObject(sphere)
  if (intersects.length>0){
    material.uniforms.uColor.value.set(Math.random(),Math.random(),Math.random())
  }
})
