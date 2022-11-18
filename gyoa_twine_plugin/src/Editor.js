
import {useEffect, useState, useRef} from 'react';
import {MdPlayCircleFilled, MdStopCircle, MdDeleteForever, MdMusicNote, MdOutlineCarpenter, MdOutlineSave, MdOutlineUndo, MdUndo} from "react-icons/md";
import './Editor.css';
import Track from './Track'
import { getSrcDuration, uniqueid} from './utils/audio';

const colours = ["#ECEFF1", "#CFD8DC", "#B0BEC5","#90A4AE","#78909C","#607D8B","#546E7A"];

let history = [];

let tracks = [];
let maxduration = 0;



function Editor({tracks:_tracks, id, onSave}) {

    const setTracks = (_tracks)=>{
    
        const _maxduration = (_tracks||[]).reduce((acc, track)=>{
            return Math.max(acc, track.duration);
        },0);
         
        const _originalduration = (_tracks||[]).reduce((acc, track)=>{
            return Math.max(acc, track.original);
        },0);

        maxduration = Math.min(_originalduration, _maxduration); 
    
        if (_originalduration < _maxduration){
           tracks = _tracks.map(t=>({
                ...t,
                duration: maxduration,
            }));
        }else{
            tracks = [..._tracks];
        }   

        
        setChanged(Date.now());
    }

    const undo = async ()=>{
        if (history.length > 0){
            tracks = history.pop();
            await onSave(tracks);
            setChanged(Date.now());
        }
    }

    const regionLen = useRef(0);
    const playLen = useRef(0);
    const timelineRef = useRef(null);
    const [playing, setPlaying] = useState(false); 

  
    const [selections, setSelections] = useState(0);
    const [clearRegions, setClearRegions] = useState(false);
    const [trim, setTrim] = useState(false);
    const [changed, setChanged] = useState(Date.now());
   

    useEffect(()=>{
        setTracks(_tracks);
       
    },[_tracks]);

  

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

    const handleSelect = (selected)=>{
    
        if (selected){
            regionLen.current += 1;
        }
        else{ 
            regionLen.current -= 1;
        }
        setSelections(regionLen.current);
        
    }

    const handleTrim = (value)=>{
        setTrim(value);
    }

    const handleDeselect = ()=>{
        setClearRegions(true);
    }

    const regionsCleared = ()=>{
        setClearRegions(false);
    }

    const togglePlay = ()=>{
        setPlaying(!playing);
    }

    const play = ()=>{
        playLen.current = tracks.length;
        setPlaying(true);
    }

    const finishedPlaying = ()=>{
      
        playLen.current -= 1;
        if (playLen.current <= 0){
            setPlaying(false);
            playLen.current = 0;
        }
    }

    
    const handleSubmission =  (event) => {
        const selectedFile = event.target.files[0]
       
        const fileReader = new FileReader();
        fileReader.readAsBinaryString(selectedFile);

        fileReader.onload = async (e) => {
          const {result} = e.target;
          const base64str = btoa( result); 
          const _duration = await getSrcDuration("data:audio/wav;base64,"+base64str);
          const duration = Number(_duration);
          const _tracks = [...tracks, {id: uniqueid(), duration, original:duration, src:"data:audio/wav;base64,"+base64str}]
          history.push([...tracks]);
          setTracks(_tracks);
          await onSave(_tracks);
        };
    }

    const renderUpload = ()=>{
        return <label className="custom-file-upload">
			            <input  type="file" name="file" accept=".wav" onChange={handleSubmission} />
                        <ToolbarItem label="add track"><MdMusicNote/></ToolbarItem>
	            </label>              
    }

    const onTrimmed = (id, track)=>{
        const _tracks = [...tracks];
        setTracks([]);
        //works by forcing a re-render;
        setTimeout(async ()=>{
            const _newtracks = _tracks.reduce((acc, t)=>{
                if (t.id === id){
                    return [...acc, {...t, ...track, duration:Math.min(track.original, t.original)}]
                }
                return [...acc, t];
            },[])
            setTracks(_newtracks);
            await onSave(_newtracks);
        },100);
    }

    const onModify = async (id, track)=>{
        const _tracks = tracks.reduce((acc, t)=>{
            if (t.id === id){
               return [...acc, {...t, ...track}]
           }
           return [...acc, t];
       },[])
        history.push([...tracks]);
        setTracks(_tracks)
        await onSave(_tracks);
    }

    const onScale = async (id, track)=>{
        
       
       
        const duration = await getSrcDuration(track.src);
      
        
        //need to make state updates synchronous as multiple tracks may update simultaneously and current state may be overwritten
        const _tracks = tracks.map((t)=>{
            if (t.id == id){
                return {...t, ...track, duration}//, ...track};
            }
            return t;
        });
        
        setTracks(_tracks);
        await onSave(_tracks);
    }

    const deleteTrack = async (index)=>{
        const _tracks = tracks.reduce((acc, track, i)=>{
            if (i !== index){
                return [...acc, track];
            }
            return acc;
        },[]);

        setTracks(_tracks);
        await onSave(_tracks);
    }

    const renderTracks = ()=>{
        return tracks.map((t,i)=>{
            return  <div className="track" key={i} style={{background:colours[i%colours.length]}}>
                        <Track  changed={changed} id={t.id} maxduration={maxduration.toFixed(2)} fileURL={t.src} onTrimmed={(track)=>{onTrimmed(t.id, track)}} onModify={(track)=>{onModify(t.id, track)}} onScale={(track)=>onScale(t.id,track)} playing={playing} trim={trim} onStop={finishedPlaying} onSelect={handleSelect} clearRegions={clearRegions} regionsCleared={regionsCleared} />
                        <div className="deleteIcon" onClick={()=>deleteTrack(i)}> <MdDeleteForever/></div>
                    </div>
        })
    }

   
    const renderToolbar = ()=>{
        return  <div className="audiotoolbar">
            <div className="leftbuttons">
                {renderUpload()}
            </div>
            <div className="middlebuttons">
                {!playing && <ToolbarItem onClick={play} label="play"><MdPlayCircleFilled/></ToolbarItem>}
                {playing &&  <ToolbarItem onClick={togglePlay} label="stop"><MdStopCircle/></ToolbarItem>}
                {history.length > 0 &&  <ToolbarItem onClick={undo} label="undo"><MdUndo/></ToolbarItem>}
            </div>
            <div className="rightbuttons" style={{opacity: regionLen.current > 0 ? 1 : 0.5}}>
                {/*<ToolbarItem onClick={()=>handleTrim(true)} label="trim"><MdOutlineCarpenter current={regionLen.current}/></ToolbarItem>
                <ToolbarItem onClick={handleDeselect} label="deselect"><MdOutlineUndo onClick={handleDeselect}/></ToolbarItem>*/}
            </div>
        </div>
    }

    return <div id="editor">    
                <div className="tracklist">
                    <div className="gridlines" style={{height:180 * tracks.length}}>
                        
                    </div>
                    {renderTracks()}
                    <div ref={timelineRef} id='wave-timeline' />
                    {tracks.length > 0 && renderToolbar()}
                </div>
        </div>

}

export default Editor;