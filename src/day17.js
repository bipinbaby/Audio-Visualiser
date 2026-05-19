import * as THREE from 'three'

const scene= new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,100)
camera.position.z=6

const renderer= new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth,window.innerHeight)
renderer.setClearColor(0x0a0a0a)

const textureLoader = new THREE.TextureLoader()
const texture = textureLoader.load('/1.jpg')
const material = new THREE.MeshStandardMaterial({map: texture})

const video = document.createElement('video')
video.src = "/starry.mp4" 
video.loop = true
video.muted = true
video.play()

const vidText= new THREE.VideoTexture(video)
const videomat = new THREE.MeshStandardMaterial ({map:vidText})

const boxgeo = new THREE.BoxGeometry(2,2,2)

const box= new THREE.Mesh(boxgeo,videomat)
box.rotation.y=180
box.rotation.x=45

const directionallight= new THREE.DirectionalLight( 0xffffff, 1)
directionallight.position.set(1,2,1)

const amblight = new THREE.AmbientLight(0xffffff,5)
scene.add(amblight)
scene.add(box)
scene.add(directionallight)


function animate(){
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}

animate()
document.body.appendChild(renderer.domElement)
window.addEventListener('resize',()=>{
    camera.aspect= window.innerWidth/window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth,window.innerHeight)

})