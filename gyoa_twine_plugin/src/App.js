import './App.css';
import { useEffect, useState, useRef } from 'react';
import {id, domToObject, parseLinks, filterLinkText, format} from './utils';
import { MdRecordVoiceOver} from "react-icons/md";
import { ImSpinner } from "react-icons/im"; 
import useRecorder from './hooks/useRecorder';

import Recorder from './Recorder';
import Editor from './Editor';

import {generate} from './utils/export';
import { getSrcDuration, uniqueid, uniquename } from './utils/audio';
import request from 'superagent';

function App() {

  let [audioURL, audioData, isRecording, _startRecording, _stopRecording] = useRecorder();
  
  //const [completed, setCompleted] = useState({});
  const _completed = useRef(null);

  const [completed, _setCompleted] = useState([]);
  const [passages, setPassages] = useState([]);
  const [startPassage, setStartPassage] = useState({});
  const [characters, setCharacters] = useState([]);
  const [filters, setFilters] = useState([]);
  const [browserId, setBrowserId] = useState();
  const [db, setDB] = useState();
  //const [src, setSrc] = useState();
  const [tracks, setTracks] = useState();
  const [selectedDialogue, setSelectedDialogue] = useState();
  const [lineId, setLineId] = useState("");
  const [newData, setNewData] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [mode, setMode] = useState("saved");
  const [saveStatus, setSaveStatus] = useState("");


  const setCompleted = (obj)=>{
      _completed.current = obj;
      console.log(_completed.current);

      if (browserId){
        localStorage.setItem(`completed-${browserId}`, JSON.stringify(_completed.current));
      }
      _setCompleted(obj);
  }

  const togglePlayer = ()=>{
    setShowPlayer(!showPlayer)
  }

  const toggleFilter = (character)=>{
      if (filters.indexOf(character) == -1){
        setFilters([...filters, character]);
      }else{
        setFilters(filters.filter(f=>f!=character));
      }
  }

  const startRecording = (id)=>{
    setNewData(false);
    setShowRecorder(true);
   
  }

  const stopRecording = (id)=>{
    setShowRecorder(false);
   _stopRecording();
  }

  const changeId = ()=>{
      const id = uniquename();
      localStorage.setItem('browserId', id);
      setBrowserId(id);
  }


  useEffect(()=>{

    setCompleted(JSON.parse(localStorage.getItem(`completed-${id}`) || "{}"));

   
    const dbName = "recordings";
    const request = indexedDB.open(dbName, 3);

    request.onsuccess = event => {
      setDB(event.target.result);   
    };

    request.onerror = event => {
      console.log("error creating database!");
    };
    
    request.onupgradeneeded = event => {
      
      const _db = event.target.result;
      setDB(_db);
      try{
        _db.createObjectStore("audio", { keyPath: "id" });
      }
      catch(err){
        //ignore as thrown when object store already exixts
      }
    };

  },[]);

  useEffect(()=>{
   
    const handleAudioData = ()=>{
     
      //need to update tracks at some point??
      var reader = new FileReader();
      reader.addEventListener("loadend", async function() {
        
       
        var base64FileData = reader.result.toString();
       
        const duration = await getSrcDuration(base64FileData);
       
        var mediaFile = {
          id: uniqueid(),
          src: base64FileData,
          duration,
          original: Number(duration),
        };
       
        const id = lineId;
        const _tracks = await fetchData(id);
       

        var tx = db.transaction("audio", "readwrite");
        var store = tx.objectStore("audio");
        const insert = store.put({id,tracks:[mediaFile]})
        
        insert.onsuccess = () => {
          const _newcompleted = { 
            ..._completed.current,
            [id]: true,
          }
          setCompleted(_newcompleted)
          
          setTracks([mediaFile, ..._tracks]);
          setNewData(true);
        };
       

        
      });
      
      reader.readAsDataURL(audioData);
    }

    if (audioData){
       handleAudioData();
    }
  },[audioData]);

  useEffect(()=>{
    let storydata = document.querySelector('tw-storydata');
     setBrowserId(storydata.attributes['name'].value);
    

    let tags = {};

    const {passages:_passages, startPassage:_startPassage} = domToObject(storydata);
    
    setPassages(_passages.reduce((acc,passage)=>{
      
      tags = (passage.tags || []).reduce((acc, tag)=>{
          return {...acc, [tag]:tag}
      }, tags)

      return [...acc, {...passage, link: parseLinks(passage.text), text:filterLinkText(passage.text)}]
    },[]));

    setCharacters([...Object.keys(tags), "a narrator"]);
    setFilters([...Object.keys(tags).filter(t=>t!=="Waypoint"), "a narrator"])
    setStartPassage(_startPassage);
  },[]);

  const fetchData = (id)=>{
    return new Promise((resolve, reject)=>{
      if (db && id){
        
        //important!!
        setTracks([]);
        var tx = db.transaction("audio", "readwrite");
        var store = tx.objectStore("audio");
        const request = store.get(id);

        request.onsuccess = event => {
          const {result={}} = event.target;
          const {tracks} = result;
        
          if (tracks){
            resolve(tracks);
            setNewData(true);
          }else{
            resolve([])
          }
        }
      }else{
        resolve([]);
      }
    })
  }
  useEffect(()=>{
   
    //console.log("fetching data for", lineId);
    const fetchDataAsync = async (id)=>{
      const tracks = await fetchData(id);
      setTracks(tracks);
    } 
    fetchDataAsync(lineId);

  },[lineId])

  const renderCharacterSelection = ()=>{
    const items = characters.filter(c=>c!== "Waypoint").map((character)=>{
      return <div key={character} style={{fontWeight: filters.indexOf(character) == -1 ? 300: 700}} onClick={()=>{toggleFilter(character)}} className="character">{character}</div>
    });
    return <div className="filterLine">
        <div className="filter">Filter</div>
        {items}
    </div>
  }

  const filter = (passages)=>{
    return passages.filter(p=>{
        return p.tags.reduce((acc, item)=>{
            return acc || filters.indexOf(item) !== -1;
        }, false);
    });
  }

  const renderActions = (passage)=>{
    return <div className="actions">
            <div onClick={()=>startRecording(id(passage.name))} className="record"><MdRecordVoiceOver/></div>
          </div>
  }

  const lineSelected = (id)=>{
    setSelectedDialogue(id)
    setLineId(id);
  }


  const onDownload = async()=>{
      const {tracks} = await generate(passages);
     
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(tracks)
      )}`;
    
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `tracks.json`;
      link.click();
  }  

  const saveMediaToCloud =  ({id, src})=>{
    return new Promise((resolve, reject)=>{
      request.post(`${process.env.APP_URL}/api/savewav`).send({folder:browserId, id, data:src}).set('Content-Type', 'application/json').end(function(err,res){
        if (err){
          console.log("Error saving media", err);
          resolve(false);
          return;
        }
        console.log("saved", res);
        resolve(true);
      });
    })
  }

  const saveScriptToCloud =  ({id, script})=>{
   return new Promise((resolve, reject)=>{
     request.post(`${process.env.APP_URL}/api/save`).send({ id, script}).set('Content-Type', 'application/json').end(function(err,res){
       if (err){
          console.log("Error saving script", err);
          resolve(false);
          return;
       }
       console.log("saved", res);
       resolve(true);
     });
   })
 }
   
  const saveToServer = async ()=>{
   
      setMode("saving");
      
      const {tracks, script} = await generate(passages);
      console.log("script is", script);

      const srcs = Object.keys(tracks).reduce((acc, key)=>{
         const _srcs = (tracks[key]||[]).map(t=>({id:t.id, src:t.src}));
          return [...acc, ..._srcs];
      },[]);

      await(saveScriptToCloud({id:browserId, script}));
     
      setSaveStatus("0%");

      const saveTracks = async (srcs)=>{
          const total = srcs.length;
          let saved = 0;
          let retries = [];
          
          for (const track of srcs){
            console.log("saving", track.id);
            const success = await saveMediaToCloud(track);
            if (success){
              saved += 1;
              setSaveStatus(`${Math.round((saved/total)*100)}%`);
            }else{
              console.log("adding file to retry list!");
              setSaveStatus(`!`);
              retries.push(track);
            }
          }
          if (retries.length > 0){
             console.log("re trying!");
             setTimeout(()=>saveTracks(retries), 1000);
          }
      }

      await saveTracks(srcs);

      console.log("--> finished saving to server");
      setMode("saved");
  }

  const renderToolbar = ()=>{
    return <div className="toolbar">
        <div className="toolbarleft">
           <div onDoubleClick={changeId} className="toolbarheading">{`id: ${browserId}`}</div>
        </div>
        <div className="toolbarright">
          <div className="toolbaritem">  
            <button onClick={saveToServer} className="toolbarbutton">
              {mode === "saved" && "publish to app"}
              {mode === "saving" && <div><div className="spinning" style={{width:101}}><ImSpinner/></div>{saveStatus}</div>}
            </button>
            <button onClick={onDownload} className="toolbarbutton">download tracks</button>
            <label className="toolbarbutton" style={{fontWeight:700, fontSize:"0.8em", marginLeft:10}}>
                <input  type="file" name="file" accept=".json" onChange={fileChangeHandler} />
                    upload tracks
             </label>
          </div>
        </div>
    </div>
  }

  const renderPassages = ()=>{
   
    return filter(passages).map(p=>{
     
      const narrator = (p.tags || []).filter(t=>t!=="Waypoint").join("") || "a narrator";

      return <div id={p.id} key={p.id}>
              <div className="line" >
                  <div className="narrator">{narrator}</div>
                  <div onClick={()=>lineSelected(id(p.name))} style={{color : _completed.current[id(p.name)] ? 'green' : 'black'}} className="dialogue">{format(p.text)}</div>
                  {selectedDialogue == id(p.name) && renderActions(p)}
                 
              </div>
              {/* lineId == id(p.name) && renderAudioController(id(p.name))*/}
              { lineId == id(p.name) && renderEditor(lineId)}
            </div>
    })
  }

  const psg = passages.find(p=>{
      return id(p.name)==lineId
  });

  const renderRecorder = ()=>{
    return  <Recorder dialogue={psg} onRecord={_startRecording} onStopRecord={stopRecording} onCancel={()=>setShowRecorder(false)}/>
             
  }
           
  const renderScript = ()=>{
    return <>
      {renderCharacterSelection()}
      {renderPassages()}
    </>
  }

  const saveEdit = (tracks)=>{
    
    return new Promise((resolve, reject)=>{
      try{
        var tx = db.transaction("audio", "readwrite");
        var store = tx.objectStore("audio");
        const insert = store.put({id:lineId,tracks})
        if (tracks.length <= 0){
          const _newcompleted = Object.keys(_completed.current).reduce((acc,key)=>{
            if (key === id){
              return acc;
            }
            return {
              ...acc,
              [key]: _completed.current[key],
            }
          },{});
          setCompleted(_newcompleted);
         
              
        }
        insert.onsuccess = ()=>{
          setNewData(true);
          resolve();
        }
      }catch(err){
        console.log(err);
        reject();
      }
     
    })
  
  }

  const saveTrack = (id, tracks)=>{
    return new Promise((resolve, reject)=>{
      try{
        var tx = db.transaction("audio", "readwrite");
        var store = tx.objectStore("audio");
        console.log("saving", id, tracks);
        const insert = store.put({id,tracks})
        //const [first, ...last] = _tracks;
        insert.onsuccess = () => {
          console.log("successfilly saved tracks for", id)
          const _newcompleted = {
            ..._completed.current,
            [id]: true,
          }
          setCompleted(_newcompleted);
          resolve(true);
        }
      }
      catch(err){
        console.log(err)
        reject(false);
      }
    });
  }

  const handleSubmission = (selectedFile) => {
    const fileReader = new FileReader();
    fileReader.readAsText(selectedFile, "UTF-8");

    fileReader.onload = async e => {
       const data =  JSON.parse(e.target.result);
       for (const key of Object.keys(data)){
          await saveTrack(key, data[key])
       }
    };
  };  

  const fileChangeHandler = (event) => {
    handleSubmission(event.target.files[0]);
  };


  const renderEditor = ()=>{
    if (tracks){
      return <Editor id={lineId} tracks={tracks} onSave={saveEdit}/>
    }
    return null;
  }


  return (
    <>
      {renderToolbar()}
      
      <div className="App">
        <h1>{process.env.APP_URL}</h1>
        {showRecorder && renderRecorder()}
        {!showRecorder && renderScript()}
      </div>
    </>
  );
}

export default App;
