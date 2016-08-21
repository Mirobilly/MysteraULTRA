var workerBlob;
var runWorker;
var scanWorker;
var connectionWorker;
var brokenItems = 0;
var hasFocusHolder;
var direction = true;
var attack = false;
var gameSocket;
var player;
var autorun = false;
var foodSlot;
var lastKey;
var KEYCODES = {
	KeyW:'keyW',
	KeyA:'keyA',
	KeyS:'keyS',
	KeyD:'keyD',
	ArrowLeft:'keyLeft',
	ArrowUp:'keyUp',
	ArrowRight:'keyRight',
	ArrowDown:'keyDown'
};

function send(a){
	if(sockets.length==0)
		return;
	if(!gameSocket)
		gameSocket = sockets[0];
	gameSocket.send(JSON.stringify(a));
}

function getPlayer(){
	if(!player || Date.now() - player.fetchedAt>1000)
	{
		player = mobs.fetch(me,'id');
		player.fetchedAt = Date.now();
	}
	return player;
}

function itemBreak(){
	var elem = document.querySelector('#breaksound');
	elem.play();
	//append('An item has low durability');
}

document.addEventListener('compass', function(e){
	var pl = getPlayer();
	var dmsg = "";
	if(dlevel==2)
		dmsg = " UG";
	if(dlevel>2)
		dmsg = " on UWL" + dlevel;
	append("You're at "+pl.x+", "+pl.y+dmsg);
});

//listener to receive text of the explo worker
//this creates a blob that is later used to create the worker
document.addEventListener('intervalWorkerText', function(e){
	if(!workerBlob) //do nothing i we've already got the blob
	{
		//otherwise create it
		try {
			workerBlob = new Blob([e.detail], {type: 'application/javascript'});
		} catch (e) { // Backwards-compatibility
			window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
			workerBlob = new BlobBuilder();
			workerBlob.append(e.detail);
			workerBlob = workerBlob.getBlob();
		}
	}

	scanWorker = new Worker(URL.createObjectURL(workerBlob));
	scanWorker.onmessage = function(){
		if(!inv) 
			return;
		var newBrokenItems = 0;
		foodSlot = -1;
		for(var c = 0;c<inv.length;c++)
		{
			if(inv[c].equip==2 && /\S/.test(inv[c].title.text))
				newBrokenItems++;
			if(inv[c].title.text == "Cooked Carrot" || inv[c].title.text == "Cooked Meat")
				foodSlot = c;
		}
		if(newBrokenItems>0)
			itemBreak();

		brokenItems = newBrokenItems;

		if(hp_status && hp_status.val<25)
		{
			var elem = document.querySelector('#healthsound');
			elem.play();
		}
		if(hunger_status && hunger_status.val<25 && foodSlot!=-1)
			send({type:"u",slot:foodSlot});
	};
	scanWorker.postMessage(500);

	connectionWorker = new Worker(URL.createObjectURL(workerBlob));
	connectionWorker.onmessage = function(){
		send({});
	};
	connectionWorker.postMessage(2000);
});

//listener for autorun
document.addEventListener('autorunToggle', function(){
	autorun = !autorun;
	append("Auto-run "+((autorun)?"enabled":"disabled"));
	if(autorun)
		window.addEventListener('keyup',keyUpIntercept);
	else 
	{
		window.removeEventListener('keyup',keyUpIntercept);
		for(var key in KEYCODES)
		{
			window[KEYCODES[key]].isDown = 0;
			window[KEYCODES[key]].isUp = 1;
		}
	}
});

function keyUpIntercept(e){
	if(KEYCODES[e.code])
	{
		var jvhKey = window[KEYCODES[e.code]];
		if(!jvhKey.isDown && document.querySelector('#input_field')!==document.activeElement)
		{
			jvhKey.isDown = 1;
			jvhKey.isUp = 0;
			if(lastKey && lastKey != jvhKey){
				lastKey.isDown = 0;
				lastKey.isUp = 1;
			}
			lastKey = jvhKey;
		}
		/*e.stopPropagation();
		if(lastKey && lastKey != window[KEYCODES[e.code]]){
			lastKey.isDown = 0;
			lastKey.isUp = 1;
		}
		lastKey = window[KEYCODES[e.code]];*/
	}
}

//listener for the explore behavior toggle
document.addEventListener('macroToggle', function(e){
	//if a worker is running
	if(runWorker)
	{
		append("Ending exploration macro");
		//kill it
		runWorker.terminate();
		runWorker = undefined;
		//revert has focus to what it should be
		document.hasFocus = hasFocusHolder;
	}
	//if there's no worker
	else
	{
		append("Starting exploration macro");
		direction = true;
		//create worker from blob
		runWorker = new Worker(URL.createObjectURL(workerBlob));
		//when we receive a message from the worker
		runWorker.onmessage = function(){
			var thePlayer = getPlayer();
			if(thePlayer.still())
			{
				if(occupied(thePlayer.x,thePlayer.y+1*(direction ? 1:-1),me))
					direction = !direction;
				thePlayer.move(thePlayer.x,thePlayer.y+1*(direction ? 1:-1));
			}
		}
		//start the worker
		runWorker.postMessage(30);
		//save hasFocus
		hasFocusHolder = document.hasFocus;
		//then replace it
		document.hasFocus = function(){
			return true;
		};
	}
});

//auto attack listener
document.addEventListener('attackToggle', function(){
	attack = !attack;
	//window.dispatchEvent((attack)?spaceDown:spaceUp);
	send({type:(attack)?"A":"a"});
	//if we're starting our attack
	if(attack)
	{
		append("Starting auto-attack");
		//replace hasFocus
		hasFocusHolder = document.hasFocus;
		document.hasFocus = function(){
			return true;
		};
	}
	//if we're ending it
	else
	{
		append("Ending auto-attack");
		//revert hasFocus
		document.hasFocus = hasFocusHolder;
	}
});