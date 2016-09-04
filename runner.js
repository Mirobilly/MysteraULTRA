var muLogo = '<span style="color:#00ffff">mystera</span><strong><span style="color:#cc33ff">ULTRA</span></strong>';
var workerBlob;
var runWorker;
var scanWorker;
var connectionWorker;
var stairWorker;
var rafWorker;
var raf = requestAnimationFrame;
var brokenItems = 0;
var hasFocusHolder;
var direction = true;
var attack = false;
var gameSocket;
var player;
var autorun = false;
var foodSlot;
var stairways = [];
var altar;
var hole;
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
var extId;
var mUltraToggle = true;
var pasteIntercept = false;
var trackWorker;
var staticTrackList = {};
var jvDisplay;

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
	var level = Number(dlevel);
	if(level==0) level = 1;

	if(level==2)
		dmsg = " UG";
	if(level>2)
		dmsg = " on UWL" + dlevel;

	append("You're at "+pl.x+", "+pl.y+dmsg,'mUltra');

	if(stairways[level-1] && level!=4) append('Stairs up at '+stairways[level-1].x+','+stairways[level-1].y,'mUltra');
	if(level == 3 && hole) append('Hole at '+hole.x+','+hole.y,'mUltra');
	else if(stairways[level]) append('Stairs down at '+stairways[level].x+','+stairways[level].y,'mUltra');
});

document.addEventListener('mUltraToggle',function(e){
	mUltraToggle = !mUltraToggle;
	$('.mUltra').each(function(i,obj){
		obj.style.display = (mUltraToggle) ? "":"none";
	});
});

//listener to receive text of the explo worker
//this creates a blob that is later used to create the worker
document.addEventListener('intervalWorkerText', function(e){
	append('<div class="mUltra"><em><span style="color:#fff5cc">Powered by</span> </em>'+muLogo+'</div>');

	var oldAppend = append;
	append = function(str, divClass){
		//oldAppend(str.replace(/>(.*: .*)</,'>'+Date.now()+'$1'+'<'));
		if(/.*:.*/.test(str) && (!(/.*<.*:.*>.*/.test(str)) || /[^<]*:[^>]*<.*/.test(str)))
		{
			var now = new Date();
			var minutes = now.getMinutes();
			if(minutes<10)
				minutes = '0'+minutes;
			str = '<span style="color:#777777" class="mUltra">'+now.getHours()+':'+minutes+'</span> '+str;
		}
		if(divClass)
			str = '<div class="'+divClass+'">'+str+'</div>';
		oldAppend(str);
	};

	window.addEventListener('copy',function(e){
		pasteIntercept = false;
		if(mUltraToggle)
		{
			e.stopPropagation();
			pasteIntercept = true;
			append('Disable extension text.','mUltra');
		}
	}, true);

	window.addEventListener('paste',function(e){
		if(pasteIntercept)
		{
			e.stopPropagation();
			e.preventDefault();
			append('<h3>Disable extension text.</h3>','mUltra');
		}
	},true);

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
			if(inv[c].title.text == "Old Cooked Carrot" || inv[c].title.text == "Old Carrot" || inv[c].title.text == "Old Cooked Meat")
				foodSlot = c;
			else if(foodSlot == -1 && inv[c].title.text == "Cooked Carrot" || inv[c].title.text == "Cooked Meat")
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
		if(hunger_status && hunger_status.val<50 && foodSlot!=-1)
			send({type:"u",slot:foodSlot});
	};
	scanWorker.postMessage(500);

	connectionWorker = new Worker(URL.createObjectURL(workerBlob));
	connectionWorker.onmessage = function(){
		send({});
	};
	connectionWorker.postMessage(2000);

	stairWorker = new Worker(URL.createObjectURL(workerBlob));
	stairWorker.onmessage = function(){
		var down = objects.fetch("Stairway","name");
		var level = Number(dlevel);
		if(level==0) level = 1;
		if(down)
		{
			if(!stairways[level] || stairways[level].x !== down.x || stairways[level].y!=down.y)
			{
				stairways[level] = {x:down.x,y:down.y};
				if(level>=4)
				{
					append("Stairway down at "+down.x+","+down.y+" on "+level,'mUltra');
					if(extId)
						chrome.runtime.sendMessage(extId,{type:'stairwayLoc',x:down.x,y:down.y,level:level}, function(res){
							append((res.status == 200 ? "Stairway logged" : "Failed to log stairway"),'mUltra');
						});
				}
			}
		}
		//var up = objects.fetch("Stairs Up");

		var newAltar = objects.fetch("Altar","name");
		if(newAltar && (!altar || newAltar.x!=altar.x || newAltar.y!=altar.y))
		{
			append('Altar at '+newAltar.x+','+newAltar.y+' on '+level,'mUltra')
			altar = newAltar;
		}

		if(level == 3){
			var newHole = objects.fetch("Hole","name");
			if(newHole && (!hole || newHole.x!=hole.x || newHole.y!=hole.y))
			{
				append('Hole at '+newHole.x+','+newHole.y,'mUltra')
				hole = newHole;
			}
		}
	};
	stairWorker.postMessage(2000);

	trackWorker = new Worker(URL.createObjectURL(workerBlob));

	trackWorker.onmessage = function(){
		for(var key in staticTrackList)
		{
			var item = objects.fetch(key, "name");
			if(item && (item.x != staticTrackList[key].x || item.y != staticTrackList[key].y))
			{
				append(key+' at '+item.x+','+item.y,'mUltra');
				staticTrackList[key] = {x:item.x,y:item.y};
			}
		}
	};
	trackWorker.postMessage(5000);

	rafWorker = new Worker(URL.createObjectURL(workerBlob));

	rafWorker.onmessage = function(){
		if(autorun || runWorker || attack)
			jv.frame();
	};

	//var canv = $('#jv');
	//jvDisplay = canv.style.display;
});

document.addEventListener('extId', function(e){
	extId = e.detail;
});

//listener for autorun
document.addEventListener('autorunToggle', function(){
	autorun = !autorun;
	append("Auto-run "+((autorun)?"enabled":"disabled"),'mUltra');
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
		append("Ending exploration macro",'mUltra');
		//kill it
		runWorker.terminate();
		runWorker = undefined;
		//revert has focus to what it should be
		document.hasFocus = hasFocusHolder;
	}
	//if there's no worker
	else
	{
		append("Starting exploration macro",'mUltra');
		direction = true;
		//create worker from blob
		runWorker = new Worker(URL.createObjectURL(workerBlob));
		var moveLimitInterval = 90;
		var lastMove = Date.now()-moveLimitInterval;
		//when we receive a message from the worker
		runWorker.onmessage = function(){
			var thePlayer = getPlayer();
			if(thePlayer.still())
			{
				if(occupied(thePlayer.x,thePlayer.y+1*(direction ? 1:-1),me))
					direction = !direction;
				var now = Date.now();
				if(now - lastMove >= moveLimitInterval)
				{
					thePlayer.move(thePlayer.x,thePlayer.y+1*(direction ? 1:-1));
					lastMove = now;
				}
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
		append("Starting auto-attack",'mUltra');
		//replace hasFocus
		hasFocusHolder = document.hasFocus;
		document.hasFocus = function(){
			return true;
		};
	}
	//if we're ending it
	else
	{
		append("Ending auto-attack",'mUltra');
		//revert hasFocus
		document.hasFocus = hasFocusHolder;
	}
});

window.onblur = function(){
	if(rafWorker)
	{
		rafWorker.postMessage(30);
		requestAnimationFrame = function(){};
	}

	var canv = $('#jv');
	canv.hide();
};

window.onfocus = function(){
	requestAnimationFrame = raf;
	requestAnimationFrame(jv.frame);
	if(rafWorker)
		rafWorker.postMessage(0);
	$('#jv').show();
};