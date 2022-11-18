import {id} from '../';
import { openDB } from 'idb';

export async function generate(passages){ 
 
    const  db = await openDB('recordings', 3, upgradeDB =>  upgradeDB.createObjectStore("audio", { keyPath: "id" }))  
    let tx = db.transaction('audio', 'readwrite')
    let store = tx.objectStore('audio')
    const tracks = {};
    const waypoints = [];

    for (const item of passages){    
        if (db){
            const record = await store.get(id(item.name));
            if (record){
                tracks[id(item.name)] = record.tracks || []
            }
        }
        if (item.tags && item.tags.indexOf("Waypoint") !== -1){
            waypoints.push(item.id);
        }
    }

    const script = passages.reduce((acc, item)=>{
        
        return [...acc, {id: id(item.name), waypoint: (item.tags||[]).indexOf("Waypoint") !== -1, text: item.text, words: id(item.name), narrator: item.tags[0], tracks: (tracks[id(item.name)] || []).map(t=>t.id), rules: item.link.reduce((acc,item)=>{
            return {
                ...acc,
                [item.label] : item.link
            }
        },{})}]
    },[])

   
    return {tracks,script};
}