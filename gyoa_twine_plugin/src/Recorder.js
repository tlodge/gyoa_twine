import './Recorder.css';
import { useEffect, useState } from 'react';
import { MdFiberManualRecord, MdStopCircle} from "react-icons/md";
import {format} from './utils';
function Recorder({onRecord, onStopRecord, onCancel, dialogue={}}) {

  
  const {text=""} = dialogue;
 
  const [counting, setCounting] = useState(false);
  const [countvalue, setCountValue] = useState(5);
  const [recording, setRecording] = useState(false);

  const countdown = (countval = 3)=>{
   
    if (countval <= 0){
        setCounting(false);
        setRecording(true);
        onRecord();
        return;
    }

    setCounting(true);
    setCountValue(countval);

    setTimeout(()=>{
        setTimeout(()=>{countdown(countval-1)},300);
    },300);
  }

  const stopRecording = ()=>{
    setRecording(false);
    onStopRecord();
  }


  const renderRecord = ()=>{
    return <div className="recordcontainer" onClick={()=>countdown()} >
                <div className="recordicon">
                    <MdFiberManualRecord/>
                </div>
                <div>record</div>
            </div>
  }

  const renderCountdown= ()=>{
    return <div className="recordcontainer">
                <div className="recordicon">
                    {countvalue}
                </div>
                <div>to record</div>
            </div>
  }

  const renderStop = ()=>{
    return <div  className="recordcontainer"onClick={()=>stopRecording()}>
                <div className="recordicon">
                    <MdStopCircle/>
                </div>
                <div>recording</div>
            </div>
  }

  return (
    <div className="container">
        <div className="recorder">
            <div className="cancelline">
                <div onClick={onCancel} className="cancel">x</div>
            </div>
            <div className="textcontainer">
                <div>{format(text)}</div>
            </div>
            <div className="recordcontainer">
                {!counting && !recording && renderRecord()}
                {recording && !counting && renderStop()}
                {counting && renderCountdown()}
            </div>
        </div>
    </div>
  );
}

export default Recorder;
