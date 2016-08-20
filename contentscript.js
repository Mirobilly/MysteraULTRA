injectScript('socketHack.js');
injectScript('runner.js');
window.addEventListener('mysteraLoaded', function(){	
	injectAudio('breaksound.wav', 'breaksound',.5);
	injectAudio('healthsound.wav','healthsound');
	chrome.runtime.sendMessage({type:'intervalWorkerRequest'}, function(res){
		document.dispatchEvent(new CustomEvent('intervalWorkerText',{detail:res}));
		document.dispatchEvent(new CustomEvent('workerLoaded',{}));
	});
	//listener for messages from the background
	//passes messages along to the injected script as events. message params are placed under the event's detail
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		document.dispatchEvent(new CustomEvent(request.type,{detail:request.params}));
	});

	//listener for keyboard events. they get passed up to the background
	window.addEventListener('keydown', function(e){
		chrome.runtime.sendMessage({type:'key', code:e.code});
	});

	window.addEventListener('message',function(e){
		chrome.runtime.sendMessage(e.data);
	});
});

function injectScript(name){
	//inject script into page
	var s = document.createElement('script');
	s.src = chrome.extension.getURL(name);
	s.onload = function() {
	    this.remove();
	};
	(document.head || document.documentElement).appendChild(s);
}

function injectAudio(file, id, vol){
	var s = document.createElement('audio');
	s.src = chrome.extension.getURL(file);
	s.id = id;
	if(vol)
		s.volume = vol;
	s.onload = function() {
	    this.remove();
	};
	(document.head || document.documentElement).appendChild(s);
}