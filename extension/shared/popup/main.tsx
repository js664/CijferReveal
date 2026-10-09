import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {command} from '../state/repository';
import './popup.css';

function Popup(){
 const [resetting,setResetting]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const version=chrome.runtime.getManifest().version;
 async function reset(){
  if(resetting)return;setResetting(true);setError('');setStatus('');
  try{await command({kind:'reset'});setStatus('Gereset. Je kunt alle cijfers opnieuw openen.');}
  catch{setError('Resetten is niet gelukt. Probeer het opnieuw.');}
  finally{setResetting(false);}
 }
 return <main className="po-popup" aria-busy={resetting}>
  <p className="po-popup-version" aria-label={`Versie ${version}`}>v{version}</p>
  <button type="button" onClick={()=>void reset()} disabled={resetting}>Reset extensie</button>
  <span className="po-popup-status" role="status">{status}</span>
  {error&&<p className="po-popup-error" role="alert">{error}</p>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<Popup/>);
