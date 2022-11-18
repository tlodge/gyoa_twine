import {useEffect, useState, useRef} from 'react';
import wavesurfer from './waves/wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';
import './Editor.css';
import {MdCrop, MdArrowForward, MdVolumeDown, MdVolumeUp   } from "react-icons/md";
import lamejs from 'lamejstmp';

function Track({fileURL, playing, onStop, onSelect, clearRegions, regionsCleared, id, maxduration, onTrimmed, onScale, onModify}) {
    
    const wavesurferRef = useRef(null);
    const [wavesurferObj, setWavesurferObj] = useState();
    
    useEffect(() => {
      
		if (wavesurferRef.current && !wavesurferObj) {
           
            const surf = wavesurfer.create({
                container: `#waveform-${id}`,
                scrollParent: true,
                autoCenter: true,
                cursorColor: 'violet',
                loopSelection: true,
                waveColor: '#211027',
                progressColor: '#69207F',
                responsive: true, 
                plugins: [
                    TimelinePlugin.create({
                        container: '#wave-timeline',
                    }),
                    RegionsPlugin.create({
                       
                        regions: [
                            /*{
                                start: 1,
                                end: 3,
                                loop: false,
                                color: 'hsla(400, 100%, 30%, 0.5)'
                            },*/
                        ],
                        dragSelection: {
                            slop: 5,
                        
                        }
                    }),
                ],
            })

    
            //only allow one region to be created!
            surf.on('region-created', (region, e)=>{
                if (Object.keys(surf.regions.list).length >= 1){
                    surf.regions.clear();
                }
                onSelect(true);
            })

            surf.on('region-updated', (region) => {
                const regions = region.wavesurfer.regions.list;
                const keys = Object.keys(regions);
                if (keys.length > 1) {
                    regions[keys[0]].remove();
                }
            });

            //THIS WILL EXPAND THE CURRENT TRACK IF IT IS SMALLER THAN EXISTING TRACKS
            surf.on('ready', ()=>{
                if (maxduration == 0)
                    return;
                //expand the wave to the maximum track length
                
                //console.log(id, "max duration is", maxduration, "sample rate", surf.backend.buffer.sampleRate, " buffer len is", surf.backend.buffer.length, "max duration is", Math.floor(surf.backend.buffer.sampleRate*maxduration));
                if (surf.backend.buffer.length < Math.floor(surf.backend.buffer.sampleRate*maxduration)){
                  
                    const originalBuffer = surf.backend.buffer; 
                    const _expanded = surf.backend.ac.createBuffer(originalBuffer.numberOfChannels,Math.round(originalBuffer.sampleRate*maxduration), originalBuffer.sampleRate);
                    const original =  originalBuffer.getChannelData(0);
                    const segment = _expanded.getChannelData(0);
            
                    for (let j = 0; j < originalBuffer.length; j++){
                        segment[j] = original[j];
                    }
                    surf.loadDecodedBuffer(_expanded);
                    let {data:audioData} = generateWave(surf.backend.buffer, 0, surf.backend.buffer.length);
                    var reader = new FileReader();

                    reader.addEventListener("loadend", async function() {
                        var base64FileData = reader.result.toString();
                        await onScale({
                            src: base64FileData.replace("application/octet-stream","audio/mp3"),
                           
                        })
                    });
                    reader.readAsDataURL(audioData);
                }
            });

            surf.on('interaction', ()=>{
                surf.regions.clear();
                surf.setProgressColor("#000");
                surf.setWaveColor("#000");
                onSelect(false);
            })
            // once audio starts playing, set the state variable to false
            surf.on('finish', () => {
                onStop();
            });
			setWavesurferObj(surf);

		}
	}, [wavesurferRef, wavesurferObj]);


     //THIS WILL ADJUST THE SIZE OF THE TRACK TO MAXDURATION (MIGHT EXPAND OR CONTRACT)
    useEffect(()=>{
      
        //give wavesurfer time to init!
        if (wavesurferObj){
            setTimeout(async ()=>{
               await normalise();
            },500)
        }
    }, [wavesurferObj, maxduration]);

    useEffect(()=>{
        if (clearRegions){
            wavesurferObj.regions.clear();
            //tell parent that regions are cleared
            regionsCleared(true);
        }
    },[clearRegions]);

    useEffect(() => {
		if (fileURL && wavesurferObj) {
			wavesurferObj.load(fileURL);
		}
	}, [fileURL, wavesurferObj]);
   
    
    const normalise = async ()=>{
        
        
        if (wavesurferObj && wavesurferObj.backend && wavesurferObj.backend.buffer){
            
          

            const originalBuffer = wavesurferObj.backend.buffer; 
           
            const _normalised = wavesurferObj.backend.ac.createBuffer(originalBuffer.numberOfChannels,originalBuffer.sampleRate*maxduration, originalBuffer.sampleRate);
            const original =  originalBuffer.getChannelData(0);
            const segment = _normalised.getChannelData(0);
            
            const originallen = originalBuffer.length;
           
            const newlen = Math.floor(originalBuffer.sampleRate*maxduration);
            
            //hystersis
            const diff = Math.abs(originallen - newlen);
            
            if (diff < 10){
                return;
            }

            if (originallen < newlen){
               
                for (let j = 0; j < originalBuffer.length; j++){
                    segment[j] = original[j];
                }
                wavesurferObj.loadDecodedBuffer(_normalised);
                //console.log(id, "orginal < newlen so scaling up!!")
                await scale();
            }
            else if (originallen > newlen){
                
                for (let j = 0; j < segment.length; j++){
                    segment[j] = original[j];
                }
                wavesurferObj.loadDecodedBuffer(_normalised);
               
                //console.log(id, "orginal > newlen so scaling down !!")
                //calling scale here screws things...
                //await scale(maxduration);
            }       
        }
    }

    function wavToMp3(channels, sampleRate, samples) {
        var buffer = [];
        var mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128);
        var remaining = samples.length;
        var samplesPerFrame = 1152;
        for (var i = 0; remaining >= samplesPerFrame; i += samplesPerFrame) {
            var mono = samples.subarray(i, i + samplesPerFrame);
            var mp3buf = mp3enc.encodeBuffer(mono);
            if (mp3buf.length > 0) {
                buffer.push(new Int8Array(mp3buf));
            }
            remaining -= samplesPerFrame;
        }
        var d = mp3enc.flush();
        if(d.length > 0){
            buffer.push(new Int8Array(d));
        }
    
        var data = new Blob(buffer, {type: 'audio/mp3'});

       
        return {url:URL.createObjectURL(data), data};
        //var bUrl = window.URL.createObjectURL(mp3Blob);
    
        // send the download link to the console
        //console.log('mp3 download:', bUrl);
    
    }

    const generateWave  = (aBuffer)=>{
        let numOfChan = aBuffer.numberOfChannels,
            btwLength = aBuffer.length * numOfChan * 2 + 44,
            btwArrBuff = new ArrayBuffer(btwLength),
            btwView = new DataView(btwArrBuff),
            btwChnls = [],
            btwIndex,
            btwSample,
            btwOffset = 0,
            btwPos = 0;
        setUint32(0x46464952); // "RIFF"
        setUint32(btwLength - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"
        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(aBuffer.sampleRate);
        setUint32(aBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2); // block-align
        setUint16(16); // 16-bit
        setUint32(0x61746164); // "data" - chunk
        setUint32(btwLength - btwPos - 4); // chunk length
    
        for (btwIndex = 0; btwIndex < aBuffer.numberOfChannels; btwIndex++)
            btwChnls.push(aBuffer.getChannelData(btwIndex));
    
        while (btwPos < btwLength) {
            for (btwIndex = 0; btwIndex < numOfChan; btwIndex++) {
                // interleave btwChnls
                btwSample = Math.max(-1, Math.min(1, btwChnls[btwIndex][btwOffset])); // clamp
                btwSample = (0.5 + btwSample < 0 ? btwSample * 32768 : btwSample * 32767) | 0; // scale to 16-bit signed int
                btwView.setInt16(btwPos, btwSample, true); // write 16-bit sample
                btwPos += 2;
            }
            btwOffset++; // next source sample
        }
    
        let wavHdr = lamejs.WavHeader.readHeader(new DataView(btwArrBuff));
        let wavSamples = new Int16Array(btwArrBuff, wavHdr.dataOffset, wavHdr.dataLen / 2);
    
        return wavToMp3(wavHdr.channels, wavHdr.sampleRate, wavSamples);
    
        function setUint16(data) {
            btwView.setUint16(btwPos, data, true);
            btwPos += 2;
        }
    
        function setUint32(data) {
            btwView.setUint32(btwPos, data, true);
            btwPos += 4;
        }
    }

    /*const generateWave = (abuffer, offset, len)=>{
        
        var numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        pos = 0;
          
        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"
        
        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // length = 16
        setUint16(1);                                  // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit (hardcoded in this demo)
        
        setUint32(0x61746164);                         // "data" - chunk
        setUint32(length - pos - 4);                   // chunk length
        
        // write interleaved data
        for(i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));
        
        while(pos < length) {
            for(i = 0; i < numOfChan; i++) {             // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);          // update data chunk
            pos += 2;
            }
            offset++                                     // next source sample
        }
          
        // create Blob
        const data = new Blob([buffer]);
        return {url:URL.createObjectURL(data, {type: "audio/wav"}), data};
  
        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }
          
        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }*/

    const reverse = ()=>{
        
        const originalBuffer = wavesurferObj.backend.buffer; 
        const _todecode = wavesurferObj.backend.ac.createBuffer(originalBuffer.numberOfChannels,wavesurferObj.backend.buffer.length , originalBuffer.sampleRate);
        const channel =  wavesurferObj.backend.buffer.getChannelData(0);
        const segment = _todecode.getChannelData(0);

        for (let j = 0; j < wavesurferObj.backend.buffer.length; j++){
            segment[j] = channel[wavesurferObj.backend.buffer.length-j];
        }
        wavesurferObj.loadDecodedBuffer(_todecode);
    }

    const scale = (original)=>{
        return new Promise((resolve, reject)=>{  
           
            let {data:audioData} = generateWave(wavesurferObj.backend.buffer, 0, wavesurferObj.backend.buffer.length);
        
            var reader = new FileReader();

            reader.addEventListener("loadend", async function() {
                var base64FileData = reader.result.toString();

                
                let track = {
                    src: base64FileData.replace("application/octet-stream","audio/mp3"),
                }

                if (original){
                    original = Number(Number(original).toFixed(2));
                    
                    track = {
                        ...track,
                        original
                    }
                }
                console.log(id, " scaling track ", track);
                await onScale(track);
                
                resolve();
            });

            reader.readAsDataURL(audioData);
        });
    }


    const modify = (original)=>{
        return new Promise((resolve, reject)=>{  
           
            let {data:audioData} = generateWave(wavesurferObj.backend.buffer, 0, wavesurferObj.backend.buffer.length);
        
            var reader = new FileReader();

            reader.addEventListener("loadend", async function() {
                var base64FileData = reader.result.toString();

                
                let track = {
                    src: base64FileData.replace("application/octet-stream","audio/mp3"),
                }
                console.log(id, " modifying track", track);
                await onModify(track);
                
                resolve();
            });

            reader.readAsDataURL(audioData);
        });
    }
    const adjustVolume = async (scale=1)=>{
        const regionkey = Object.keys(wavesurferObj.regions.list)[0];
        const region = wavesurferObj.regions.list[regionkey];

        if (!region){
            return;
        }
        
        const originalBuffer = wavesurferObj.backend.buffer; 
           
        const _from = Math.round(region.start.toFixed(2) * originalBuffer.sampleRate);
        const _to = Math.round(region.end.toFixed(2) *  originalBuffer.sampleRate);
        
        const _todecode = wavesurferObj.backend.ac.createBuffer(originalBuffer.numberOfChannels,originalBuffer.length, originalBuffer.sampleRate);
        const original =  originalBuffer.getChannelData(0);
        const newwave = _todecode.getChannelData(0);
   
        for (let j = 0; j < _from; j++){
            newwave[j] = original[j];
        }
        for (let j = _from; j < _to; j++){
            newwave[j] = original[j] * scale;
        }
        for (let j = _to; j < _todecode.length; j++){
            newwave[j] = original[j];
        }
        wavesurferObj.loadDecodedBuffer(_todecode);
        await modify();
    }

    const insertSilence = async (right=true)=>{
        

        const regionkey = Object.keys(wavesurferObj.regions.list)[0];
        const region = wavesurferObj.regions.list[regionkey];
        
        if (!region){
         return;
        }
        const originalBuffer = wavesurferObj.backend.buffer; 
        
       
        const _from = Math.round(region.start.toFixed(2) * originalBuffer.sampleRate);
        const _to = Math.round(region.end.toFixed(2) *  originalBuffer.sampleRate);
        const silenceduration = Math.round(_to-_from);
       

        const _todecode = wavesurferObj.backend.ac.createBuffer(originalBuffer.numberOfChannels,originalBuffer.length, originalBuffer.sampleRate);
        const original =  originalBuffer.getChannelData(0);
        const newwave = _todecode.getChannelData(0);

        if (right){
        
            for (let j = 0; j < _from; j++){
                newwave[j] = original[j];
            }

             for (let j = _to;  j < _todecode.length; j++){
                newwave[j] = original[j-silenceduration];
             }

        }else{
            for (let j = _from; j < _todecode.length; j++){
                newwave[j] = original[j+silenceduration];
            }
        }

        wavesurferObj.loadDecodedBuffer(_todecode);
        await modify();
    }

    const trimaudio = async ()=>{
       
        if (wavesurferObj) {
           const regionkey = Object.keys(wavesurferObj.regions.list)[0];
           const region = wavesurferObj.regions.list[regionkey];
        
           if (!region){
            return;
           }

           
           const start = region.start.toFixed(2);
           const end = region.end.toFixed(2);
           
           const originalBuffer = wavesurferObj.backend.buffer;
        
           const fulllength    = wavesurferObj.backend.buffer.duration;
           const regionlength  = end - start;
          
            //NB: wavesurferObj.backend.buffer.length ===  wavesurferObj.backend.buffer.duration * wavesurferObj.backend.buffer.sampleRate
           const trimmed = wavesurferObj.backend.ac.createBuffer(originalBuffer.numberOfChannels, ( (fulllength-regionlength) * (originalBuffer.sampleRate * 1)), originalBuffer.sampleRate);

           for (var i = 0; i < originalBuffer.numberOfChannels; i++) {
               const chanData = wavesurferObj.backend.buffer.getChannelData(i);
               const segmentChanData = trimmed.getChannelData(i);
               
               for (var j = 0; j < start * originalBuffer.sampleRate; j++) {
                   segmentChanData[j] = chanData[j];
               }
               for (var j = Math.round(start * originalBuffer.sampleRate); j <  (fulllength) * originalBuffer.sampleRate; j++) {
                   segmentChanData[j] = chanData[j + (regionlength * originalBuffer.sampleRate)];
               }
           }
           await  wavesurferObj.loadDecodedBuffer(trimmed);
           wavesurferObj.regions.clear(); 
        
           let {data:audioData} = generateWave(wavesurferObj.backend.buffer, 0, wavesurferObj.backend.buffer.length);
        
           var reader = new FileReader();

           reader.addEventListener("loadend", async function() {
               var base64FileData = reader.result.toString();
               let track = {
                   src: base64FileData.replace("application/octet-stream","audio/mp3"),
                   original: trimmed.duration
               }
               onTrimmed(track);
           });

           reader.readAsDataURL(audioData);
        }
    }

    

    useEffect(() => {
		if (wavesurferObj) {

            if (playing){
                wavesurferObj.play(0);
                wavesurferObj.enableDragSelection({}); // to select the region to be trimmed           
            }else{
                wavesurferObj.pause();
            }
		}
	}, [playing]);


    const deselect = ()=>{
        wavesurferObj.regions.clear();
        onSelect(false);
    }

    const ToolbarItem = (props)=>{
        return <div className="toolbarbutton">
                    <div className="icon" onClick={props.onClick}>
                         {props.children}
                    </div>
                    <div className="label" onClick={props.onClick}>
                         {props.label}
                    </div>
                </div>
    }
   
    const renderToolbar = ()=>{
        return <div className="editortoolbar">
            <div className="tools">
                <ToolbarItem onClick={()=>insertSilence(true)} label="shift right"><MdArrowForward/></ToolbarItem>
                <ToolbarItem onClick={trimaudio} label="trim"><MdCrop/></ToolbarItem>
                <ToolbarItem onClick={()=>adjustVolume(2)} label="volume +"><MdVolumeUp/></ToolbarItem>
                <ToolbarItem onClick={()=>adjustVolume(0.5)} label="volume -"><MdVolumeDown/></ToolbarItem>
            </div>
        </div>
    }

    const amSelected = ()=>{
        let regions = 0;
        if (wavesurferObj){
            regions = Object.keys(wavesurferObj.regions.list).length;
        }
        return regions > 0;
    } 

    return <div >
        {`${id}, ${maxduration}`}
        <div ref={wavesurferRef} id={`waveform-${id}`} style={{width: `calc(100vw - 80px)`}}/>
        {amSelected() && renderToolbar()}
        
    </div>

}

export default Track;