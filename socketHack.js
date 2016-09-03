var constructor = window.WebSocket; //save the old constructor
var sockets = [];
var initialPageLoad = false;
//new constructor
window.WebSocket = function(ip){
	//create a socket
	var newSocket = new constructor(ip);
	
	//handler for the proxy
	var handler = {
		get:function(target, key){
			//when getting send
			if(key=='send'){
				//return an actual send only when the socket is connected
				if(target.socket.readyState==1)
					return (function(data){
						//console.log(data);
						var parsed = JSON.parse(data);
						var match;
						if((attack && parsed.type == "a")/* || (autorun && parsed.type == "h" && !parsed.d)*/)
							return;
						if(parsed.data == '/help')
						{
							append('<em><span style="color:#fff5cc">Controls for</span></em> '+muLogo+'<br><span style="color:#fff5cc"><strong>F1</strong><em> - Auto-attack<br></em><strong>F2</strong><em> - Compass<br></em><Strong>F3</strong><em> - Auto-run<br></em><strong>F4</strong><em> - Toggle clean-chat</span></em> ','mUltra');
						}
						else if((match = /\/track ([^\s]*) (.*)/i.exec(parsed.data)) != null){
							if(match[1]=='static')
							{
								if(!staticTrackList[match[2]]) staticTrackList[match[2]] = {};
								else delete staticTrackList[match[2]];
							}
							return;
						}
						target.socket.send(data);
					}).bind(target.socket);
				//if we haven't manually closed, but the socket is closing
				else if(!target.closed && (target.socket.readyState==2 || target.socket.readyState==3))
				{
					append('Attempting to reconnect');

					//create a new socket
					var socket = new constructor(ip);

					//ive it all the properties and listeners the current socket has
					for(var key in target.properties)
						socket[key] = target.properties[key];
					for(var key in target.listeners[key])
						socket.addEventListener(key, target.listeners[key]);

					//if we're supposed to be attacking, start our attack again on connect
					socket.addEventListener('open',function(){
						if(attack)
							send({type:"A"});
					});

					//replace current socket with new one
					target.socket = socket;

					//don't give an actual send yet
					return function(){};
				}
				//if the socket is trying to connect, give a dummy send
				else
					return function(){};
			}
			//getting readyState
			else if(key=='readyState')
			{
				var state = target.socket.readyState;
				//if we haven't manually closed, but the socket isn't connected, return a good state so the client won't drop us
				if(!target.closed && (state!=1))
					state = 1;
				return state;
			}
			//getting close
			else if(key=='close'){
				//this is only called on a manual close, so mark that we're closed and close the socket
				return function(){
					target.closed = true;
					target.socket.close();
				};
			}
			//this is a special case because it modifies the object
			else if(key=='addEventListener')
			{
				//return a method that logs the event listener before adding it
				return function(type, f){
					target.listeners[type] = f;
					target.socket.addEventListener(type,f);
				};
			}
			//blanket case, return the requested property
			else
				return target.socket[key];
		},
		//when setting, log the changed property
		set:function(target, key, value){
			target.properties[key] = value;
			target.socket[key] = value;
		}
	};

	//create proxy from handler. the target contains a socket, objects to log properties and listeners, bool for closing, and the server ip
	var proxy = new Proxy({socket:newSocket,properties:{},listeners:{},closed:false,ip:ip}, handler);

	//snoop on received messages
	proxy.addEventListener('message', function(msg){
		var parsed = JSON.parse(msg.data);
		//when log in credentials are accepted, fire event. only fires once
		if(parsed.type == "accepted" && !initialPageLoad)
		{
			window.dispatchEvent(new CustomEvent('mysteraLoaded',{}));
			initialPageLoad = true;
		}
		/*else if (parsed.type == 'zip')
		{
			var parsedData = JSON.parse(jv.unzip(parsed.data));
			console.log(parsedData);

		}*/
	});
	//text alerts for disconnects
	proxy.addEventListener('close',function(e){
		append('Disconnected');
	});
	proxy.addEventListener('error', function(){
		append("Disconnected");
	});

	//make the proxy accessible to our scripts
	sockets.push(proxy);
	//return it to the caller
	return proxy;
};