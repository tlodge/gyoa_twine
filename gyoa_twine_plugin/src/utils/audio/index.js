import randomWords from 'random-words';

//modified from https://www.npmjs.com/package/get-blob-duration
export function getSrcDuration(src){
   
    const tempVideoEl = document.createElement(`video`)
  
    const durationP = new Promise((resolve, reject) => {
      tempVideoEl.addEventListener('loadedmetadata', () => {
        // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=642012
        if(tempVideoEl.duration === Infinity) {
          tempVideoEl.currentTime = Number.MAX_SAFE_INTEGER
          tempVideoEl.ontimeupdate = () => {
            tempVideoEl.ontimeupdate = null
            resolve(tempVideoEl.duration)
            tempVideoEl.currentTime = 0
          }
        }
        // Normal behavior
        else
          resolve(tempVideoEl.duration)
      })
      tempVideoEl.onerror = (event) => reject(event.target.error)
    })
  
    tempVideoEl.src = src; 
    return durationP
}


export function uniquename(){
  return randomWords(2).join("-");
}

let ids = [];

export function uniqueid(){
    console.log("ids are", ids);
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
    var length = 10;
    var str = '';
    for (var i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    if (ids.indexOf(str) != -1){
        return uniqueid()
    }
    else{
        ids.push(str)
        return str;
    }
    
}

//export function uniqueid(){
  
//  return String(Date.now().toString(32) + Math.random().toString(16)).replace(/\./g, '')

//}