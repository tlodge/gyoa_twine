import { useEffect, useState } from "react";
//import { MediaRecorder, register } from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
import lamejs from 'lamejstmp';


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

const useRecorder = () => {
  const [audioURL, setAudioURL] = useState("");
  const [audioData, setAudioData] = useState();
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);

  useEffect(() => {
    // Lazily obtain recorder first time we're recording.
    if (recorder === null) {
      if (isRecording) {
        requestRecorder().then(setRecorder, console.error);
      }
      return;
    }

    // Manage recorder state.
    if (isRecording) {
      recorder.start();
    } else {
      recorder.stop();
    }

    //Obtain the audio when ready.
    //can this be converted to a wav??
    const handleData = e => {

      //const blob = new Blob([e.data], { 
      //  'type': 'audio/mp3' 
      //});
      //let wavSamples = new Int16Array(btwArrBuff, wavHdr.dataOffset, wavHdr.dataLen / 2);

      //const data =  wavToMp3(wavHdr.channels, wavHdr.sampleRate, wavSamples);
      //console.log(data);

      const reader = new FileReader();
      const audioContext = new AudioContext()

      reader.addEventListener('load', e =>{
          const abuffer = e.target.result;
          audioContext.decodeAudioData(abuffer, (audioBuffer) => {

            const {data} = generateWave(audioBuffer);
            setAudioData(data);
          });
          //console.log("ok have", e.target.result);
           //const converted = generateWave(e.target.result);
           //console.log(converted);
           //now we need to convert this to a mp3
      
      });
      reader.readAsArrayBuffer(e.data);
      //this.empty();

      //console.log(e);
      //const url = URL.createObjectURL(e.data);
      //setAudioURL(url);
      //setAudioData(e.data);
    };

    recorder.addEventListener("dataavailable", handleData);
    return () => recorder.removeEventListener("dataavailable", handleData);
  }, [recorder, isRecording]);

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  return [audioURL, audioData, isRecording, startRecording, stopRecording];
};

async function requestRecorder() {
 // await register(await connect());
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return new MediaRecorder(stream);//, { mimeType: 'audio/wav' });
}
export default useRecorder;
