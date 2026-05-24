import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'


async function init(source = 'mic') {
    // --- Scene setup ---
    const scene = new THREE.Scene()

    // PerspectiveCamera(fov, aspect, near, far)
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100)
    
    camera.position.z = 9

    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(window.innerWidth, window.innerHeight)

    // EffectComposer replaces renderer.render() so post-processing passes can be chained
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    // UnrealBloomPass(resolution, strength, radius, threshold)
    // strength is driven by audio energy each frame
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.0, 0.4, 0.1)
    composer.addPass(bloomPass)

    // OrbitControls — lets the user rotate/zoom the camera with mouse drag
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true       // smooth deceleration after dragging
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 10


    // --- Audio input ---
    let stream
    try {
        if (source === 'mic') {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } else {
            // Chrome requires video:true for getDisplayMedia — we just ignore the video track
            stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
            // Verify the stream actually has audio (user may not have ticked "share audio")
            if (stream.getAudioTracks().length === 0) {
                document.getElementById('overlay').style.display = 'flex'
                alert('No audio track found. Make sure to tick "Share tab audio" in the picker.')
                return
            }
            // Stop the video track — we only want audio
            stream.getVideoTracks().forEach(t => t.stop())
        }
    } catch(e) {
        document.getElementById('overlay').style.display = 'flex'
        alert('Audio access was denied or cancelled. Please try again.')
        return
    }

    // AudioContext is the Web Audio engine
    // analyser breaks the audio signal into frequency bins (like a spectrum analyser)
    const audioctx = new AudioContext()
    await audioctx.resume()                         // browsers pause AudioContext until user gesture
    const analyser = audioctx.createAnalyser()
    const audioSource = audioctx.createMediaStreamSource(stream)
    audioSource.connect(analyser)

    // frequencyBinCount = 1024 bins, each holding a 0–255 amplitude value
    const data = new Uint8Array(analyser.frequencyBinCount)
    let bassnorm = 0    // smoothed bass level, carried between frames
    let midnorm = 0     // smoothed mid level, carried between frames

    // --- Light Setup ---
    const DirectionalLight = new THREE.DirectionalLight(0xffffff, 5)
    const AmbientLight = new THREE.AmbientLight(0xffffff,5)
    DirectionalLight.position.set(5,5,5)
    scene.add(DirectionalLight)
    scene.add(AmbientLight)
    
    // --- Custom Blender GLB Mesh/Geometry ---
    let meshA = null
    let meshB = null
    const meshscale = 7
    const loader = new GLTFLoader()
    loader.load('/circle_shell.glb',(gltf)=>{
        gltf.scene.traverse((child)=>{
            if(child.isMesh){
                child.material = new THREE.ShaderMaterial({
                    side: THREE.DoubleSide,
                    uniforms:{
                        uTime: {value:0.0},
                        uBass: {value:0.0},
                    },
                    vertexShader:`
                        uniform float uTime;
                        uniform float uBass;
                        varying vec2 vUv;
                        void main(){
                            vUv = uv;
                            vec3 pos = position;
                            pos += normal* abs(sin(pos.y * 4.0 + uTime)) * uBass * 0.3;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                        }
                    `,

                    fragmentShader :`
                        uniform float uTime;
                        uniform float uBass;
                        varying vec2 vUv;
                        float sdMoon(vec2 p, float d, float ra, float rb )
                            {
                                p.y = abs(p.y);
                                float a = (ra*ra - rb*rb + d*d)/(2.0*d);
                                float b = sqrt(max(ra*ra-a*a,0.0));
                                if( d*(p.x*b-p.y*a) > d*d*max(b-p.y,0.0) )
                                    return length(p-vec2(a,b));
                                return max( (length(p          )-ra),
                                        -(length(p-vec2(d,0))-rb));
                            }
                        void main() {
                            vec3 col_in = vec3(1.0, 1.0, 0.0)+(uBass*3.0);
                            vec3 col_out = mix( vec3(0.0, 0.314, 0.516),vec3(1.0, 0.0, 1.0),uBass);
                            vec2 tiledUV = vUv;
                            vec2 centeredUV = tiledUV ;
                            centeredUV.x *= 2.0;   // sphere UV is always 2:1, correct so circles aren't stretched
                            float b = sdMoon(centeredUV, 0.1, 1.0,1.0);
                            b= sin(b*4.0+uTime)/4.0;
                            b= abs(b);
                            b= step(0.1,b);
                            vec3 col = mix(col_in, col_out, b);
                            gl_FragColor = vec4(col, 1.0);
                        }
                    `
                })
            }
        })
        scene.add(gltf.scene)
        gltf.scene.scale.set(meshscale, meshscale, meshscale)
        meshA = gltf.scene
    })

    loader.load('/sphere_shell.glb', (gltf) => {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.ShaderMaterial({
                    side: THREE.DoubleSide,
                    uniforms: {
                        uTime: { value: 0.0 },
                        uMid:  { value: 0.0 },
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        uniform float uTime;
                        uniform float uMid;
                        void main() {
                            vUv = uv;
                            vec3 pos = position;
                            pos += normal * sin(pos.x * 4.0 + uTime) * uMid * 0.3;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                        }
                    `,
                    fragmentShader: `
                        varying vec2 vUv;
                        uniform float uTime;
                        uniform float uMid;
                        float sdf( in vec2 p, in float w, in float r )
                            {
                                p = abs(p);
                                return length(p-min(p.x+p.y,w)*0.5) - r;
                            }
                        void main() {
                                
                                float b = sdf(vUv, 1.0, 3.0);
                                b= sin(b*8.0+uTime)/8.0;
                                b= abs(b);
                                b= step(0.05,b);
                                vec3 col_in  = mix(vec3(1.0, 1.0, 0.0),vec3(1.0,0.0,1.0),uMid);
                                vec3 col_out = mix(vec3(0.078, 0.004, 0.322),vec3(0.0,0.5,1.0),uMid);
                                vec3 col = mix(col_in, col_out, b);
                                gl_FragColor = vec4(col, 1.0);
                        }
                    `
                })
            }
        })
        scene.add(gltf.scene)
        gltf.scene.scale.set(meshscale, meshscale, meshscale)
        meshB = gltf.scene
    })


    // --- Sphere/Background Geometry ---
    const SphereGeo = new THREE.SphereGeometry(10,32,32)
    //const SphereMat = new THREE.MeshStandardMaterial({color: 0x40003a, side: THREE.BackSide}) 
    const SphereMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms:{
            uTime : {value:0},
            uBass: {value:0.0},
        },
        vertexShader:`
            varying vec2 vUv;
            void main(){
                vUv = uv;   // pass uv to fragment shader
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        
        fragmentShader:`
            varying vec2 vUv;
            uniform float uTime;
            uniform float uBass;
            float dot2(vec2 v) { return dot(v, v); } 
            float sdRoundedCross( in vec2 p, in float h )
                {
                    float k = 0.5*(h+1.0/h);
                    p = abs(p);
                    return ( p.x<1.0 && p.y<p.x*(k-h)+h ) ? 
                            k-sqrt(dot2(p-vec2(1,k)))  :
                        sqrt(min(dot2(p-vec2(0,h)),
                                    dot2(p-vec2(1,0))));
                }
            vec3 paletteA(  float t  )
                {   
                    vec3 a= vec3(0.518, 1.558, 0.608);
                    vec3 b= vec3(1.192, 0.236, 0.252);
                    vec3 c= vec3(0.392, 1.112, 0.282);
                    vec3 d= vec3(1.032, 1.312, 1.312);
                    return a + b*cos( 6.283185*(c*t+d) );
                }
            
            vec3 paletteB(  float t  )
                {   
                    vec3 a= vec3(0.388, 0.278, 0.278);
                    vec3 b= vec3(0.918, -0.032, 0.500);
                    vec3 c= vec3(-0.332, -2.172, -0.282);
                    vec3 d= vec3(-0.922, -3.142, 0.248);
                    return a + b*cos( 6.283185*(c*t+d) );
                }

            
            

            void main(){

                vec2 tiledUV = fract(vUv*4.0);   // tile 4x — varying is read-only so use a new var
                vec2 centeredUV = tiledUV - vec2(0.5);
                centeredUV.x *= 2.0;   // sphere UV is always 2:1, correct so circles aren't stretched
                float d = length(centeredUV);
                d=sin(d*10.0+uTime)/10.0;
                
                d= abs(d);
                d= step(0.01,d);
                
                float b = sdRoundedCross( centeredUV, 3.0 );
                b= sin(b*8.0+uTime)/8.0;
                b= abs(b);
                b= step(0.1,b);
                
                vec3 col = mix( paletteA(b),paletteB(b), uBass*b*1.5 );
                gl_FragColor = vec4(col, 1.0);
        }`
    })
    const Sphere = new THREE.Mesh(SphereGeo,SphereMat)
    scene.add(Sphere)

    
    // --- Particle geometry ---
    const count = 5000
    const position = new Float32Array(count * 3)    // flat array: [x0,y0,z0, x1,y1,z1, ...]

    // Distribute particles evenly on a sphere using spherical coordinates
    // theta = horizontal angle (0 → 2π), phi = vertical angle (0 → π)
    // Math.acos of a uniform random gives an even distribution (avoids pole clustering)
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos((Math.random() * 2) - 1)
        const radius = 5.5

        position[i*3]   = radius * Math.sin(phi) * Math.cos(theta)  // x
        position[i*3+1] = radius * Math.cos(phi)                     // y
        position[i*3+2] = radius * Math.sin(phi) * Math.sin(theta)  // z
    }

    // Store a copy of rest positions — needed to reset particles each frame before applying offsets
    // .slice() gives a copy, not a reference
    const originalPositions = position.slice()

    // currentPull stores each particle's pull offset between frames so it can lerp smoothly
    // without this, pull would snap instantly to 0 on mouse release
    const currentPull = new Float32Array(count * 3)

    const clock = new THREE.Clock()


    // --- Mouse state ---
    const mouse = new THREE.Vector3()
    let isMouseDown = false

    window.addEventListener('mousedown', () => isMouseDown = true)
    window.addEventListener('mouseup',   () => isMouseDown = false)

    // Remap mouse from screen pixels to world-space units (roughly –5 to +5)
    window.addEventListener('mousemove', (e) => {
        mouse.x =  (e.clientX / window.innerWidth  - 0.5) * 10
        mouse.y = -(e.clientY / window.innerHeight - 0.5) * 10
        mouse.z = 0
    })


    // --- Build the particle mesh ---
    // BufferGeometry + BufferAttribute is how Three.js sends raw array data to the GPU
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))

    //const material = new THREE.PointsMaterial({ color: 0x03002b, size: 0.05 })
    const material = new THREE.ShaderMaterial({
        transparent: true,
        vertexShader: `
        void main(){
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 5.0;
        }`,
        fragmentShader: `void main(){
            vec2 uv = gl_PointCoord - vec2(0.5);   // 0.5 centres the coord so circle fills the sprite
            if (length(uv) > 0.5) discard;
            gl_FragColor = vec4(0.012, 0.0, 0.169, 1.0);
        }`
    })
    const particle = new THREE.Points(geometry, material)
    scene.add(particle)

    document.body.appendChild(renderer.domElement)


    // --- Animation loop ---
    function animate() {
        // Fill data[] with current frequency amplitudes (0–255 per bin)
        analyser.getByteFrequencyData(data)

        // Average the first 8 bins for bass, bins 8–63 for mids, normalise to 0–1
        const bassraw = data.slice(0, 8).reduce((a, b) => a + b, 0) / 8 / 255
        const midraw  = data.slice(8, 64).reduce((a, b) => a + b, 0) / 56 / 255

        // Lag smoothing — same as TD's Lag CHOP: 90% previous value + 10% new value
        // prevents jittery jumps from single loud frames
        bassnorm = bassnorm * 0.9 + bassraw * 0.1
        midnorm  = midnorm  * 0.9 + midraw  * 0.1

        // Overall energy across all bins drives bloom strength
        const energy = data.reduce((a, b) => a + b, 0) / data.length / 255
        bloomPass.strength = energy * 0.1

        // Elapsed time drives the noise animation so it moves continuously
        const t = clock.getElapsedTime() * 0.5

        for (let i = 0; i < count; i++) {
            const ix = i*3
            const iy = i*3+1
            const iz = i*3+2

            // Rest position of this particle
            const ox = originalPositions[ix]
            const oy = originalPositions[iy]
            const oz = originalPositions[iz]

            // Sine-based noise offset — uses a neighbouring axis as input so X/Y/Z
            // all move differently, giving a curl-like ripple across the surface
            const noiseX = Math.sin(oy * 2.0 + t) * 0.1
            const noiseY = Math.sin(oz * 2.0 + t) * 0.1
            const noiseZ = Math.sin(ox * 2.0 + t) * 0.1

            // Mouse pull — calculate how far this particle is from the cursor
            // targetPull is 0 unless the mouse is held and the particle is within range
            let targetPullX = 0, targetPullY = 0
            if (isMouseDown) {
                const dx = mouse.x - ox
                const dy = mouse.y - oy
                const dist = Math.sqrt(dx*dx + dy*dy)
                if (dist < 5.0) {
                    // Pull strength falls off linearly with distance (strongest at centre)
                    const str = (1.0 - dist / 5.0) * 0.5
                    targetPullX = dx * str
                    targetPullY = dy * str
                }
            }

            // Lerp currentPull toward targetPull each frame
            // On press: eases toward the pull over ~8 frames
            // On release: targetPull is 0, so it eases back — no snap
            currentPull[ix] = currentPull[ix] * 0.88 + targetPullX * 0.12
            currentPull[iy] = currentPull[iy] * 0.88 + targetPullY * 0.12
             const particlebassstr = 0.5
            // Final position = rest + bass push outward + noise ripple + mouse pull
            // bassnorm*2.0 scales the rest position outward from the origin (like inflating the sphere)
            position[ix] = ox + ox * bassnorm * particlebassstr + noiseX + currentPull[ix]
            position[iy] = oy + oy * bassnorm * particlebassstr + noiseY + currentPull[iy]
            position[iz] = oz + oz * bassnorm * particlebassstr + noiseZ
            
        }
         
        // setting rotation for the particle
        particle.rotation.y = clock.getElapsedTime() * 0.05
        particle.rotation.x = clock.getElapsedTime() *0.05 + Math.abs(midnorm * 0.05)

        // Get Elapsed time to animate the background shader
        SphereMat.uniforms.uTime.value = clock.getElapsedTime()*5
        SphereMat.uniforms.uBass.value = bassnorm

        // setting up blender/GLB mesh A and B
        if (meshA) {
            meshA.traverse((child) => {
                if (child.isMesh) {
                    child.material.uniforms.uTime.value = clock.getElapsedTime()*-1.0
                    child.material.uniforms.uBass.value = bassnorm
                }
            })
        }

        if (meshB) {
            meshB.traverse((child) => {
                if (child.isMesh) {
                    child.material.uniforms.uTime.value = clock.getElapsedTime()
                    child.material.uniforms.uMid.value = midnorm
                }
            })
        }

        // Tell Three.js the position array has changed — re-uploads it to the GPU
        geometry.attributes.position.needsUpdate = true

        controls.update()
        composer.render()
        requestAnimationFrame(animate)
    }
    animate()

    // toggle fullscreen — desktop double-click + mobile double-tap
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    }

    window.addEventListener('dblclick', toggleFullscreen)

    let lastTap = 0
    window.addEventListener('touchend', () => {
        const now = Date.now()
        if (now - lastTap < 300) toggleFullscreen()
        lastTap = now
    })

    // resize handler inside init() so camera, renderer and composer are in scope
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        composer.setSize(window.innerWidth, window.innerHeight)

    })
}

// Wait for the user to click a button before starting
// (browser requires a user gesture before mic access + AudioContext can run)
function startWithSource(source) {
    document.getElementById('overlay').style.display = 'none'
    init(source)
}

document.getElementById('btn-mic').addEventListener('click',    () => startWithSource('mic'))
document.getElementById('btn-system').addEventListener('click', () => startWithSource('system'))

if (/Mobi|Android/i.test(navigator.userAgent)) {
    document.getElementById('btn-system').style.display = 'none'
}
    