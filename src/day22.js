
async function init() {
    

    const stream = await navigator.mediaDevices.getUserMedia({audio:true})
    const audiCntxt= new AudioContext()
    const analyser = audiCntxt.createAnalyser()
    const source = audiCntxt.createMediaStreamSource(stream)
    source.connect(analyser)
    const data= new Uint8Array(analyser.frequencyBinCount)

    function animate(){
        requestAnimationFrame(animate)
        analyser.getByteFrequencyData(data)
        console.log(data.slice(0,10))
    }
    animate()
}

init()