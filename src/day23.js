
async function init() {
    

    const stream = await navigator.mediaDevices.getUserMedia({audio:true})
    const audiCntxt= new AudioContext()
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
        console.log('bass:',bassnorm.toFixed(3),'mid:',midnorm.toFixed(3))
        requestAnimationFrame(animate)
    }
    animate()
}

init()