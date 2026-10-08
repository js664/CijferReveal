import {authorizeCommand as authorizeShared} from '../../../shared/state/commands';
import {magisterOrigin} from '../magister/provider';
export function authorizeCommand(message:unknown,sender:chrome.runtime.MessageSender,id:string,popupUrl=`chrome-extension://${id}/popup.html`){return authorizeShared(message,sender,id,popupUrl,url=>!!magisterOrigin(url.href));}
