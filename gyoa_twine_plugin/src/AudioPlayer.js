import {useEffect, useRef} from 'react';
import './Player.css';


function AudioPlayer({src, onFinish, play}) {
    
   const playerRef = useRef();

    useEffect(()=>{
        if(play){
            playerRef.current.src = src; 
            playerRef.current.play();
            playerRef.current.onended = ()=>{
                onFinish();
            };
        }
    },[play, src]);
   
    return (
        <audio src={src} ref={playerRef} style={{display:"none"}} controls="controls" />
    )
}

export default AudioPlayer;
