//we can't load the worker from disk via the constructor because CORS, so read its text
//we'll use the text to recreate it later
var workerText;
var client = new XMLHttpRequest();
client.open('GET', 'interval_worker.js');
client.onreadystatechange = function() {
 	workerText = client.responseText;
}
client.send();
//messageActiveTab({type:'intervalWorkerText',params:{workerText:workerText}});

//when the user clicks the icon
chrome.browserAction.onClicked.addListener(function(e){
	//send the worker text and trigger a macro toggle	
	messageActiveTab({type:'macroToggle'});
	//var macroState = chrome.storage.local.get('mpMacroState');
});

//listener for messages coming from the page
//these are keystrokes
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if(request.type == 'key'){
		if(request.code == 'F1')
			//F1 sends the attack toggle message
			messageActiveTab({type:'attackToggle'});
		else if(request.code == 'F2')
			messageActiveTab({type:'compass'});
		else if(request.code == 'F3')
			messageActiveTab({type:'autorunToggle'});
	}
	else if(request.type == 'intervalWorkerRequest'){
		sendResponse(workerText);
	}
});

//this querys for all active tabs in the current window and sends the request object to the first one
function messageActiveTab(request){
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id,request);
	});
}