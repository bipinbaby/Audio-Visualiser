import * as THREE from'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'



async function init() {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,100)
    camera.position.z=3
    const renderer= new THREE.WebGLRenderer()

    renderer.setSize(window.innerWidth,window.innerHeight)
    

    const material = new THREE.ShaderMaterial({
        vertexShader:`
        varying vec2 uVu;
        uniform float uTime;
        uniform float uBass;
        void main(){
            vec3 displaced = position+ normal*sin(position.y*8.0+uTime)*(0.1+uBass*0.5);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
            }
        `,
        fragmentShader:`
        varying vec2 uVu;
        uniform float uMid;
        void main(){
            vec3 colorA = vec3(0.0,0.5,1.0);
            vec3 colorB= vec3(1.0,0.2,0.5);
            gl_FragColor= vec4(mix(colorA,colorB,uMid),1.0);}
        `,
        uniforms: {
            uTime: {value:0.0},
            uBass: {value:0.0},
            uMid: {value:0.0}

        }
    })
    const geometry = new THREE.SphereGeometry(1,32,32)
    const sphere = new THREE.Mesh(geometry,material)
    scene.add(sphere)


    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor=0.05
    controls.minDistance=2
    controls.maxDistance =10
    

    let stream
    try{
        stream = await navigator.mediaDevices.getUserMedia({audio:true})
    } catch(e){
        document.getElementById('overlay').style.display = 'none'
        document.body.innerHTML='<p style="color:white; padding:2rem">Mic access denied.Please allow microphone and refresh.</p>'
        return
    }
    
    document.body.appendChild(renderer.domElement)

    const audiCntxt= new AudioContext()
    await audiCntxt.resume()
    const analyser = audiCntxt.createAnalyser()
    const source = audiCntxt.createMediaStreamSource(stream)
    source.connect(analyser)
    const data= new Uint8Array(analyser.frequencyBinCount)
    let bassnorm=0  
    let midnorm=0  
    
    



    function animate(){
        analyser.getByteFrequencyData(data)
        const bassraw= data.slice(0,8).reduce((a,b)=>a+b,0)/8/255
        const midraw= data.slice(8,64).reduce((a,b)=>a+b,0)/56/255
        bassnorm=bassnorm*0.9+bassraw*0.1
        midnorm=midnorm*0.9+midraw*0.1

        material.uniforms.uBass.value=bassnorm
        material.uniforms.uMid.value=midnorm

        console.log('bass:',bassnorm.toFixed(3),'mid:',midnorm.toFixed(3))
        renderer.render(scene,camera)
        requestAnimationFrame(animate)
        
    }
    animate()
    
    window.addEventListener('resize',() => {
    camera.aspect= window.innerWidth/window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth,window.innerHeight)
    })
    
    


}
document.getElementById('overlay').addEventListener('click',()=>{
    document.getElementById('overlay').style.display='none'
    init()
})
